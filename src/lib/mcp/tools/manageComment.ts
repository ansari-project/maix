import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Comment } from "@prisma/client";

// Input schema for the MCP tool
export const ManageCommentSchema = z.object({
  action: z.enum(["create", "get", "update", "delete"]),
  commentId: z.string().optional(),
  postId: z.string().optional(),
  content: z.string().min(1).max(5000).optional(),
});

export type ManageCommentParams = z.infer<typeof ManageCommentSchema>;

export interface MaixMcpContext {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

// Helper function to check if user can modify comment
async function checkCommentPermissions(commentId: string, userId: string): Promise<Comment> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      post: {
        include: {
          project: { select: { ownerId: true } },
          product: { select: { ownerId: true } }
        }
      }
    }
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  // Users can modify their own comments
  if (comment.authorId === userId) {
    return comment;
  }

  // Project owners can moderate comments on project-related posts
  if (comment.post.project?.ownerId === userId) {
    return comment;
  }

  // Product owners can moderate comments on product-related posts  
  if (comment.post.product?.ownerId === userId) {
    return comment;
  }

  throw new Error("You don't have permission to modify this comment");
}

// Create comment handler
async function handleCreateComment(params: ManageCommentParams, context: MaixMcpContext) {
  if (!params.postId || !params.content) {
    throw new Error("Post ID and content are required for creating a comment");
  }

  // Verify the post exists
  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    select: { id: true }
  });

  if (!post) {
    throw new Error("Post not found");
  }

  const comment = await prisma.comment.create({
    data: {
      content: params.content,
      postId: params.postId,
      authorId: context.user.id,
    },
  });

  return `Comment created successfully! ID: ${comment.id}`;
}

// Get comment handler
async function handleGetComment(params: ManageCommentParams) {
  if (!params.commentId) {
    throw new Error("Comment ID is required");
  }

  const comment = await prisma.comment.findUnique({
    where: { id: params.commentId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      post: { 
        select: { 
          id: true, 
          type: true,
          content: true,
          project: { select: { name: true } },
          product: { select: { name: true } }
        } 
      },
      _count: { select: { replies: true } }
    }
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  let description = `Comment: ${comment.content}\n`;
  description += `Author: ${comment.author?.name || 'Unknown'}\n`;
  description += `Created: ${comment.createdAt}\n`;
  description += `Post: ${comment.post.type} - ${comment.post.content.substring(0, 100)}...\n`;
  
  if (comment.post.project) {
    description += `Project: ${comment.post.project.name}\n`;
  }
  if (comment.post.product) {
    description += `Product: ${comment.post.product.name}\n`;
  }
  
  description += `Replies: ${comment._count.replies}`;

  return description;
}

// Update comment handler
async function handleUpdateComment(params: ManageCommentParams, context: MaixMcpContext) {
  if (!params.commentId || !params.content) {
    throw new Error("Comment ID and content are required for updates");
  }

  // Check permissions
  await checkCommentPermissions(params.commentId, context.user.id);

  const updatedComment = await prisma.comment.update({
    where: { id: params.commentId },
    data: { content: params.content },
  });

  return "Comment updated successfully!";
}

// Delete comment handler
async function handleDeleteComment(params: ManageCommentParams, context: MaixMcpContext) {
  if (!params.commentId) {
    throw new Error("Comment ID is required for deletion");
  }

  // Check permissions
  await checkCommentPermissions(params.commentId, context.user.id);

  await prisma.comment.delete({
    where: { id: params.commentId },
  });

  return "Comment deleted successfully!";
}

// Main handler function
export async function handleManageComment(params: ManageCommentParams, context: MaixMcpContext): Promise<string> {
  try {
    // Validate input
    const validatedParams = ManageCommentSchema.parse(params);

    switch (validatedParams.action) {
      case "create":
        return await handleCreateComment(validatedParams, context);
      case "get":
        return await handleGetComment(validatedParams);
      case "update":
        return await handleUpdateComment(validatedParams, context);
      case "delete":
        return await handleDeleteComment(validatedParams, context);
      default:
        throw new Error("Invalid action. Use: create, get, update, or delete");
    }
  } catch (error) {
    console.error("Failed to manage comment:", error);
    throw error;
  }
}