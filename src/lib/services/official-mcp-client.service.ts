import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { tool, jsonSchema } from 'ai'
import type { Tool } from 'ai'

/**
 * Official MCP Client Service using @modelcontextprotocol/sdk
 * 
 * This replaces the experimental Vercel AI SDK MCP client with the official SDK
 * which properly supports the Streamable HTTP transport (POST for messages, GET for SSE).
 */
interface CachedClient {
  client: Client
  lastUsed: number
  patHash: string
}

export class OfficialMcpClientService {
  // Client caching DISABLED - causes timeouts in serverless
  // private clientCache: Map<string, CachedClient> = new Map()
  private toolsCache: Map<string, Record<string, Tool>> = new Map()
  private baseUrl: string
  // private readonly CLIENT_TTL_MS = 60000 // 60 seconds TTL for clients
  // private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // In production, use the deployed URL; in development use localhost
    let baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    
    // Fix: Ensure we use www.maix.io to avoid 307 redirect that drops Authorization header
    if (baseUrl === 'https://maix.io') {
      baseUrl = 'https://www.maix.io'
      console.log('Official MCP Client: Fixed redirect - using www.maix.io instead of maix.io')
    }
    
    this.baseUrl = baseUrl
    console.log('Official MCP Client: Using base URL:', this.baseUrl)
    
    // Cleanup disabled - we don't cache clients anymore
    // this.startCleanupInterval()
  }

  /**
   * Get or create MCP client for a specific PAT
   * IMPORTANT: In serverless, we create fresh clients and close them immediately
   */
  private async getClient(pat: string): Promise<Client | null> {
    // DISABLED CACHING - Causes timeout issues in serverless
    // Each request gets a fresh client that will be closed after use
    
    try {
      if (!pat) {
        console.error('No PAT provided for MCP client')
        return null
      }

      // Create transport with authentication
      const transport = new StreamableHTTPClientTransport(
        new URL(`${this.baseUrl}/api/mcp`),
        {
          requestInit: {
            headers: {
              'Authorization': `Bearer ${pat}`
            }
          }
        }
      )

      // Create MCP client
      const client = new Client(
        {
          name: 'maix-ai-assistant',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      )

      // Add timeout to prevent hanging
      const connectPromise = client.connect(transport)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('MCP connection timeout after 5s')), 5000)
      })
      
      await Promise.race([connectPromise, timeoutPromise])
      
      // Don't cache - will close after use
      return client
    } catch (error) {
      console.error('Failed to create MCP client:', error)
      return null
    }
  }

  /**
   * Sanitize JSON schema for Gemini compatibility
   * Gemini has stricter requirements for JSON schemas than standard JSON Schema
   */
  private sanitizeSchemaForGemini(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema
    
    const sanitized = { ...schema }
    
    // Process properties recursively
    if (sanitized.properties) {
      const newProperties: any = {}
      for (const [key, value] of Object.entries(sanitized.properties)) {
        newProperties[key] = this.sanitizeSchemaForGemini(value)
      }
      sanitized.properties = newProperties
    }
    
    // Remove unsupported format values for strings
    // Gemini only supports 'enum' and 'date-time' formats
    if (sanitized.type === 'string' && sanitized.format) {
      if (!['date-time', 'enum'].includes(sanitized.format)) {
        // Remove unsupported formats like 'uri', 'email', etc.
        delete sanitized.format
      }
    }
    
    // Handle anyOf patterns - remove empty string enums which Gemini rejects
    if (sanitized.anyOf && Array.isArray(sanitized.anyOf)) {
      sanitized.anyOf = sanitized.anyOf.filter((item: any) => {
        // Filter out patterns with empty string enums
        if (item.type === 'string' && item.const === '') {
          return false
        }
        if (item.enum && Array.isArray(item.enum) && item.enum.includes('')) {
          // Remove empty strings from enum
          item.enum = item.enum.filter((e: any) => e !== '')
          if (item.enum.length === 0) return false
        }
        return true
      })
      
      // Recursively sanitize anyOf items
      sanitized.anyOf = sanitized.anyOf.map((item: any) => this.sanitizeSchemaForGemini(item))
      
      // If anyOf only has one item left, replace with that item directly
      if (sanitized.anyOf.length === 1) {
        return sanitized.anyOf[0]
      }
    }
    
    // Handle items (for arrays)
    if (sanitized.items) {
      sanitized.items = this.sanitizeSchemaForGemini(sanitized.items)
    }
    
    return sanitized
  }

  /**
   * Convert MCP tools to AI SDK format
   */
  private convertToAISdkTools(mcpTools: any[]): Record<string, Tool> {
    const tools: Record<string, Tool> = {}
    
    for (const mcpTool of mcpTools) {
      // Convert MCP tool to AI SDK tool format
      // MCP tools have inputSchema that should be a JSON schema
      let inputSchema = mcpTool.inputSchema || { type: 'object', properties: {} }
      
      // Sanitize the schema for Gemini compatibility
      inputSchema = this.sanitizeSchemaForGemini(inputSchema)
      
      // Convert to AI SDK format using the tool() function with jsonSchema wrapper
      try {
        tools[mcpTool.name] = tool({
          description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
          inputSchema: jsonSchema(inputSchema), // Wrap sanitized JSON schema for AI SDK
          execute: async (args: any) => {
            // This will be called by the AI SDK when the tool is invoked
            // We need to forward it to the MCP client
            const pat = this.getCurrentPat()
            if (!pat) {
              throw new Error('No PAT available for tool execution')
            }
            
            const client = await this.getClient(pat)
            if (!client) {
              throw new Error('Failed to get MCP client for tool execution')
            }
            
            try {
              const result = await client.callTool({
                name: mcpTool.name,
                arguments: args
              })
              
              // Convert MCP tool result to AI SDK format
              if (result.content && Array.isArray(result.content)) {
                const textContent = result.content
                  .filter((c: any) => c.type === 'text')
                  .map((c: any) => c.text)
                  .join('\n')
                
                return textContent || JSON.stringify(result)
              }
              
              return JSON.stringify(result)
            } catch (error) {
              console.error(`Tool execution failed for ${mcpTool.name}:`, error)
              throw error
            }
          }
        })
      } catch (toolConversionError) {
        console.error(`Failed to convert MCP tool ${mcpTool.name}:`, toolConversionError)
        // Skip this tool if conversion fails
        continue
      }
    }
    
    return tools
  }

  /**
   * Get the current PAT from somewhere (this needs to be set per request)
   */
  private currentPat: string | undefined
  
  private getCurrentPat(): string | undefined {
    return this.currentPat
  }

  /**
   * Set the PAT for the current request context
   */
  setCurrentPat(pat: string) {
    this.currentPat = pat
  }

  /**
   * Get MCP tools in AI SDK format
   * @param pat - Personal Access Token for the user
   */
  async getTools(pat?: string): Promise<Record<string, Tool>> {
    // If no PAT provided, try environment variable as fallback
    const token = pat || process.env.MAIX_PAT
    
    if (!token) {
      console.warn('No PAT available for MCP tools')
      return {}
    }

    // Set current PAT for tool execution
    this.currentPat = token

    // Still check tools cache (tools themselves are safe to cache)
    if (this.toolsCache.has(token)) {
      return this.toolsCache.get(token)!
    }

    let client: Client | null = null
    try {
      client = await this.getClient(token)
      
      if (!client) {
        console.warn('MCP client unavailable, returning empty tools')
        return {}
      }

      // List available tools from MCP server with timeout
      const listPromise = client.listTools()
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tool listing timeout after 5s')), 5000)
      })
      
      const toolsResult = await Promise.race([listPromise, timeoutPromise])
      
      // Convert to AI SDK format
      const tools = this.convertToAISdkTools(toolsResult.tools)
      
      // Cache tools for this PAT (safe to cache tools, just not clients)
      this.toolsCache.set(token, tools)
      return tools
    } catch (error) {
      console.error('Failed to get MCP tools:', error)
      return {}
    } finally {
      // CRITICAL: Always close the client to prevent connection leaks
      if (client) {
        try {
          await client.close()
          console.log('Closed MCP client after tool retrieval')
        } catch (closeError) {
          console.error('Error closing MCP client:', closeError)
        }
      }
    }
  }

  /**
   * Clear the cache
   */
  async clearCache() {
    // Only tools cache remains, clients are not cached
    this.toolsCache.clear()
    this.currentPat = undefined
  }
}

export const officialMcpClientService = new OfficialMcpClientService()