import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { MaixMcpContext, MaixMcpResponse } from '../types';

/**
 * Schema for manageProject tool parameters
 */
export const manageProjectParameters = z.object({
  action: z.enum(['create', 'update', 'delete', 'get', 'list']).describe("The operation to perform"),
  projectId: z.string().optional().describe("The ID of the project (required for update, delete, get actions)"),
  name: z.string().min(3).max(255).optional().describe("The project name"),
  goal: z.string().min(10).max(500).optional().describe("The project goal"),
  description: z.string().min(50).max(5000).optional().describe("The project description"),
  planOutline: z.string().max(3000).optional().describe("Outline of plans for executing the project"),
  history: z.string().max(3000).optional().describe("The project history"),
  webpage: z.string().url().optional().or(z.literal('')).describe("The project web page URL"),
  helpType: z.enum(['ADVICE', 'PROTOTYPE', 'MVP', 'FULL_PRODUCT']).optional().describe("The type of help needed"),
  contactEmail: z.string().email().optional().describe("Contact email for the project"),
  targetCompletionDate: z.string().datetime().optional().or(z.literal('')).describe("Target completion date"),
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
  if (!projectData.name) {
    return { success: false, error: "Name is required to create a project" };
  }
  if (!projectData.goal) {
    return { success: false, error: "Goal is required to create a project" };
  }
  if (!projectData.description) {
    return { success: false, error: "Description is required to create a project" };
  }
  if (!projectData.helpType) {
    return { success: false, error: "Help type is required to create a project" };
  }
  if (!projectData.contactEmail) {
    return { success: false, error: "Contact email is required to create a project" };
  }
  
  const newProject = await prisma.project.create({
    data: {
      name: projectData.name,
      goal: projectData.goal,
      description: projectData.description,
      planOutline: projectData.planOutline,
      history: projectData.history,
      webpage: projectData.webpage,
      helpType: projectData.helpType,
      contactEmail: projectData.contactEmail,
      targetCompletionDate: projectData.targetCompletionDate ? new Date(projectData.targetCompletionDate) : null,
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
    message: `Project "${newProject.name}" created successfully`,
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
  
  if (projectData.name !== undefined) updateData.name = projectData.name;
  if (projectData.goal !== undefined) updateData.goal = projectData.goal;
  if (projectData.description !== undefined) updateData.description = projectData.description;
  if (projectData.planOutline !== undefined) updateData.planOutline = projectData.planOutline;
  if (projectData.history !== undefined) updateData.history = projectData.history;
  if (projectData.webpage !== undefined) updateData.webpage = projectData.webpage;
  if (projectData.helpType !== undefined) updateData.helpType = projectData.helpType;
  if (projectData.contactEmail !== undefined) updateData.contactEmail = projectData.contactEmail;
  if (projectData.targetCompletionDate !== undefined) {
    updateData.targetCompletionDate = projectData.targetCompletionDate ? new Date(projectData.targetCompletionDate) : null;
  }
  
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
      message: `Project "${updatedProject.name}" updated successfully`,
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