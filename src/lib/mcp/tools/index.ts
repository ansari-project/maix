import { updateProfileTool } from './updateProfile';
import { manageProjectTool } from './manageProject';

/**
 * Export all MCP tools for registration
 */
export const tools = [
  updateProfileTool,
  manageProjectTool,
];

/**
 * Export individual tools for testing
 */
export { updateProfileTool, manageProjectTool };