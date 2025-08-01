import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { MaixMcpContext, MaixMcpResponse } from '../types';

/**
 * Base schema for project fields
 */
const projectFieldsSchema = {
  name: z.string().min(3).max(255).describe("The project name"),
  goal: z.string().min(10).max(500).regex(/^[^\n\r]+$/, "Goal must be a single line").describe("One-line project goal"),
  description: z.string().min(50).max(5000).describe("The project description"),
  helpType: z.enum(['ADVICE', 'PROTOTYPE', 'MVP', 'FULL_PRODUCT']).describe("The type of help needed"),
  contactEmail: z.string().email().describe("Contact email for the project"),
  targetCompletionDate: z.string().datetime().optional().or(z.literal('')).describe("Target completion date (ISO 8601)"),
  isActive: z.boolean().optional().describe("Whether project is actively seeking help"),
  productId: z.string().optional().describe("Associated product ID"),
  organizationId: z.string().optional().describe("Organization ID to create project under"),
};

/**
 * Schema for create action (all required fields except optional ones)
 */
const createProjectSchema = z.object({
  name: projectFieldsSchema.name,
  goal: projectFieldsSchema.goal,
  description: projectFieldsSchema.description,
  helpType: projectFieldsSchema.helpType,
  contactEmail: projectFieldsSchema.contactEmail,
  targetCompletionDate: projectFieldsSchema.targetCompletionDate,
  isActive: projectFieldsSchema.isActive,
  productId: projectFieldsSchema.productId,
  organizationId: projectFieldsSchema.organizationId,
});

/**
 * Schema for update action (all fields optional)
 */
const updateProjectSchema = z.object({
  name: projectFieldsSchema.name.optional(),
  goal: projectFieldsSchema.goal.optional(),
  description: projectFieldsSchema.description.optional(),
  helpType: projectFieldsSchema.helpType.optional(),
  contactEmail: projectFieldsSchema.contactEmail.optional(),
  targetCompletionDate: projectFieldsSchema.targetCompletionDate,
  isActive: projectFieldsSchema.isActive,
  productId: projectFieldsSchema.productId,
  organizationId: projectFieldsSchema.organizationId,
});

/**
 * Base schema for manageProject tool parameters
 */
const manageProjectBaseSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'get', 'list']).describe("The operation to perform"),
  projectId: z.string().optional().describe("The ID of the project (required for update, delete, get actions)"),
  name: z.string().min(3).max(255).optional().describe("The project name"),
  goal: z.string().min(10).max(500).optional().describe("One-line project goal"),
  description: z.string().min(50).max(5000).optional().describe("The project description"),
  helpType: z.enum(['ADVICE', 'PROTOTYPE', 'MVP', 'FULL_PRODUCT']).optional().describe("The type of help needed"),
  status: z.enum(['AWAITING_VOLUNTEERS', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional().describe("Project lifecycle status"),
  contactEmail: z.string().email().optional().describe("Contact email for the project"),
  targetCompletionDate: z.string().datetime().optional().or(z.literal('')).describe("Target completion date (ISO 8601)"),
  isActive: z.boolean().optional().describe("Whether project is actively seeking help"),
  productId: z.string().optional().describe("Associated product ID"),
  organizationId: z.string().optional().describe("Organization ID to create project under"),
});

/**
 * Schema for manageProject tool parameters with conditional validation
 */
export const manageProjectParameters = manageProjectBaseSchema.refine((data) => {
  // Validate projectId is required for certain actions
  if (['update', 'delete', 'get'].includes(data.action) && !data.projectId) {
    return false;
  }
  return true;
}, {
  message: "Project ID is required for update, delete, and get actions",
  path: ['projectId']
});

/**
 * Tool definition for managing projects
 */
export const manageProjectTool = {
  name: 'maix_manage_project',
  description: 'Manages user projects with CRUD operations: create, update, delete, get, and list projects',
  parameters: manageProjectParameters,
  parametersShape: manageProjectBaseSchema.shape, // Export the base schema shape for MCP registration
  
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
  // Validate data against create schema
  const validationResult = createProjectSchema.safeParse(projectData);
  
  if (!validationResult.success) {
    return {
      success: false,
      error: `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
    };
  }
  
  const validatedData = validationResult.data;
  
  // If organizationId is provided, validate user is a member
  if (validatedData.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: validatedData.organizationId,
          userId: context.user.id,
        }
      }
    });
    
    if (!membership) {
      return {
        success: false,
        error: "You are not a member of the specified organization",
      };
    }
  }
  
  const newProject = await prisma.project.create({
    data: {
      name: validatedData.name,
      goal: validatedData.goal,
      description: validatedData.description,
      helpType: validatedData.helpType,
      contactEmail: validatedData.contactEmail,
      targetCompletionDate: validatedData.targetCompletionDate ? new Date(validatedData.targetCompletionDate) : null,
      isActive: validatedData.isActive ?? true,
      productId: validatedData.productId,
      // Dual ownership: Either user OR organization owns it, never both
      ownerId: validatedData.organizationId ? null : context.user.id,
      organizationId: validatedData.organizationId,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      organization: {
        select: { id: true, name: true, slug: true }
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
  
  // Validate data against update schema
  const validationResult = updateProjectSchema.safeParse(projectData);
  
  if (!validationResult.success) {
    return {
      success: false,
      error: `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
    };
  }
  
  const validatedData = validationResult.data;
  
  // If organizationId is being changed, validate membership
  if (validatedData.organizationId !== undefined) {
    if (validatedData.organizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: validatedData.organizationId,
            userId: context.user.id,
          }
        }
      });
      
      if (!membership) {
        return {
          success: false,
          error: "You are not a member of the specified organization",
        };
      }
    }
  }
  
  // Prepare update data (only include fields that were provided)
  const updateData: any = {};
  
  if (validatedData.name !== undefined) updateData.name = validatedData.name;
  if (validatedData.goal !== undefined) updateData.goal = validatedData.goal;
  if (validatedData.description !== undefined) updateData.description = validatedData.description;
  if (validatedData.helpType !== undefined) updateData.helpType = validatedData.helpType;
  if (validatedData.contactEmail !== undefined) updateData.contactEmail = validatedData.contactEmail;
  if (validatedData.targetCompletionDate !== undefined) {
    updateData.targetCompletionDate = validatedData.targetCompletionDate ? new Date(validatedData.targetCompletionDate) : null;
  }
  if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
  if (validatedData.productId !== undefined) updateData.productId = validatedData.productId;
  
  // Handle dual ownership change
  if (validatedData.organizationId !== undefined) {
    updateData.organizationId = validatedData.organizationId;
    updateData.ownerId = validatedData.organizationId ? null : context.user.id;
  }
  
  try {
    const updatedProject = await prisma.project.update({
      where: { 
        id: projectId,
        OR: [
          { ownerId: context.user.id }, // User-owned project
          { 
            organizationId: { not: null },
            organization: {
              members: {
                some: { userId: context.user.id }
              }
            }
          } // Organization-owned project where user is member
        ]
      },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true, slug: true }
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
        OR: [
          { ownerId: context.user.id }, // User-owned project
          { 
            organizationId: { not: null },
            organization: {
              members: {
                some: { userId: context.user.id }
              }
            }
          } // Organization-owned project where user is member
        ]
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
      OR: [
        { ownerId: context.user.id }, // User-owned project
        { 
          organizationId: { not: null },
          organization: {
            members: {
              some: { userId: context.user.id }
            }
          }
        } // Organization-owned project where user is member
      ]
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      organization: {
        select: { id: true, name: true, slug: true }
      },
      applications: {
        select: {
          id: true,
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
    where: {
      OR: [
        { ownerId: context.user.id }, // User-owned projects
        { 
          organizationId: { not: null },
          organization: {
            members: {
              some: { userId: context.user.id }
            }
          }
        } // Organization-owned projects where user is member
      ]
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      organization: {
        select: { id: true, name: true, slug: true }
      },
      applications: {
        select: {
          id: true,
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