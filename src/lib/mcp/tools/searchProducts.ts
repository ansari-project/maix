import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Input schema for search products
export const SearchProductsSchema = z.object({
  query: z.string().optional(),
  ownerId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type SearchProductsParams = z.infer<typeof SearchProductsSchema>;

// Helper to build search conditions
function buildSearchConditions(params: SearchProductsParams): Prisma.ProductWhereInput {
  const conditions: Prisma.ProductWhereInput = {};

  // Filter by owner
  if (params.ownerId) {
    conditions.ownerId = params.ownerId;
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
function formatSearchResult(product: any): string {
  const lines = [];
  
  // Basic info
  lines.push(`Product: ${product.name} (${product.id})`);
  lines.push(`Owner: ${product.owner?.name || 'Unknown'}`);
  lines.push(`Created: ${product.createdAt.toISOString().split('T')[0]}`);
  
  // Description preview (first 200 chars)
  const preview = product.description.length > 200 
    ? product.description.substring(0, 200) + "..."
    : product.description;
  lines.push(`Description: ${preview}`);
  
  // Context info
  if (product.url) {
    lines.push(`URL: ${product.url}`);
  }
  
  // Stats
  lines.push(`Projects: ${product._count?.projects || 0}, Updates: ${product._count?.updates || 0}`);
  
  return lines.join('\n');
}

// Main search handler
export async function handleSearchProducts(params: SearchProductsParams): Promise<string> {
  try {
    // Validate input
    const validatedParams = SearchProductsSchema.parse(params);

    // Build base conditions
    const whereConditions = buildSearchConditions(validatedParams);

    // Handle text search using PostgreSQL Full-Text Search
    if (validatedParams.query && validatedParams.query.trim()) {
      const searchQuery = validatedParams.query.trim();
      
      // Convert query to tsquery format (handle spaces and special chars)
      const tsQuery = searchQuery
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => word.replace(/[^\\w]/g, ''))
        .filter(word => word.length > 0)
        .join(' & ');

      if (tsQuery) {
        // First get products matching text search on name + description
        const searchResults = await prisma.$queryRaw<Array<{id: string}>>`
          SELECT id FROM products 
          WHERE to_tsvector('english', name || ' ' || description) @@ to_tsquery('english', ${tsQuery})
          ORDER BY ts_rank(to_tsvector('english', name || ' ' || description), to_tsquery('english', ${tsQuery})) DESC
          LIMIT 200
        `;

        const productIds = searchResults.map(result => result.id);
        
        if (productIds.length === 0) {
          return "No products found matching your search criteria.";
        }

        // Then apply other filters using Prisma
        const combinedConditions = {
          ...whereConditions,
          id: { in: productIds }
        };

        const products = await prisma.product.findMany({
          where: combinedConditions,
          include: {
            owner: { select: { id: true, name: true } },
            _count: { select: { projects: true, updates: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: validatedParams.limit,
          skip: validatedParams.offset,
        });

        if (products.length === 0) {
          return "No products found matching your search criteria.";
        }

        const results = products.map(formatSearchResult);
        const summary = `Found ${results.length} products matching "${searchQuery}":\n\n`;
        return summary + results.join('\n\n---\n\n');
      }
    }

    // If no text query, do regular filtered search
    const products = await prisma.product.findMany({
      where: whereConditions,
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { projects: true, updates: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: validatedParams.limit,
      skip: validatedParams.offset,
    });

    if (products.length === 0) {
      return "No products found matching your criteria.";
    }

    const results = products.map(formatSearchResult);
    const summary = `Found ${results.length} products:\n\n`;
    return summary + results.join('\n\n---\n\n');

  } catch (error) {
    console.error("Failed to search products:", error);
    throw new Error("An error occurred while searching products.");
  }
}