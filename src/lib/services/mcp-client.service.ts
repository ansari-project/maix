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
    // In production, use the deployed URL; in development use localhost
    // NEXT_PUBLIC_URL should be set to https://maix.io in production
    this.baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    console.log('MCP Client: Using base URL:', this.baseUrl)
  }

  /**
   * Get or create MCP client
   */
  private async getClient() {
    if (this.clientCache) {
      return this.clientCache
    }

    try {
      // Get PAT from environment for server-side MCP authentication
      const pat = process.env.MAIX_PAT
      if (!pat) {
        console.error('MAIX_PAT environment variable not set')
        return null
      }

      // Create MCP client with SSE transport to our MCP server
      this.clientCache = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: `${this.baseUrl}/api/mcp`,
          headers: {
            'Authorization': `Bearer ${pat}`
          }
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