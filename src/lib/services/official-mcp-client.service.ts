import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { tool } from 'ai'
import type { Tool } from 'ai'

/**
 * Official MCP Client Service using @modelcontextprotocol/sdk
 * 
 * This replaces the experimental Vercel AI SDK MCP client with the official SDK
 * which properly supports the Streamable HTTP transport (POST for messages, GET for SSE).
 */
export class OfficialMcpClientService {
  private clientCache: Map<string, Client> = new Map()
  private toolsCache: Map<string, Record<string, Tool>> = new Map()
  private baseUrl: string

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
  }

  /**
   * Get or create MCP client for a specific PAT
   */
  private async getClient(pat: string): Promise<Client | null> {
    // Check cache for this PAT
    if (this.clientCache.has(pat)) {
      return this.clientCache.get(pat)!
    }

    try {
      if (!pat) {
        console.error('No PAT provided for MCP client')
        return null
      }

      // Create transport with authentication
      // Now uses correct URL without redirect to preserve Authorization header
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

      // Connect to the transport
      await client.connect(transport)
      
      // Cache the client for this PAT
      this.clientCache.set(pat, client)
      return client
    } catch (error) {
      console.error('Failed to create MCP client:', error)
      return null
    }
  }

  /**
   * Convert MCP tools to AI SDK format
   */
  private convertToAISdkTools(mcpTools: any[]): Record<string, Tool> {
    const tools: Record<string, Tool> = {}
    
    for (const mcpTool of mcpTools) {
      // DEBUG: Log the actual MCP tool structure to understand the issue
      console.log('MCP Tool being converted:', JSON.stringify(mcpTool, null, 2))
      
      // Convert MCP tool to AI SDK tool format
      // MCP tools have inputSchema that should be a JSON schema
      const inputSchema = mcpTool.inputSchema || { type: 'object', properties: {} }
      
      // Convert to AI SDK format using the tool() function
      try {
        tools[mcpTool.name] = tool({
          description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
          inputSchema: inputSchema, // AI SDK v5 uses 'inputSchema'
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

    // Check tools cache for this PAT
    if (this.toolsCache.has(token)) {
      return this.toolsCache.get(token)!
    }

    try {
      const client = await this.getClient(token)
      
      if (!client) {
        console.warn('MCP client unavailable, returning empty tools')
        return {}
      }

      // List available tools from MCP server
      const toolsResult = await client.listTools()
      
      // Convert to AI SDK format
      const tools = this.convertToAISdkTools(toolsResult.tools)
      
      // Cache tools for this PAT
      this.toolsCache.set(token, tools)
      return tools
    } catch (error) {
      console.error('Failed to get MCP tools:', error)
      return {}
    }
  }

  /**
   * Clear the cache and close all clients
   */
  async clearCache() {
    // Close all cached clients
    const clients = Array.from(this.clientCache.entries())
    for (const [pat, client] of clients) {
      try {
        await client.close()
      } catch (error) {
        console.error(`Error closing MCP client for PAT ${pat}:`, error)
      }
    }
    
    // Clear the caches
    this.clientCache.clear()
    this.toolsCache.clear()
    this.currentPat = undefined
  }
}

export const officialMcpClientService = new OfficialMcpClientService()