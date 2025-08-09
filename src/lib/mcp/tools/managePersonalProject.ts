import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";
import type { User } from "@prisma/client";

// Zod schema for personal project management parameters
export const ManagePersonalProjectSchema = z.object({
  action: z.enum(["create", "update", "delete", "get", "list", "share", "unshare"]).describe("The operation to perform"),
  projectId: z.string().optional().describe("The ID of the project (required for update, delete, get, share, unshare actions)"),
  name: z.string().min(1).max(255).optional().describe("Project name"),
  description: z.string().optional().describe("Project description"),
  personalCategory: z.string().max(100).optional().describe("Personal category for organization"),
  targetCompletionDate: z.string().optional().describe("Target completion date in ISO format (YYYY-MM-DD)"),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ON_HOLD"]).optional().describe("Project status"),
  shareWithUserId: z.string().optional().describe("User ID to share with (for share action)"),
  unshareUserId: z.string().optional().describe("User ID to unshare from (for unshare action)")
});

export type ManagePersonalProjectParams = z.infer<typeof ManagePersonalProjectSchema>;

interface Context {
  user: User;
}

export async function handleManagePersonalProject(params: ManagePersonalProjectParams, context: Context): Promise<string> {
  const { user } = context;

  switch (params.action) {
    case "create": {
      if (!params.name || !params.description) {
        throw new Error("Name and description are required for creating a personal project.");
      }

      const project = await prisma.project.create({
        data: {
          name: params.name,
          description: params.description,
          personalCategory: params.personalCategory || null,
          targetCompletionDate: params.targetCompletionDate ? new Date(params.targetCompletionDate) : null,
          status: params.status || "IN_PROGRESS",
          ownerId: user.id,
          isPersonal: true,
          isActive: true,
          // Personal projects don't need these fields
          goal: null,
          contactEmail: null,
          helpType: null,
        },
        include: {
          owner: { select: { name: true, email: true } },
          members: {
            include: {
              user: { select: { name: true, email: true } }
            }
          }
        }
      });

      const categoryText = project.personalCategory ? ` (Category: ${project.personalCategory})` : "";
      const targetText = project.targetCompletionDate 
        ? ` (Target: ${project.targetCompletionDate.toLocaleDateString()})`
        : "";

      return `Personal project "${project.name}" created successfully${categoryText}${targetText}. ID: ${project.id}`;
    }

    case "list": {
      const projects = await prisma.project.findMany({
        where: {
          isPersonal: true,
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } }
          ]
        },
        include: {
          owner: { select: { name: true, email: true } },
          members: {
            include: {
              user: { select: { name: true, email: true } }
            }
          },
          _count: {
            select: {
              todos: {
                where: {
                  status: { not: "COMPLETED" }
                }
              }
            }
          }
        },
        orderBy: { updatedAt: "desc" }
      });

      if (projects.length === 0) {
        return "No personal projects found. Use the 'create' action to create your first _personal_ project.";
      }

      const projectList = projects.map(project => {
        const isOwner = project.ownerId === user.id;
        const memberCount = project.members.length;
        const activeTodos = project._count.todos;
        
        const statusIcon = project.status === "COMPLETED" ? "✅" : 
                          project.status === "IN_PROGRESS" ? "🔄" : 
                          project.status === "ON_HOLD" ? "⏸️" : "❓";
        
        const ownershipText = isOwner ? "" : " (shared)";
        const categoryText = project.personalCategory ? ` [${project.personalCategory}]` : "";
        const todoText = activeTodos > 0 ? ` (${activeTodos} active todos)` : "";
        const memberText = memberCount > 1 ? ` (${memberCount} members)` : "";
        
        return `  ${statusIcon} ${project.name}${ownershipText}${categoryText}${todoText}${memberText} [${project.id}]`;
      }).join("\n");

      return `Your personal projects:\n${projectList}`;
    }

    case "get": {
      if (!params.projectId) {
        throw new Error("Project ID is required.");
      }

      const project = await prisma.project.findUnique({
        where: { id: params.projectId },
        include: {
          owner: { select: { name: true, email: true } },
          members: {
            include: {
              user: { select: { name: true, email: true } }
            }
          },
          _count: {
            select: {
              todos: {
                where: { status: { not: "COMPLETED" } }
              }
            }
          }
        }
      });

      if (!project) {
        throw new Error("Project not found.");
      }

      if (!project.isPersonal) {
        throw new Error("This tool only works with personal projects.");
      }

      // Check permissions
      const isOwner = project.ownerId === user.id;
      const isMember = project.members.some(m => m.userId === user.id);
      
      if (!isOwner && !isMember) {
        throw new Error("You don't have permission to view this project.");
      }

      const ownerText = isOwner ? "You" : (project.owner?.name || project.owner?.email || "Unknown");
      const membersList = project.members.length > 0 
        ? project.members.map(m => m.user.name || m.user.email).join(", ")
        : "None";
      
      const categoryText = project.personalCategory 
        ? `Category: ${project.personalCategory}\n`
        : "";
      
      const targetText = project.targetCompletionDate 
        ? `Target Completion: ${project.targetCompletionDate.toLocaleDateString()}\n`
        : "";

      return `Personal Project Details:
Name: ${project.name}
Description: ${project.description}
Status: ${project.status}
${categoryText}${targetText}Owner: ${ownerText}
Members: ${membersList}
Active todos: ${project._count.todos}
Created: ${project.createdAt.toLocaleDateString()}
Last updated: ${project.updatedAt.toLocaleDateString()}
ID: ${project.id}`;
    }

    case "update": {
      if (!params.projectId) {
        throw new Error("Project ID is required for updates.");
      }

      const existingProject = await prisma.project.findUnique({
        where: { id: params.projectId }
      });

      if (!existingProject) {
        throw new Error("Project not found.");
      }

      if (!existingProject.isPersonal) {
        throw new Error("This tool only works with personal projects.");
      }

      // Only owner can update
      if (existingProject.ownerId !== user.id) {
        throw new Error("Only the project owner can update a personal project.");
      }

      const updateData: any = {};
      if (params.name) updateData.name = params.name;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.personalCategory !== undefined) updateData.personalCategory = params.personalCategory;
      if (params.status) updateData.status = params.status as ProjectStatus;
      if (params.targetCompletionDate !== undefined) {
        updateData.targetCompletionDate = params.targetCompletionDate ? new Date(params.targetCompletionDate) : null;
      }

      const updatedProject = await prisma.project.update({
        where: { id: params.projectId },
        data: updateData,
        include: {
          owner: { select: { name: true, email: true } }
        }
      });

      return `Personal project "${updatedProject.name}" updated successfully.`;
    }

    case "delete": {
      if (!params.projectId) {
        throw new Error("Project ID is required for deletion.");
      }

      const existingProject = await prisma.project.findUnique({
        where: { id: params.projectId },
        include: { todos: true }
      });

      if (!existingProject) {
        throw new Error("Project not found.");
      }

      if (!existingProject.isPersonal) {
        throw new Error("This tool only works with personal projects.");
      }

      // Only owner can delete
      if (existingProject.ownerId !== user.id) {
        throw new Error("Only the project owner can delete a personal project.");
      }

      // Transaction to handle todo orphaning
      await prisma.$transaction(async (tx) => {
        // Orphan all todos (make them standalone personal todos)
        await tx.todo.updateMany({
          where: { projectId: params.projectId },
          data: { projectId: null }
        });

        // Delete project members
        await tx.projectMember.deleteMany({
          where: { projectId: params.projectId }
        });

        // Delete the project
        await tx.project.delete({
          where: { id: params.projectId }
        });
      });

      const todoCount = existingProject.todos.length;
      const orphanText = todoCount > 0 ? ` (${todoCount} todos converted to standalone personal todos)` : "";

      return `Personal project "${existingProject.name}" deleted successfully${orphanText}.`;
    }

    case "share": {
      if (!params.projectId || !params.shareWithUserId) {
        throw new Error("Project ID and shareWithUserId are required for sharing.");
      }

      const project = await prisma.project.findUnique({
        where: { id: params.projectId },
        include: { members: true }
      });

      if (!project) {
        throw new Error("Project not found.");
      }

      if (!project.isPersonal) {
        throw new Error("This tool only works with personal projects.");
      }

      // Only owner can share
      if (project.ownerId !== user.id) {
        throw new Error("Only the project owner can share a personal project.");
      }

      // Check if user exists
      const shareWithUser = await prisma.user.findUnique({
        where: { id: params.shareWithUserId },
        select: { name: true, email: true }
      });

      if (!shareWithUser) {
        throw new Error("User to share with not found.");
      }

      // Check if already shared
      const existingMember = project.members.find(m => m.userId === params.shareWithUserId);
      if (existingMember) {
        return `Project "${project.name}" is already shared with ${shareWithUser.name || shareWithUser.email}.`;
      }

      // Add user as member
      await prisma.projectMember.create({
        data: {
          projectId: params.projectId,
          userId: params.shareWithUserId,
          role: 'MEMBER'
        }
      });

      return `Personal project "${project.name}" shared successfully with ${shareWithUser.name || shareWithUser.email}.`;
    }

    case "unshare": {
      if (!params.projectId || !params.unshareUserId) {
        throw new Error("Project ID and unshareUserId are required for unsharing.");
      }

      const project = await prisma.project.findUnique({
        where: { id: params.projectId }
      });

      if (!project) {
        throw new Error("Project not found.");
      }

      if (!project.isPersonal) {
        throw new Error("This tool only works with personal projects.");
      }

      // Only owner can unshare
      if (project.ownerId !== user.id) {
        throw new Error("Only the project owner can manage sharing.");
      }

      // Get user info for response
      const unshareUser = await prisma.user.findUnique({
        where: { id: params.unshareUserId },
        select: { name: true, email: true }
      });

      if (!unshareUser) {
        throw new Error("User to unshare from not found.");
      }

      // Remove member
      const deletedMember = await prisma.projectMember.deleteMany({
        where: {
          projectId: params.projectId,
          userId: params.unshareUserId
        }
      });

      if (deletedMember.count === 0) {
        return `Project "${project.name}" was not shared with ${unshareUser.name || unshareUser.email}.`;
      }

      return `Personal project "${project.name}" unshared from ${unshareUser.name || unshareUser.email}.`;
    }

    default:
      throw new Error("Invalid action. Use: create, update, get, list, delete, share, or unshare.");
  }
}

export const managePersonalProjectTool = {
  name: 'maix_manage_personal_project',
  description: `Manages personal projects with CRUD operations and sharing.
Examples:
- Create personal project: 
  { 
    "action": "create",
    "name": "Learn React Native",
    "description": "Build a mobile app to track my daily habits and goals",
    "personalCategory": "Learning",
    "targetCompletionDate": "2024-06-01"
  }
- List personal projects: { "action": "list" }
- Share project: { "action": "share", "projectId": "abc123", "shareWithUserId": "user456" }
- Get project details: { "action": "get", "projectId": "abc123" }`,
  inputSchema: ManagePersonalProjectSchema,
  handler: handleManagePersonalProject,
};