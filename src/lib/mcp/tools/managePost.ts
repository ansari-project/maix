import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PostType, Post } from "@prisma/client";
import { 
  createPostValidators, 
  validateQuestionUpdate,
  CreatePostSchema,
  UpdatePostSchema,
  type CreatePostInput,
  type UpdatePostInput
} from "./postValidators";

// Input schema for the MCP tool
export const ManagePostSchema = z.object({
  action: z.enum(["create", "get", "update", "delete"]),
  postId: z.string().optional(),
  type: z.nativeEnum(PostType).optional(),
  content: z.string().optional(),
  parentId: z.string().optional(),
  projectId: z.string().optional(),
  productId: z.string().optional(),
  isResolved: z.boolean().optional(),
  bestAnswerId: z.string().optional(),
});

export type ManagePostParams = z.infer<typeof ManagePostSchema>;

export interface MaixMcpContext {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

// Helper function to check if user can modify post
async function checkPostPermissions(postId: string, userId: string): Promise<Post> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      project: { select: { ownerId: true } },
      product: { select: { ownerId: true } }
    }
  });

  if (!post) {
    throw new Error("Post not found");
  }

  // Users can modify their own posts
  if (post.authorId === userId) {
    return post;
  }

  // Project admins can moderate discussions on their projects
  if (post.type === PostType.PROJECT_DISCUSSION && post.projectDiscussionThreadId) {
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: post.projectDiscussionThreadId,
        userId,
        role: 'ADMIN'
      }
    });
    if (projectMember) return post;
  }

  // Product admins can moderate discussions on their products
  if (post.type === PostType.PRODUCT_DISCUSSION && post.productDiscussionThreadId) {
    const productMember = await prisma.productMember.findFirst({
      where: {
        productId: post.productDiscussionThreadId,
        userId,
        role: 'ADMIN'
      }
    });
    if (productMember) return post;
  }

  throw new Error("You don't have permission to modify this post");
}

// Create post handler
async function handleCreatePost(params: ManagePostParams, context: MaixMcpContext) {
  if (!params.type || !params.content) {
    throw new Error("Type and content are required for creating a post");
  }

  const input: CreatePostInput = {
    type: params.type,
    content: params.content,
    parentId: params.parentId,
    projectId: params.projectId,
    productId: params.productId,
  };

  // Validate input with Zod
  const validatedInput = CreatePostSchema.parse(input);

  // Apply type-specific validation
  const validator = createPostValidators[validatedInput.type];
  if (!validator) {
    throw new Error(`Unsupported PostType for creation: ${validatedInput.type}`);
  }
  validator(validatedInput);

  // Additional validation for answers - ensure parent is a question
  if (validatedInput.type === PostType.ANSWER && validatedInput.parentId) {
    const parentPost = await prisma.post.findUnique({
      where: { id: validatedInput.parentId },
      select: { type: true, id: true }
    });
    if (!parentPost || parentPost.type !== PostType.QUESTION) {
      throw new Error("Answer parent must be a question");
    }
  }

  // Additional validation for project/product existence
  if (validatedInput.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: validatedInput.projectId },
      select: { id: true }
    });
    if (!project) {
      throw new Error("Project not found");
    }
  }

  if (validatedInput.productId) {
    const product = await prisma.product.findUnique({
      where: { id: validatedInput.productId },
      select: { id: true }
    });
    if (!product) {
      throw new Error("Product not found");
    }
  }

  try {
    // Prepare data for creation
    const createData: any = {
      type: validatedInput.type,
      content: validatedInput.content,
      authorId: context.user.id,
    };

    // Add relationships based on type
    if (validatedInput.parentId) {
      createData.parentId = validatedInput.parentId;
    }
    if (validatedInput.projectId) {
      createData.projectId = validatedInput.projectId;
      // For project discussions, also set the discussion thread relationship
      if (validatedInput.type === PostType.PROJECT_DISCUSSION) {
        createData.projectDiscussionThreadId = validatedInput.projectId;
      }
    }
    if (validatedInput.productId) {
      createData.productId = validatedInput.productId;
      // For product discussions, also set the discussion thread relationship
      if (validatedInput.type === PostType.PRODUCT_DISCUSSION) {
        createData.productDiscussionThreadId = validatedInput.productId;
      }
    }

    const post = await prisma.post.create({
      data: createData,
    });

    return `Post created successfully! ID: ${post.id}`;
  } catch (error: any) {
    // Handle unique constraint violations for discussions
    if (error.code === 'P2002' && error.meta?.target?.includes('discussionThread')) {
      throw new Error("Discussion already exists for this project/product");
    }
    throw error;
  }
}

// Get post handler
async function handleGetPost(params: ManagePostParams) {
  if (!params.postId) {
    throw new Error("Post ID is required");
  }

  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      parent: { select: { id: true, content: true, author: { select: { name: true } } } },
      project: { select: { id: true, name: true } },
      product: { select: { id: true, name: true } },
      bestAnswer: { 
        select: { 
          id: true, 
          content: true, 
          author: { select: { name: true } } 
        } 
      },
      _count: { select: { replies: true, comments: true } }
    }
  });

  if (!post) {
    throw new Error("Post not found");
  }

  let description = `${post.type}: ${post.content}\n`;
  description += `Author: ${post.author?.name || 'Unknown'}\n`;
  description += `Created: ${post.createdAt}\n`;
  
  if (post.parent) {
    description += `Reply to: ${post.parent.content.substring(0, 100)}...\n`;
  }
  if (post.project) {
    description += `Project: ${post.project.name}\n`;
  }
  if (post.product) {
    description += `Product: ${post.product.name}\n`;
  }
  if (post.type === PostType.QUESTION) {
    description += `Resolved: ${post.isResolved}\n`;
    if (post.bestAnswer) {
      description += `Best Answer: ${post.bestAnswer.content.substring(0, 100)}...\n`;
    }
  }
  description += `Replies: ${post._count.replies}, Comments: ${post._count.comments}`;

  return description;
}

// Update post handler
async function handleUpdatePost(params: ManagePostParams, context: MaixMcpContext) {
  if (!params.postId) {
    throw new Error("Post ID is required for updates");
  }

  // Check permissions
  const existingPost = await checkPostPermissions(params.postId, context.user.id);

  const updateData: UpdatePostInput = {};
  if (params.content !== undefined) updateData.content = params.content;
  if (params.isResolved !== undefined) updateData.isResolved = params.isResolved;
  if (params.bestAnswerId !== undefined) updateData.bestAnswerId = params.bestAnswerId;

  // Validate update data
  const validatedUpdate = UpdatePostSchema.parse(updateData);

  // Validate question-specific fields
  validateQuestionUpdate(validatedUpdate, existingPost.type);

  // Special validation for bestAnswerId
  if (validatedUpdate.bestAnswerId) {
    if (existingPost.type !== PostType.QUESTION) {
      throw new Error("Only questions can have a best answer");
    }
    
    // Verify the answer exists and belongs to this question
    const answer = await prisma.post.findFirst({
      where: {
        id: validatedUpdate.bestAnswerId,
        type: PostType.ANSWER,
        parentId: params.postId
      }
    });
    
    if (!answer) {
      throw new Error("Best answer must be an answer to this question");
    }
  }

  const updatedPost = await prisma.post.update({
    where: { id: params.postId },
    data: validatedUpdate,
  });

  return "Post updated successfully!";
}

// Delete post handler
async function handleDeletePost(params: ManagePostParams, context: MaixMcpContext) {
  if (!params.postId) {
    throw new Error("Post ID is required for deletion");
  }

  // Check permissions
  await checkPostPermissions(params.postId, context.user.id);

  await prisma.post.delete({
    where: { id: params.postId },
  });

  return "Post deleted successfully!";
}

// Main handler function
export async function handleManagePost(params: ManagePostParams, context: MaixMcpContext): Promise<string> {
  try {
    switch (params.action) {
      case "create":
        return await handleCreatePost(params, context);
      case "get":
        return await handleGetPost(params);
      case "update":
        return await handleUpdatePost(params, context);
      case "delete":
        return await handleDeletePost(params, context);
      default:
        throw new Error("Invalid action. Use: create, get, update, or delete");
    }
  } catch (error) {
    console.error("Failed to manage post:", error);
    throw error;
  }
}