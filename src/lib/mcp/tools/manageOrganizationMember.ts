import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { MaixMcpContext, MaixMcpResponse } from '../types';

/**
 * Base schema for manageOrganizationMember tool parameters
 */
const manageOrganizationMemberBaseSchema = z.object({
  action: z.enum(['list', 'invite', 'remove', 'leave']).describe("The operation to perform"),
  organizationId: z.string().describe("The ID of the organization"),
  userId: z.string().optional().describe("The ID of the user (required for invite/remove)"),
});

/**
 * Schema for manageOrganizationMember tool parameters with conditional validation
 */
export const manageOrganizationMemberParameters = manageOrganizationMemberBaseSchema.refine((data) => {
  // Validate userId is required for certain actions
  if (['invite', 'remove'].includes(data.action) && !data.userId) {
    return false;
  }
  return true;
}, {
  message: "User ID is required for invite and remove actions",
  path: ['userId']
});

/**
 * Tool definition for managing organization members
 */
export const manageOrganizationMemberTool = {
  name: 'maix_manage_organization_member',
  description: 'Manage organization members: list, invite, remove, or leave',
  parameters: manageOrganizationMemberParameters,
  parametersShape: manageOrganizationMemberBaseSchema.shape,
  
  handler: async (
    params: z.infer<typeof manageOrganizationMemberParameters>,
    context: MaixMcpContext
  ): Promise<MaixMcpResponse> => {
    try {
      const validatedParams = manageOrganizationMemberParameters.parse(params);
      const { action, organizationId, userId } = validatedParams;
      
      switch (action) {
        case 'list':
          return await listMembers(organizationId, context);
        case 'invite':
          return await inviteMember(organizationId, userId!, context);
        case 'remove':
          return await removeMember(organizationId, userId!, context);
        case 'leave':
          return await leaveOrganization(organizationId, context);
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      console.error('MCP Tool Error: Failed to manage organization member', error);
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        };
      }
      
      return {
        success: false,
        error: 'An internal error occurred while managing organization members',
      };
    }
  },
};

/**
 * List organization members
 */
async function listMembers(
  organizationId: string,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  // Check if user is a member
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: context.user.id,
      }
    }
  });
  
  if (!membership) {
    return {
      success: false,
      error: "You are not a member of this organization",
    };
  }
  
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: {
        select: { 
          id: true, 
          name: true, 
          email: true,
          skills: true,
          availability: true
        }
      }
    },
    orderBy: [
      { role: 'asc' }, // OWNER first
      { joinedAt: 'asc' }
    ]
  });
  
  return {
    success: true,
    data: members,
    message: `Found ${members.length} members`,
  };
}

/**
 * Invite a user to the organization
 */
async function inviteMember(
  organizationId: string,
  userId: string,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
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
      error: "Only organization owners can invite members",
    };
  }
  
  // Check if user exists
  const userToInvite = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true }
  });
  
  if (!userToInvite) {
    return {
      success: false,
      error: "User not found",
    };
  }
  
  // Check if user is already a member
  const existingMembership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      }
    }
  });
  
  if (existingMembership) {
    return {
      success: false,
      error: "User is already a member of this organization",
    };
  }
  
  // Add member
  const newMember = await prisma.organizationMember.create({
    data: {
      organizationId,
      userId,
      role: 'MEMBER',
    },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      },
      organization: {
        select: { name: true }
      }
    }
  });
  
  return {
    success: true,
    data: newMember,
    message: `${userToInvite.name || userToInvite.email} has been invited to ${newMember.organization.name}`,
  };
}

/**
 * Remove a member from the organization
 */
async function removeMember(
  organizationId: string,
  userId: string,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
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
      error: "Only organization owners can remove members",
    };
  }
  
  // Cannot remove yourself
  if (userId === context.user.id) {
    return {
      success: false,
      error: "You cannot remove yourself. Use the leave action instead.",
    };
  }
  
  // Check if member exists
  const memberToRemove = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      }
    },
    include: {
      user: {
        select: { name: true, email: true }
      }
    }
  });
  
  if (!memberToRemove) {
    return {
      success: false,
      error: "User is not a member of this organization",
    };
  }
  
  // Cannot remove another owner if they're the last one
  if (memberToRemove.role === 'OWNER') {
    const ownerCount = await prisma.organizationMember.count({
      where: {
        organizationId,
        role: 'OWNER'
      }
    });
    
    if (ownerCount === 1) {
      return {
        success: false,
        error: "Cannot remove the last owner of the organization",
      };
    }
  }
  
  // Remove member
  await prisma.organizationMember.delete({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      }
    }
  });
  
  return {
    success: true,
    message: `${memberToRemove.user.name || memberToRemove.user.email} has been removed from the organization`,
  };
}

/**
 * Leave an organization
 */
async function leaveOrganization(
  organizationId: string,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  // Check if user is a member
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: context.user.id,
      }
    },
    include: {
      organization: {
        select: { name: true }
      }
    }
  });
  
  if (!membership) {
    return {
      success: false,
      error: "You are not a member of this organization",
    };
  }
  
  // Cannot leave if you're the last owner
  if (membership.role === 'OWNER') {
    const ownerCount = await prisma.organizationMember.count({
      where: {
        organizationId,
        role: 'OWNER'
      }
    });
    
    if (ownerCount === 1) {
      // Check if there are other members who could become owner
      const memberCount = await prisma.organizationMember.count({
        where: { organizationId }
      });
      
      if (memberCount > 1) {
        return {
          success: false,
          error: "Cannot leave as the last owner. Transfer ownership to another member first.",
        };
      } else {
        return {
          success: false,
          error: "Cannot leave as the last owner. Delete the organization instead.",
        };
      }
    }
  }
  
  // Leave organization
  await prisma.organizationMember.delete({
    where: {
      organizationId_userId: {
        organizationId,
        userId: context.user.id,
      }
    }
  });
  
  return {
    success: true,
    message: `You have left ${membership.organization.name}`,
  };
}