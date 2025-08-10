import { experimental_createMCPClient } from 'ai'

/**
 * MCP Client Service for dynamic tool discovery
 * Uses Vercel AI SDK's experimental MCP client with SSE transport
 */
export class McpClientService {
  private clientCache: any = null
  private toolsCache: any = null
  private baseUrl: string

  constructor() {
    // Use environment variable or default to current domain
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  }

  /**
   * Get or create MCP client
   */
  private async getClient() {
    if (this.clientCache) {
      return this.clientCache
    }

    try {
      // Create MCP client with SSE transport to our MCP server
      this.clientCache = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: `${this.baseUrl}/api/mcp`
        }
      })
      
      return this.clientCache
    } catch (error) {
      console.error('Failed to create MCP client:', error)
      // Fallback to empty tools if MCP client fails
      return null
    }
  }

  /**
   * Get MCP tools using AI SDK's built-in conversion
   */
  async getTools() {
    if (this.toolsCache) {
      return this.toolsCache
    }

    try {
      const client = await this.getClient()
      
      if (!client) {
        console.warn('MCP client unavailable, returning empty tools')
        this.toolsCache = {}
        return this.toolsCache
      }

      // Use AI SDK's built-in tool conversion
      const tools = await client.tools()
      
      this.toolsCache = tools
      return tools
    } catch (error) {
      console.error('Failed to get MCP tools:', error)
      // Return empty object if MCP client fails
      this.toolsCache = {}
      return this.toolsCache
    }
  }

  /**
   * Clear the cache and close client
   */
  async clearCache() {
    if (this.clientCache) {
      try {
        await this.clientCache.close()
      } catch (error) {
        console.error('Error closing MCP client:', error)
      }
    }
    this.clientCache = null
    this.toolsCache = null
  }
}

export const mcpClientService = new McpClientService()