import { updateProfileTool } from './updateProfile';
import { manageProjectTool } from './manageProject';
import { manageProductTool } from './manageProduct';
import { manageOrganizationTool } from './manageOrganization';
import { manageOrganizationMemberTool } from './manageOrganizationMember';

/**
 * Export all MCP tools for registration
 */
export const tools = [
  updateProfileTool,
  manageProjectTool,
  manageProductTool,
  manageOrganizationTool,
  manageOrganizationMemberTool,
];

/**
 * Export individual tools for testing
 */
export { 
  updateProfileTool, 
  manageProjectTool,
  manageProductTool,
  manageOrganizationTool,
  manageOrganizationMemberTool
};