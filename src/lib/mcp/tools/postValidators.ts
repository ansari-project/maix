import { z } from "zod";
import { PostType } from "@prisma/client";

// Input types for validation
export interface CreatePostInput {
  type: PostType;
  content: string;
  parentId?: string;
  projectId?: string;
  productId?: string;
}

export interface UpdatePostInput {
  content?: string;
  isResolved?: boolean;
  bestAnswerId?: string;
}

// Validation functions for each PostType
export const validateQuestion = (input: CreatePostInput) => {
  if (!input.content) {
    throw new Error("Question requires content");
  }
  if (input.parentId || input.projectId || input.productId) {
    throw new Error("Question cannot have parentId, projectId, or productId");
  }
};

export const validateAnswer = (input: CreatePostInput) => {
  if (!input.parentId || !input.content) {
    throw new Error("Answer requires parentId and content");
  }
  if (input.projectId || input.productId) {
    throw new Error("Answer cannot have projectId or productId");
  }
};

export const validateProjectUpdate = (input: CreatePostInput) => {
  if (!input.projectId || !input.content) {
    throw new Error("Project update requires projectId and content");
  }
  if (input.parentId || input.productId) {
    throw new Error("Project update cannot have parentId or productId");
  }
};

export const validateProductUpdate = (input: CreatePostInput) => {
  if (!input.productId || !input.content) {
    throw new Error("Product update requires productId and content");
  }
  if (input.parentId || input.projectId) {
    throw new Error("Product update cannot have parentId or projectId");
  }
};

export const validateProjectDiscussion = (input: CreatePostInput) => {
  if (!input.projectId || !input.content) {
    throw new Error("Project discussion requires projectId and content");
  }
  if (input.parentId || input.productId) {
    throw new Error("Project discussion cannot have parentId or productId");
  }
};

export const validateProductDiscussion = (input: CreatePostInput) => {
  if (!input.productId || !input.content) {
    throw new Error("Product discussion requires productId and content");
  }
  if (input.parentId || input.projectId) {
    throw new Error("Product discussion cannot have parentId or projectId");
  }
};

export const validateEventUpdate = (input: CreatePostInput) => {
  if (!input.content) {
    throw new Error("Event update requires content");
  }
  // Event updates will need maixEventId, but that's not in CreatePostInput yet
  // For now, just validate content
};

export const validateEventDiscussion = (input: CreatePostInput) => {
  if (!input.content) {
    throw new Error("Event discussion requires content");
  }
  // Event discussions will need maixEventId, but that's not in CreatePostInput yet
  // For now, just validate content
};

// Validation strategy map
export const createPostValidators = {
  [PostType.QUESTION]: validateQuestion,
  [PostType.ANSWER]: validateAnswer,
  [PostType.PROJECT_UPDATE]: validateProjectUpdate,
  [PostType.PRODUCT_UPDATE]: validateProductUpdate,
  [PostType.PROJECT_DISCUSSION]: validateProjectDiscussion,
  [PostType.PRODUCT_DISCUSSION]: validateProductDiscussion,
  [PostType.EVENT_UPDATE]: validateEventUpdate,
  [PostType.EVENT_DISCUSSION]: validateEventDiscussion,
};

// Update validation for questions (only questions can have isResolved/bestAnswerId)
export const validateQuestionUpdate = (input: UpdatePostInput, postType: PostType) => {
  if (postType !== PostType.QUESTION && (input.isResolved !== undefined || input.bestAnswerId !== undefined)) {
    throw new Error("Only questions can have isResolved or bestAnswerId fields");
  }
};

// Zod schemas for input validation
export const CreatePostSchema = z.object({
  type: z.nativeEnum(PostType),
  content: z.string().min(1).max(10000),
  parentId: z.string().optional(),
  projectId: z.string().optional(),
  productId: z.string().optional(),
});

export const UpdatePostSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  isResolved: z.boolean().optional(),
  bestAnswerId: z.string().optional(),
});