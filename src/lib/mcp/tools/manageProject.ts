import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { MaixMcpContext, MaixMcpResponse } from '../types';

/**
 * Schema for manageProject tool parameters
 */
export const manageProjectParameters = z.object({
  action: z.enum(['create', 'update', 'delete', 'get', 'list']).describe("The operation to perform"),
  projectId: z.string().optional().describe("The ID of the project (required for update, delete, get actions)"),
  title: z.string().min(5).max(255).optional().describe("The project title"),
  description: z.string().min(50).max(5000).optional().describe("The project description"),
  projectType: z.enum(['RESEARCH', 'STARTUP', 'NON_PROFIT', 'OPEN_SOURCE', 'CORPORATE']).optional().describe("The type of project"),
  helpType: z.enum(['ADVICE', 'PROTOTYPE', 'MVP', 'FULL_PRODUCT']).optional().describe("The type of help needed"),
  budgetRange: z.string().max(50).optional().describe("The budget range for the project"),
  contactEmail: z.string().email().optional().describe("Contact email for the project"),
  organizationUrl: z.string().url().optional().describe("Organization website URL"),
  maxVolunteers: z.number().int().min(1).max(50).optional().describe("Maximum number of volunteers"),
  requiredSkills: z.array(z.string().min(1).max(50)).max(20).optional().describe("Array of required skills"),
  timeline: z.object({
    description: z.string().max(1000).optional(),
  }).optional().describe("Project timeline information"),
});

/**
 * Tool definition for managing projects
 */
export const manageProjectTool = {
  name: 'maix_manage_project',
  description: 'Manages user projects with CRUD operations: create, update, delete, get, and list projects',
  parameters: manageProjectParameters,
  
  handler: async (
    params: z.infer<typeof manageProjectParameters>,
    context: MaixMcpContext
  ): Promise<MaixMcpResponse> => {
    try {
      const validatedParams = manageProjectParameters.parse(params);
      const { action, projectId, ...projectData } = validatedParams;
      
      switch (action) {
        case 'create':
          return await createProject(projectData, context);
        case 'update':
          return await updateProject(projectId, projectData, context);
        case 'delete':
          return await deleteProject(projectId, context);
        case 'get':
          return await getProject(projectId, context);
        case 'list':
          return await listProjects(context);
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      console.error('MCP Tool Error: Failed to manage project', error);
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        };
      }
      
      return {
        success: false,
        error: 'An internal error occurred while managing the project',
      };
    }
  },
};

/**
 * Create a new project
 */
async function createProject(
  projectData: any,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  // Validate required fields for creation
  if (!projectData.title) {
    return { success: false, error: "Title is required to create a project" };
  }
  if (!projectData.description) {
    return { success: false, error: "Description is required to create a project" };
  }
  if (!projectData.projectType) {
    return { success: false, error: "Project type is required to create a project" };
  }
  if (!projectData.helpType) {
    return { success: false, error: "Help type is required to create a project" };
  }
  if (!projectData.contactEmail) {
    return { success: false, error: "Contact email is required to create a project" };
  }
  
  const newProject = await prisma.project.create({
    data: {
      title: projectData.title,
      description: projectData.description,
      projectType: projectData.projectType,
      helpType: projectData.helpType,
      contactEmail: projectData.contactEmail,
      budgetRange: projectData.budgetRange,
      organizationUrl: projectData.organizationUrl,
      maxVolunteers: projectData.maxVolunteers || 1,
      requiredSkills: projectData.requiredSkills || [],
      timeline: projectData.timeline || {},
      ownerId: context.user.id,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      }
    }
  });
  
  return {
    success: true,
    data: newProject,
    message: `Project "${newProject.title}" created successfully`,
  };
}

/**
 * Update an existing project
 */
async function updateProject(
  projectId: string | undefined,
  projectData: any,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  if (!projectId) {
    return { success: false, error: "Project ID is required for update action" };
  }
  
  // Prepare update data (only include fields that were provided)
  const updateData: any = {};
  
  if (projectData.title !== undefined) updateData.title = projectData.title;
  if (projectData.description !== undefined) updateData.description = projectData.description;
  if (projectData.projectType !== undefined) updateData.projectType = projectData.projectType;
  if (projectData.helpType !== undefined) updateData.helpType = projectData.helpType;
  if (projectData.budgetRange !== undefined) updateData.budgetRange = projectData.budgetRange;
  if (projectData.contactEmail !== undefined) updateData.contactEmail = projectData.contactEmail;
  if (projectData.organizationUrl !== undefined) updateData.organizationUrl = projectData.organizationUrl;
  if (projectData.maxVolunteers !== undefined) updateData.maxVolunteers = projectData.maxVolunteers;
  if (projectData.requiredSkills !== undefined) updateData.requiredSkills = projectData.requiredSkills;
  if (projectData.timeline !== undefined) updateData.timeline = projectData.timeline;
  
  try {
    const updatedProject = await prisma.project.update({
      where: { 
        id: projectId,
        ownerId: context.user.id, // Security: Ensure user owns the project
      },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    return {
      success: true,
      data: updatedProject,
      message: `Project "${updatedProject.title}" updated successfully`,
    };
  } catch (error: any) {
    if (error.code === 'P2025') {
      return {
        success: false,
        error: "Project not found or you don't have permission to update it",
      };
    }
    throw error;
  }
}

/**
 * Delete a project
 */
async function deleteProject(
  projectId: string | undefined,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  if (!projectId) {
    return { success: false, error: "Project ID is required for delete action" };
  }
  
  try {
    await prisma.project.delete({
      where: { 
        id: projectId,
        ownerId: context.user.id, // Security: Ensure user owns the project
      },
    });
    
    return {
      success: true,
      message: `Project deleted successfully`,
    };
  } catch (error: any) {
    if (error.code === 'P2025') {
      return {
        success: false,
        error: "Project not found or you don't have permission to delete it",
      };
    }
    throw error;
  }
}

/**
 * Get a specific project
 */
async function getProject(
  projectId: string | undefined,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  if (!projectId) {
    return { success: false, error: "Project ID is required for get action" };
  }
  
  const project = await prisma.project.findFirst({
    where: { 
      id: projectId,
      ownerId: context.user.id, // Security: Ensure user owns the project
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      applications: {
        select: {
          id: true,
          status: true,
          appliedAt: true,
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });
  
  if (!project) {
    return {
      success: false,
      error: "Project not found or you don't have permission to access it",
    };
  }
  
  return {
    success: true,
    data: project,
  };
}

/**
 * List all projects for the authenticated user
 */
async function listProjects(context: MaixMcpContext): Promise<MaixMcpResponse> {
  const projects = await prisma.project.findMany({
    where: { ownerId: context.user.id },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      applications: {
        select: {
          id: true,
          status: true,
          appliedAt: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
  
  return {
    success: true,
    data: projects,
    message: `Found ${projects.length} projects`,
  };
}