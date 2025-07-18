import { mcpServer } from '@/lib/mcp/server';
import { NextRequest } from 'next/server';

/**
 * Handle MCP requests through FastMCP
 * This is the main entry point for all MCP API calls
 */
async function handleMcpRequest(request: NextRequest) {
  try {
    // FastMCP handles the MCP protocol and routes to appropriate tools
    // TODO: Fix FastMCP integration - temporarily disabled for build
    return new Response(
      JSON.stringify({ error: 'MCP server temporarily disabled' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('MCP request handling error:', error);
    
    // Return a proper error response
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process MCP request'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Export handlers for both GET and POST requests
 * The MCP protocol uses both methods
 */
export { handleMcpRequest as GET, handleMcpRequest as POST };