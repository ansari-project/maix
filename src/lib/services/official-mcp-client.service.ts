import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { jsonSchema } from 'ai'
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
   * Basic Zod to JSON Schema converter for problematic cases
   */
  private zodToJsonSchema(zodSchema: any): any {
    console.log('🔧 Converting Zod schema to JSON Schema')
    
    // This is a simplified converter for our specific use case
    // In a production system, you'd use a library like zod-to-json-schema
    
    if (!zodSchema._def) {
      return zodSchema // Not a Zod schema
    }
    
    const def = zodSchema._def
    
    switch (def.typeName) {
      case 'ZodObject':
        const properties: any = {}
        const required: string[] = []
        
        if (def.shape) {
          for (const [key, value] of Object.entries(def.shape)) {
            properties[key] = this.zodToJsonSchema(value)
            
            // Check if field is required (not optional)
            const fieldDef = (value as any)._def
            if (fieldDef && fieldDef.typeName !== 'ZodOptional') {
              required.push(key)
            }
          }
        }
        
        return {
          type: 'object',
          properties,
          required,
          additionalProperties: false
        }
      
      case 'ZodString':
        const stringSchema: any = { type: 'string' }
        if (def.checks) {
          for (const check of def.checks) {
            if (check.kind === 'min') stringSchema.minLength = check.value
            if (check.kind === 'max') stringSchema.maxLength = check.value
          }
        }
        return stringSchema
      
      case 'ZodEnum':
        return {
          type: 'string',
          enum: def.values
        }
      
      case 'ZodOptional':
        // For optional fields, just return the inner type
        // The required array will handle optionality
        return this.zodToJsonSchema(def.innerType)
      
      case 'ZodNullable':
        // For nullable fields, create anyOf with null
        const innerSchema = this.zodToJsonSchema(def.innerType)
        return {
          anyOf: [innerSchema, { type: 'null' }]
        }
      
      default:
        console.warn(`⚠️ Unsupported Zod type: ${def.typeName}`)
        return { type: 'string' } // Fallback
    }
  }

  /**
   * Get a meaningful default description for MCP tools
   */
  private getDefaultDescription(toolName: string): string {
    const defaultDescriptions: Record<string, string> = {
      'maix_manage_todo': 'Create, update, list, and manage todo items and tasks. Use "list-all" action to get all todos.',
      'maix_search_todos': 'Search and find todos across all projects. Use to find specific todos before updating them.',
      'maix_manage_project': 'Create, update, delete, and list project information and details.',
      'maix_manage_product': 'Create, update, delete, and list product information and details.',
      'maix_manage_organization': 'Create, update, delete, and list organization information and memberships.',
      'maix_manage_post': 'Create, update, delete posts including questions, answers, and discussions.',
      'maix_search_posts': 'Search and filter posts by type, author, date, and content.',
      'maix_manage_comment': 'Create, update, delete comments on posts and discussions.',
      'maix_search_comments': 'Search and filter comments by author, post, date, and content.',
      'maix_search_projects': 'Search and filter projects by status, type, owner, and keywords.',
      'maix_search_products': 'Search and filter products by owner, date, and keywords.',
      'maix_manage_personal_project': 'Manage personal projects and ideas independently of team projects.',
      'maix_manage_organization_member': 'Manage organization memberships, invitations, and roles.',
      'maix_update_profile': 'Update user profile information including bio, skills, and contact details.'
    }
    
    return defaultDescriptions[toolName] || `Perform ${toolName.replace(/^maix_/, '').replace(/_/g, ' ')} operations`
  }

  /**
   * Sanitize JSON schema for Gemini compatibility
   * Gemini has stricter requirements for JSON schemas than standard JSON Schema
   */
  private sanitizeSchemaForGemini(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema
    
    const sanitized = { ...schema }
    
    // AGGRESSIVE SIMPLIFICATION FOR GEMINI
    // Remove all complex patterns that Gemini doesn't handle well
    
    // Remove $ref, $id, definitions - Gemini doesn't support JSON Schema references
    delete sanitized.$ref
    delete sanitized.$id
    delete sanitized.definitions
    delete sanitized.$defs
    
    // Remove nullable - use anyOf with null type instead
    if (sanitized.nullable) {
      delete sanitized.nullable
      if (!sanitized.anyOf) {
        sanitized.anyOf = [
          { ...sanitized },
          { type: 'null' }
        ]
      }
    }
    
    // Simplify anyOf/oneOf patterns - Gemini prefers simple schemas
    if (sanitized.anyOf && Array.isArray(sanitized.anyOf)) {
      // Try to flatten simple anyOf patterns
      const filteredAnyOf = sanitized.anyOf.filter((item: any) => {
        // Remove empty string const patterns
        if (item.type === 'string' && item.const === '') return false
        if (item.enum && Array.isArray(item.enum) && item.enum.every((e: any) => e === '')) return false
        return true
      })
      
      // If we have a simple string + null pattern, convert to optional string
      if (filteredAnyOf.length === 2 && 
          filteredAnyOf.some((item: any) => item.type === 'string') &&
          filteredAnyOf.some((item: any) => item.type === 'null')) {
        const stringSchema = filteredAnyOf.find((item: any) => item.type === 'string')
        return { ...stringSchema, type: 'string' } // Make it optional by removing from required
      }
      
      // If only one valid option remains, use it directly
      if (filteredAnyOf.length === 1) {
        return this.sanitizeSchemaForGemini(filteredAnyOf[0])
      }
      
      // If still multiple, recursively sanitize
      if (filteredAnyOf.length > 1) {
        sanitized.anyOf = filteredAnyOf.map((item: any) => this.sanitizeSchemaForGemini(item))
      } else {
        delete sanitized.anyOf
      }
    }
    
    // Convert oneOf to anyOf (Gemini prefers anyOf)
    if (sanitized.oneOf) {
      sanitized.anyOf = sanitized.oneOf
      delete sanitized.oneOf
    }
    
    // Process properties recursively
    if (sanitized.properties) {
      const newProperties: any = {}
      for (const [key, value] of Object.entries(sanitized.properties)) {
        newProperties[key] = this.sanitizeSchemaForGemini(value)
      }
      sanitized.properties = newProperties
    }
    
    // Remove unsupported format values for strings
    // Gemini only supports basic formats
    if (sanitized.type === 'string' && sanitized.format) {
      const supportedFormats = ['date-time', 'date', 'time', 'uri', 'email']
      if (!supportedFormats.includes(sanitized.format)) {
        delete sanitized.format
      }
    }
    
    // Handle items (for arrays) recursively
    if (sanitized.items) {
      sanitized.items = this.sanitizeSchemaForGemini(sanitized.items)
    }
    
    // Handle additionalProperties
    if (sanitized.additionalProperties && typeof sanitized.additionalProperties === 'object') {
      sanitized.additionalProperties = this.sanitizeSchemaForGemini(sanitized.additionalProperties)
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
      
      // Check if we received a Zod schema instead of JSON schema
      if (inputSchema._def) {
        console.warn(`⚠️ Tool ${mcpTool.name} has Zod schema instead of JSON schema, attempting conversion`)
        inputSchema = this.zodToJsonSchema(inputSchema)
      }
      
      // Sanitize the schema for Gemini compatibility
      inputSchema = this.sanitizeSchemaForGemini(inputSchema)
      
      // Create tool definition directly for streamText
      // streamText expects raw tool definitions, not the result of tool() function
      try {
        // Use the actual description from MCP tool, don't fall back to generic
        const toolDescription = mcpTool.description || this.getDefaultDescription(mcpTool.name)
        
        // Create jsonSchema and log what it produces
        const wrappedSchema = jsonSchema(inputSchema)
        
        // Debug logging for schema structure
        if (mcpTool.name === 'maix_manage_todo') {
          console.log(`📋 SCHEMA DEBUG for ${mcpTool.name}:`)
          console.log('📋 Original inputSchema:', JSON.stringify(inputSchema, null, 2))
          console.log('📋 After jsonSchema() wrapper:', JSON.stringify(wrappedSchema, null, 2))
          console.log('📋 Tool description:', toolDescription)
        }
        
        const aiTool = {
          description: toolDescription,
          inputSchema: wrappedSchema, // Use jsonSchema wrapper for validation
          execute: async (args: any) => {
            console.log(`🎯 Tool execution started for ${mcpTool.name} with args:`, args)
            
            // This will be called by the AI SDK when the tool is invoked
            // We need to forward it to the MCP client
            const pat = this.getCurrentPat()
            if (!pat) {
              console.error('❌ No PAT available for tool execution')
              throw new Error('No PAT available for tool execution')
            }
            console.log('✅ PAT available for tool execution')
            
            const client = await this.getClient(pat)
            if (!client) {
              console.error('❌ Failed to get MCP client for tool execution')
              throw new Error('Failed to get MCP client for tool execution')
            }
            console.log('✅ MCP client obtained for tool execution')
            
            try {
              console.log(`📡 Calling MCP tool ${mcpTool.name} via client.callTool`)
              const result = await client.callTool({
                name: mcpTool.name,
                arguments: args
              })
              console.log(`✅ MCP tool ${mcpTool.name} execution completed, result:`, result)
              
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
              console.error(`❌ Tool execution failed for ${mcpTool.name}:`, error)
              throw error
            }
          }
        }
        
        tools[mcpTool.name] = aiTool as Tool
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
      
      // Debug: Log the raw MCP tools before conversion
      console.log('📋 RAW MCP TOOLS from listTools():')
      console.log('📋 Number of tools:', toolsResult.tools.length)
      
      const todoTool = toolsResult.tools.find((t: any) => t.name === 'maix_manage_todo')
      if (todoTool) {
        console.log('📋 RAW maix_manage_todo tool:', JSON.stringify(todoTool, null, 2))
      }

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