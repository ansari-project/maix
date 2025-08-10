import { experimental_createMCPClient } from 'ai'

/**
 * MCP Client Service for dynamic tool discovery
 * Uses Vercel AI SDK's experimental MCP client with SSE transport
 */
export class McpClientService {
  private clientCache: Map<string, any> = new Map() // Cache per PAT
  private toolsCache: Map<string, any> = new Map() // Tools cache per PAT
  private baseUrl: string

  constructor() {
    // In production, use the deployed URL; in development use localhost
    // NEXT_PUBLIC_URL should be set to https://maix.io in production
    this.baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    console.log('MCP Client: Using base URL:', this.baseUrl)
  }

  /**
   * Get or create MCP client for a specific PAT
   */
  private async getClient(pat: string) {
    // Check cache for this PAT
    if (this.clientCache.has(pat)) {
      return this.clientCache.get(pat)
    }

    try {
      if (!pat) {
        console.error('No PAT provided for MCP client')
        return null
      }

      // Create MCP client with SSE transport to our MCP server
      const client = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: `${this.baseUrl}/api/mcp`,
          headers: {
            'Authorization': `Bearer ${pat}`,
            'Accept': 'application/json, text/event-stream'
          }
        }
      })
      
      // Cache the client for this PAT
      this.clientCache.set(pat, client)
      return client
    } catch (error) {
      console.error('Failed to create MCP client:', error)
      // Fallback to empty tools if MCP client fails
      return null
    }
  }

  /**
   * Get MCP tools using AI SDK's built-in conversion
   * @param pat - Personal Access Token for the user
   */
  async getTools(pat?: string) {
    // If no PAT provided, try environment variable as fallback
    const token = pat || process.env.MAIX_PAT
    
    if (!token) {
      console.warn('No PAT available for MCP tools')
      return {}
    }

    // Check tools cache for this PAT
    if (this.toolsCache.has(token)) {
      return this.toolsCache.get(token)
    }

    try {
      const client = await this.getClient(token)
      
      if (!client) {
        console.warn('MCP client unavailable, returning empty tools')
        return {}
      }

      // Use AI SDK's built-in tool conversion
      const tools = await client.tools()
      
      // Cache tools for this PAT
      this.toolsCache.set(token, tools)
      return tools
    } catch (error) {
      console.error('Failed to get MCP tools:', error)
      // Return empty object if MCP client fails
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
        if (client && typeof client.close === 'function') {
          await client.close()
        }
      } catch (error) {
        console.error(`Error closing MCP client for PAT ${pat}:`, error)
      }
    }
    
    // Clear the caches
    this.clientCache.clear()
    this.toolsCache.clear()
  }
}

export const mcpClientService = new McpClientService()