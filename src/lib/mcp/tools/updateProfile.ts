import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { MaixMcpContext, MaixMcpResponse } from '../types';

/**
 * Schema for updateProfile tool parameters
 */
export const updateProfileParameters = z.object({
  name: z.string().min(1).max(100).optional().describe("The user's display name"),
  bio: z.string().max(1000).optional().describe("A short biography for the user"),
  skills: z.array(z.string().min(1).max(50)).max(20).optional().describe("Array of user skills"),
  specialty: z.enum(['AI', 'FULL_STACK', 'PROGRAM_MANAGER']).optional().describe("The user's primary specialty"),
  experienceLevel: z.enum(['HOBBYIST', 'INTERN', 'NEW_GRAD', 'SENIOR']).optional().describe("The user's experience level"),
  availability: z.string().max(100).optional().describe("User's availability (e.g., '10 hours/week')"),
  linkedinUrl: z.string().url().optional().describe("LinkedIn profile URL"),
  githubUrl: z.string().url().optional().describe("GitHub profile URL"),
  portfolioUrl: z.string().url().optional().describe("Portfolio website URL"),
  timezone: z.string().max(50).optional().describe("User's timezone"),
});

/**
 * Tool definition for updating user profile
 */
export const updateProfileTool = {
  name: 'maix_update_profile',
  description: "Updates the authenticated user's profile information including name, bio, skills, and other details",
  parameters: updateProfileParameters,
  
  handler: async (
    params: z.infer<typeof updateProfileParameters>,
    context: MaixMcpContext
  ): Promise<MaixMcpResponse> => {
    try {
      // Validate parameters
      const validatedParams = updateProfileParameters.parse(params);
      
      // Prepare update data (only include fields that were provided)
      const updateData: any = {};
      
      if (validatedParams.name !== undefined) updateData.name = validatedParams.name;
      if (validatedParams.bio !== undefined) updateData.bio = validatedParams.bio;
      if (validatedParams.skills !== undefined) updateData.skills = validatedParams.skills;
      if (validatedParams.specialty !== undefined) updateData.specialty = validatedParams.specialty;
      if (validatedParams.experienceLevel !== undefined) updateData.experienceLevel = validatedParams.experienceLevel;
      if (validatedParams.availability !== undefined) updateData.availability = validatedParams.availability;
      if (validatedParams.linkedinUrl !== undefined) updateData.linkedinUrl = validatedParams.linkedinUrl;
      if (validatedParams.githubUrl !== undefined) updateData.githubUrl = validatedParams.githubUrl;
      if (validatedParams.portfolioUrl !== undefined) updateData.portfolioUrl = validatedParams.portfolioUrl;
      if (validatedParams.timezone !== undefined) updateData.timezone = validatedParams.timezone;
      
      // Update the user's profile
      const updatedUser = await prisma.user.update({
        where: { id: context.user.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          skills: true,
          specialty: true,
          experienceLevel: true,
          availability: true,
          linkedinUrl: true,
          githubUrl: true,
          portfolioUrl: true,
          timezone: true,
          updatedAt: true,
        },
      });
      
      return {
        success: true,
        data: updatedUser,
        message: `Profile updated successfully for ${updatedUser.email}`,
      };
    } catch (error) {
      console.error('MCP Tool Error: Failed to update profile', error);
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        };
      }
      
      return {
        success: false,
        error: 'An internal error occurred while updating the profile',
      };
    }
  },
};