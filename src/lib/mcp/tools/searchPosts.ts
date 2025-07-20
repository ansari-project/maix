import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PostType, Prisma } from "@prisma/client";

// Input schema for search posts
export const SearchPostsSchema = z.object({
  query: z.string().optional(),
  type: z.array(z.nativeEnum(PostType)).optional(),
  authorId: z.string().optional(),
  projectId: z.string().optional(),
  productId: z.string().optional(),
  parentId: z.string().optional(),
  isResolved: z.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type SearchPostsParams = z.infer<typeof SearchPostsSchema>;

// Helper to build search conditions
function buildSearchConditions(params: SearchPostsParams): Prisma.PostWhereInput {
  const conditions: Prisma.PostWhereInput = {};

  // Filter by post types
  if (params.type && params.type.length > 0) {
    conditions.type = { in: params.type };
  }

  // Filter by author
  if (params.authorId) {
    conditions.authorId = params.authorId;
  }

  // Filter by project
  if (params.projectId) {
    conditions.OR = [
      { projectId: params.projectId },
      { projectDiscussionThreadId: params.projectId }
    ];
  }

  // Filter by product
  if (params.productId) {
    conditions.OR = [
      { productId: params.productId },
      { productDiscussionThreadId: params.productId }
    ];
  }

  // Filter by parent (for answers to specific questions)
  if (params.parentId) {
    conditions.parentId = params.parentId;
  }

  // Filter by resolution status (only applies to questions)
  if (params.isResolved !== undefined) {
    conditions.AND = [
      { type: PostType.QUESTION },
      { isResolved: params.isResolved }
    ];
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
function formatSearchResult(post: any): string {
  const lines = [];
  
  // Basic info
  lines.push(`${post.type}: ${post.id}`);
  lines.push(`Author: ${post.author?.name || 'Unknown'}`);
  lines.push(`Created: ${post.createdAt.toISOString().split('T')[0]}`);
  
  // Content preview (first 200 chars)
  const preview = post.content.length > 200 
    ? post.content.substring(0, 200) + "..."
    : post.content;
  lines.push(`Content: ${preview}`);
  
  // Context info
  if (post.parent) {
    lines.push(`Reply to: ${post.parent.content.substring(0, 50)}...`);
  }
  if (post.project) {
    lines.push(`Project: ${post.project.name}`);
  }
  if (post.product) {
    lines.push(`Product: ${post.product.name}`);
  }
  if (post.type === PostType.QUESTION) {
    lines.push(`Resolved: ${post.isResolved ? 'Yes' : 'No'}`);
    if (post.bestAnswer) {
      lines.push(`Has best answer: Yes`);
    }
  }
  
  // Stats
  lines.push(`Replies: ${post._count?.replies || 0}, Comments: ${post._count?.comments || 0}`);
  
  return lines.join('\n');
}

// Main search handler
export async function handleSearchPosts(params: SearchPostsParams): Promise<string> {
  try {
    // Validate input
    const validatedParams = SearchPostsSchema.parse(params);

    // Build base conditions
    const whereConditions = buildSearchConditions(validatedParams);

    // Handle text search using PostgreSQL Full-Text Search
    if (validatedParams.query && validatedParams.query.trim()) {
      const searchQuery = validatedParams.query.trim();
      
      // For MVP, use simpler text search and apply filters in Prisma
      // Convert query to tsquery format (handle spaces and special chars)
      const tsQuery = searchQuery
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => word.replace(/[^\w]/g, ''))
        .filter(word => word.length > 0)
        .join(' & ');

      if (tsQuery) {
        // First get posts matching text search
        const searchResults = await prisma.$queryRaw<Array<{id: string}>>`
          SELECT id FROM posts 
          WHERE to_tsvector('english', content) @@ to_tsquery('english', ${tsQuery})
          ORDER BY ts_rank(to_tsvector('english', content), to_tsquery('english', ${tsQuery})) DESC
          LIMIT 200
        `;

        const postIds = searchResults.map(result => result.id);
        
        if (postIds.length === 0) {
          return "No posts found matching your search criteria.";
        }

        // Then apply other filters using Prisma
        const combinedConditions = {
          ...whereConditions,
          id: { in: postIds }
        };

        const posts = await prisma.post.findMany({
          where: combinedConditions,
          include: {
            author: { select: { id: true, name: true } },
            parent: { select: { id: true, content: true } },
            project: { select: { id: true, name: true } },
            product: { select: { id: true, name: true } },
            bestAnswer: { select: { id: true } },
            _count: { select: { replies: true, comments: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: validatedParams.limit,
          skip: validatedParams.offset,
        });

        if (posts.length === 0) {
          return "No posts found matching your search criteria.";
        }

        const results = posts.map(formatSearchResult);
        const summary = `Found ${results.length} posts matching "${searchQuery}":\n\n`;
        return summary + results.join('\n\n---\n\n');
      }
    }

    // If no text query, do regular filtered search
    const posts = await prisma.post.findMany({
      where: whereConditions,
      include: {
        author: { select: { id: true, name: true } },
        parent: { select: { id: true, content: true } },
        project: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        bestAnswer: { select: { id: true } },
        _count: { select: { replies: true, comments: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: validatedParams.limit,
      skip: validatedParams.offset,
    });

    if (posts.length === 0) {
      return "No posts found matching your criteria.";
    }

    const results = posts.map(formatSearchResult);
    const summary = `Found ${results.length} posts:\n\n`;
    return summary + results.join('\n\n---\n\n');

  } catch (error) {
    console.error("Failed to search posts:", error);
    throw new Error("An error occurred while searching posts.");
  }
}