import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Input schema for search comments
export const SearchCommentsSchema = z.object({
  postId: z.string().optional(),
  authorId: z.string().optional(),
  query: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type SearchCommentsParams = z.infer<typeof SearchCommentsSchema>;

// Helper to build search conditions
function buildSearchConditions(params: SearchCommentsParams): Prisma.CommentWhereInput {
  const conditions: Prisma.CommentWhereInput = {};

  // Filter by post
  if (params.postId) {
    conditions.postId = params.postId;
  }

  // Filter by author
  if (params.authorId) {
    conditions.authorId = params.authorId;
  }

  // Date range filters
  const dateFilters: any = {};
  if (params.dateFrom) {
    dateFilters.gte = new Date(params.dateFrom);
  }
  if (params.dateTo) {
    dateFilters.lte = new Date(params.dateTo);
  }
  if (Object.keys(dateFilters).length > 0) {
    conditions.createdAt = dateFilters;
  }

  return conditions;
}

// Helper to format search results
function formatSearchResult(comment: any): string {
  const lines = [];
  
  // Basic info
  lines.push(`Comment: ${comment.id}`);
  lines.push(`Author: ${comment.author?.name || 'Unknown'}`);
  lines.push(`Created: ${comment.createdAt.toISOString().split('T')[0]}`);
  
  // Content preview (first 300 chars for comments)
  const preview = comment.content.length > 300 
    ? comment.content.substring(0, 300) + "..."
    : comment.content;
  lines.push(`Content: ${preview}`);
  
  // Post context
  if (comment.post) {
    const postPreview = comment.post.content.length > 100
      ? comment.post.content.substring(0, 100) + "..."
      : comment.post.content;
    lines.push(`On ${comment.post.type}: ${postPreview}`);
    
    if (comment.post.project) {
      lines.push(`Project: ${comment.post.project.name}`);
    }
    if (comment.post.product) {
      lines.push(`Product: ${comment.post.product.name}`);
    }
  }
  
  // Stats
  lines.push(`Replies: ${comment._count?.replies || 0}`);
  
  return lines.join('\n');
}

// Main search handler
export async function handleSearchComments(params: SearchCommentsParams): Promise<string> {
  try {
    // Validate input
    const validatedParams = SearchCommentsSchema.parse(params);

    // Build base conditions
    const whereConditions = buildSearchConditions(validatedParams);

    // Handle text search
    if (validatedParams.query && validatedParams.query.trim()) {
      // For comments, use simple LIKE search since comment volume is typically lower
      // Could be upgraded to FTS if needed
      whereConditions.content = {
        contains: validatedParams.query.trim(),
        mode: 'insensitive'
      };
    }

    const comments = await prisma.comment.findMany({
      where: whereConditions,
      include: {
        author: { select: { id: true, name: true } },
        post: { 
          select: { 
            id: true, 
            type: true,
            content: true,
            project: { select: { id: true, name: true } },
            product: { select: { id: true, name: true } }
          } 
        },
        _count: { select: { replies: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: validatedParams.limit,
      skip: validatedParams.offset,
    });

    if (comments.length === 0) {
      return "No comments found matching your criteria.";
    }

    const results = comments.map(formatSearchResult);
    let summary = `Found ${results.length} comments`;
    
    if (validatedParams.query) {
      summary += ` matching "${validatedParams.query}"`;
    }
    if (validatedParams.postId) {
      summary += ` on specified post`;
    }
    if (validatedParams.authorId) {
      summary += ` by specified author`;
    }
    
    summary += ':\n\n';
    
    return summary + results.join('\n\n---\n\n');

  } catch (error) {
    console.error("Failed to search comments:", error);
    throw new Error("An error occurred while searching comments.");
  }
}