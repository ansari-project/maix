import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { MaixMcpContext, MaixMcpResponse } from '../types';

/**
 * Base schema for organization fields
 */
const organizationFieldsSchema = {
  name: z.string().min(3).max(255).describe("The organization name"),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").describe("Organization URL slug (immutable after creation)"),
  mission: z.string().min(10).max(500).optional().describe("Organization mission statement"),
  description: z.string().min(10).max(5000).optional().describe("Detailed organization description (supports Markdown)"),
  url: z.string().url().optional().or(z.literal('')).describe("Organization website URL"),
  aiEngagement: z.string().min(10).max(2000).optional().describe("Description of how the organization engages with AI technology"),
};

/**
 * Schema for create action
 */
const createOrganizationSchema = z.object({
  name: organizationFieldsSchema.name,
  slug: organizationFieldsSchema.slug,
  mission: organizationFieldsSchema.mission,
  description: organizationFieldsSchema.description,
  url: organizationFieldsSchema.url,
  aiEngagement: organizationFieldsSchema.aiEngagement,
});

/**
 * Schema for update action
 */
const updateOrganizationSchema = z.object({
  name: organizationFieldsSchema.name.optional(),
  mission: organizationFieldsSchema.mission,
  description: organizationFieldsSchema.description,
  url: organizationFieldsSchema.url,
  aiEngagement: organizationFieldsSchema.aiEngagement,
});

/**
 * Base schema for manageOrganization tool parameters
 */
const manageOrganizationBaseSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'get', 'list']).describe("The operation to perform"),
  organizationId: z.string().optional().describe("The ID of the organization (required for update, delete, get actions)"),
  name: z.string().min(3).max(255).optional().describe("The organization name"),
  slug: z.string().min(3).max(50).optional().describe("Organization URL slug (immutable after creation)"),
  mission: z.string().min(10).max(500).optional().describe("Organization mission statement"),
  description: z.string().min(10).max(5000).optional().describe("Detailed organization description (supports Markdown)"),
  url: z.string().url().optional().or(z.literal('')).describe("Organization website URL"),
  aiEngagement: z.string().min(10).max(2000).optional().describe("Description of how the organization engages with AI technology"),
});

/**
 * Schema for manageOrganization tool parameters with conditional validation
 */
export const manageOrganizationParameters = manageOrganizationBaseSchema.refine((data) => {
  // Validate organizationId is required for certain actions
  if (['update', 'delete', 'get'].includes(data.action) && !data.organizationId) {
    return false;
  }
  return true;
}, {
  message: "Organization ID is required for update, delete, and get actions",
  path: ['organizationId']
});

/**
 * Tool definition for managing organizations
 */
export const manageOrganizationTool = {
  name: 'maix_manage_organization',
  description: `Create, read, update, or delete organizations.

Examples:
- Create organization:
  {
    "action": "create",
    "name": "Tech for Good Foundation",
    "slug": "tech-for-good",
    "mission": "Leveraging technology to solve social challenges in underserved communities",
    "description": "We are a non-profit organization focused on using AI and technology to address education, healthcare, and economic challenges...",
    "url": "https://techforgood.org",
    "aiEngagement": "We use AI to personalize education content, predict healthcare needs, and match job seekers with opportunities"
  }

- Update organization:
  {
    "action": "update",
    "organizationId": "org123",
    "mission": "Updated mission statement focusing on AI ethics and responsible innovation",
    "aiEngagement": "Expanded description of our AI initiatives..."
  }

- List user's organizations: { "action": "list" }
- Get organization details: { "action": "get", "organizationId": "org123" }
- Delete organization: { "action": "delete", "organizationId": "org123" }

Notes:
- Slug is permanent after creation (used in URLs like maix.com/org/tech-for-good)
- Only organization owners can update or delete
- Organizations can own products and projects
- Mission statement should be concise (10-500 chars)
- Description supports Markdown formatting
- aiEngagement explains how the org uses/relates to AI`,
  parameters: manageOrganizationParameters,
  parametersShape: manageOrganizationBaseSchema.shape,
  
  handler: async (
    params: z.infer<typeof manageOrganizationParameters>,
    context: MaixMcpContext
  ): Promise<MaixMcpResponse> => {
    try {
      const validatedParams = manageOrganizationParameters.parse(params);
      const { action, organizationId, ...organizationData } = validatedParams;
      
      switch (action) {
        case 'create':
          return await createOrganization(organizationData, context);
        case 'update':
          return await updateOrganization(organizationId, organizationData, context);
        case 'delete':
          return await deleteOrganization(organizationId, context);
        case 'get':
          return await getOrganization(organizationId, context);
        case 'list':
          return await listOrganizations(context);
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      console.error('MCP Tool Error: Failed to manage organization', error);
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        };
      }
      
      return {
        success: false,
        error: 'An internal error occurred while managing the organization',
      };
    }
  },
};

/**
 * Create a new organization
 */
async function createOrganization(
  organizationData: any,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  // Validate data against create schema
  const validationResult = createOrganizationSchema.safeParse(organizationData);
  
  if (!validationResult.success) {
    return {
      success: false,
      error: `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
    };
  }
  
  const validatedData = validationResult.data;
  
  // Check if slug already exists
  const existingOrg = await prisma.organization.findUnique({
    where: { slug: validatedData.slug }
  });
  
  if (existingOrg) {
    return {
      success: false,
      error: `Organization with slug "${validatedData.slug}" already exists`,
    };
  }
  
  // Create organization with the user as owner
  const newOrganization = await prisma.organization.create({
    data: {
      name: validatedData.name,
      slug: validatedData.slug,
      mission: validatedData.mission,
      description: validatedData.description,
      url: validatedData.url,
      aiEngagement: validatedData.aiEngagement,
      members: {
        create: {
          userId: context.user.id,
          role: 'OWNER',
        }
      }
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });
  
  return {
    success: true,
    data: newOrganization,
    message: `Organization "${newOrganization.name}" created successfully`,
  };
}

/**
 * Update an existing organization
 */
async function updateOrganization(
  organizationId: string | undefined,
  organizationData: any,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  if (!organizationId) {
    return { success: false, error: "Organization ID is required for update action" };
  }
  
  // Validate data against update schema
  const validationResult = updateOrganizationSchema.safeParse(organizationData);
  
  if (!validationResult.success) {
    return {
      success: false,
      error: `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
    };
  }
  
  const validatedData = validationResult.data;
  
  // Check if user is an owner of the organization
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: context.user.id,
      }
    }
  });
  
  if (!membership || membership.role !== 'OWNER') {
    return {
      success: false,
      error: "Only organization owners can update organization details",
    };
  }
  
  // Update organization
  const updatedOrganization = await prisma.organization.update({
    where: { id: organizationId },
    data: validatedData,
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });
  
  return {
    success: true,
    data: updatedOrganization,
    message: `Organization "${updatedOrganization.name}" updated successfully`,
  };
}

/**
 * Delete an organization
 */
async function deleteOrganization(
  organizationId: string | undefined,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  if (!organizationId) {
    return { success: false, error: "Organization ID is required for delete action" };
  }
  
  // Check if user is an owner
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: context.user.id,
      }
    }
  });
  
  if (!membership || membership.role !== 'OWNER') {
    return {
      success: false,
      error: "Only organization owners can delete the organization",
    };
  }
  
  // Check if organization has projects or products
  const [projectCount, productCount] = await Promise.all([
    prisma.project.count({ where: { organizationId } }),
    prisma.product.count({ where: { organizationId } }),
  ]);
  
  if (projectCount > 0 || productCount > 0) {
    return {
      success: false,
      error: `Cannot delete organization with ${projectCount} projects and ${productCount} products. Delete or transfer them first.`,
    };
  }
  
  // Delete organization (cascade will delete members)
  await prisma.organization.delete({
    where: { id: organizationId }
  });
  
  return {
    success: true,
    message: "Organization deleted successfully",
  };
}

/**
 * Get a specific organization
 */
async function getOrganization(
  organizationId: string | undefined,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  if (!organizationId) {
    return { success: false, error: "Organization ID is required for get action" };
  }
  
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      members: {
        some: {
          userId: context.user.id
        }
      }
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
          isActive: true
        }
      },
      products: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  if (!organization) {
    return {
      success: false,
      error: "Organization not found or you don't have permission to access it",
    };
  }
  
  return {
    success: true,
    data: organization,
  };
}

/**
 * List all organizations for the authenticated user
 */
async function listOrganizations(context: MaixMcpContext): Promise<MaixMcpResponse> {
  const organizations = await prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId: context.user.id
        }
      }
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      _count: {
        select: {
          projects: true,
          products: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
  
  return {
    success: true,
    data: organizations,
    message: `Found ${organizations.length} organizations`,
  };
}