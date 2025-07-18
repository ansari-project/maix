import { FastMCP } from 'fastmcp';
import { tools } from './tools';
import { authenticateRequest } from './middleware/withAuthentication';
import type { MaixMcpContext, MaixMcpConfig } from './types';

/**
 * Configuration for the MAIX MCP server
 */
const config: MaixMcpConfig = {
  name: 'MAIX MCP Server',
  version: '0.1.0' as const,
  description: 'Model Context Protocol server for Meaningful AI Exchange',
};

/**
 * Create and configure the FastMCP server instance
 * This instance is reused across requests for efficiency
 */
export const mcpServer = new FastMCP({
  name: config.name,
  version: '0.1.0' as const,
  
  // Authentication handler - this is called for every MCP request
  authenticate: async (request: any): Promise<MaixMcpContext> => {
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success) {
      // FastMCP expects us to throw a Response for auth failures
      throw new Response(
        JSON.stringify({ error: authResult.error }),
        { 
          status: authResult.statusCode,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Return the context that will be passed to all tool handlers
    return { user: authResult.user };
  },
});

/**
 * Register all tools with the MCP server
 * TODO: Fix FastMCP tool registration
 */
// for (const tool of tools) {
//   mcpServer.addTool({
//     name: tool.name,
//     description: tool.description,
//     parameters: tool.parameters,
//     run: async (params: any, context: MaixMcpContext) => {
//       return await tool.handler(params, context);
//     },
//   });
// }

/**
 * Export the configured server instance
 */
export { mcpServer as default };