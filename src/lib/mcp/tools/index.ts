import { updateProfileTool } from './updateProfile';
import { manageProjectTool } from './manageProject';
import { manageProductTool } from './manageProduct';
import { manageOrganizationTool } from './manageOrganization';
import { manageOrganizationMemberTool } from './manageOrganizationMember';
import { eventTools } from './manageEvent';
import { registrationTools } from './manageRegistration';
import { eventTaskTools } from './manageEventTasks';
import { manageTodoTool } from './manageTodo';
import { searchTodosTool } from './searchTodos';
import { managePersonalProjectTool } from './managePersonalProject';

/**
 * Export all MCP tools for registration
 */
export const tools = [
  updateProfileTool,
  manageProjectTool,
  manageProductTool,
  manageOrganizationTool,
  manageOrganizationMemberTool,
  manageTodoTool,
  searchTodosTool,
  managePersonalProjectTool,
  ...Object.values(eventTools),
  ...Object.values(registrationTools),
  ...Object.values(eventTaskTools),
];

/**
 * Export individual tools for testing
 */
export { 
  updateProfileTool, 
  manageProjectTool,
  manageProductTool,
  manageOrganizationTool,
  manageOrganizationMemberTool,
  manageTodoTool,
  searchTodosTool,
  managePersonalProjectTool,
  eventTools,
  registrationTools,
  eventTaskTools
};