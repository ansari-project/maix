import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HelpType, Prisma } from "@prisma/client";

// Input schema for search projects
export const SearchProjectsSchema = z.object({
  query: z.string().optional(),
  helpType: z.array(z.nativeEnum(HelpType)).optional(),
  ownerId: z.string().optional(),
  isActive: z.boolean().optional(),
  productId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type SearchProjectsParams = z.infer<typeof SearchProjectsSchema>;

// Helper to build search conditions
function buildSearchConditions(params: SearchProjectsParams): Prisma.ProjectWhereInput {
  const conditions: Prisma.ProjectWhereInput = {};

  // Filter by help types
  if (params.helpType && params.helpType.length > 0) {
    conditions.helpType = { in: params.helpType };
  }

  // Filter by owner
  if (params.ownerId) {
    conditions.ownerId = params.ownerId;
  }

  // Filter by active status
  if (params.isActive !== undefined) {
    conditions.isActive = params.isActive;
  }

  // Filter by product
  if (params.productId) {
    conditions.productId = params.productId;
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
function formatSearchResult(project: any): string {
  const lines = [];
  
  // Basic info
  lines.push(`Project: ${project.name} (${project.id})`);
  lines.push(`Owner: ${project.owner?.name || 'Unknown'}`);
  lines.push(`Goal: ${project.goal}`);
  lines.push(`Help Type: ${project.helpType}`);
  lines.push(`Created: ${project.createdAt.toISOString().split('T')[0]}`);
  
  // Description preview (first 200 chars)
  const preview = project.description.length > 200 
    ? project.description.substring(0, 200) + "..."
    : project.description;
  lines.push(`Description: ${preview}`);
  
  // Context info
  if (project.product) {
    lines.push(`Product: ${project.product.name}`);
  }
  if (project.webpage) {
    lines.push(`Webpage: ${project.webpage}`);
  }
  lines.push(`Contact: ${project.contactEmail}`);
  lines.push(`Active: ${project.isActive ? 'Yes' : 'No'}`);
  
  // Stats
  lines.push(`Applications: ${project._count?.applications || 0}, Updates: ${project._count?.updates || 0}`);
  
  return lines.join('\n');
}

// Main search handler
export async function handleSearchProjects(params: SearchProjectsParams): Promise<string> {
  try {
    // Validate input
    const validatedParams = SearchProjectsSchema.parse(params);

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
        // First get projects matching text search on name + description
        const searchResults = await prisma.$queryRaw<Array<{id: string}>>`
          SELECT id FROM projects 
          WHERE to_tsvector('english', name || ' ' || description || COALESCE(' ' || goal, '')) @@ to_tsquery('english', ${tsQuery})
          ORDER BY ts_rank(to_tsvector('english', name || ' ' || description || COALESCE(' ' || goal, '')), to_tsquery('english', ${tsQuery})) DESC
          LIMIT 200
        `;

        const projectIds = searchResults.map(result => result.id);
        
        if (projectIds.length === 0) {
          return "No projects found matching your search criteria.";
        }

        // Then apply other filters using Prisma
        const combinedConditions = {
          ...whereConditions,
          id: { in: projectIds }
        };

        const projects = await prisma.project.findMany({
          where: combinedConditions,
          include: {
            owner: { select: { id: true, name: true } },
            product: { select: { id: true, name: true } },
            _count: { select: { applications: true, updates: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: validatedParams.limit,
          skip: validatedParams.offset,
        });

        if (projects.length === 0) {
          return "No projects found matching your search criteria.";
        }

        const results = projects.map(formatSearchResult);
        const summary = `Found ${results.length} projects matching "${searchQuery}":\n\n`;
        return summary + results.join('\n\n---\n\n');
      }
    }

    // If no text query, do regular filtered search
    const projects = await prisma.project.findMany({
      where: whereConditions,
      include: {
        owner: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        _count: { select: { applications: true, updates: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: validatedParams.limit,
      skip: validatedParams.offset,
    });

    if (projects.length === 0) {
      return "No projects found matching your criteria.";
    }

    const results = projects.map(formatSearchResult);
    const summary = `Found ${results.length} projects:\n\n`;
    return summary + results.join('\n\n---\n\n');

  } catch (error) {
    console.error("Failed to search projects:", error);
    throw new Error("An error occurred while searching projects.");
  }
}