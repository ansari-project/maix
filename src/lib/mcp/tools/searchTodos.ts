import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canViewTodos } from "@/lib/permissions/todo-permissions";
import type { User } from "@prisma/client";

// Zod schema for todo search parameters
export const SearchTodosSchema = z.object({
  projectId: z.string().optional().describe("Filter todos by project ID"),
  includePersonal: z.boolean().optional().describe("Include personal/standalone todos (todos without a project)"),
  status: z.array(z.enum(["NOT_STARTED", "IN_PROGRESS", "WAITING_FOR", "COMPLETED"])).optional().describe("Filter by todo status"),
  assigneeId: z.string().optional().describe("Filter by assignee user ID"),
  creatorId: z.string().optional().describe("Filter by creator user ID"),
  query: z.string().optional().describe("Search text in title and description"),
  limit: z.number().min(1).max(100).default(20).optional().describe("Maximum number of results"),
  offset: z.number().min(0).default(0).optional().describe("Number of results to skip"),
  dueSoon: z.boolean().optional().describe("Filter todos due within the next 7 days"),
  overdue: z.boolean().optional().describe("Filter overdue todos")
});

export type SearchTodosParams = z.infer<typeof SearchTodosSchema>;

interface Context {
  user: User;
}

export async function handleSearchTodos(params: SearchTodosParams, context: Context): Promise<string> {
  const { user } = context;

  // Build the where clause
  const where: any = {};

  // Apply filters
  if (params.projectId) {
    // Check permissions for the specific project
    const canView = await canViewTodos(user.id, params.projectId);
    if (!canView) {
      throw new Error("You don't have permission to view todos for this project.");
    }
    where.projectId = params.projectId;
  } else {
    // Build OR conditions for projects and personal todos
    const orConditions: any[] = [];

    // Get all projects the user can view todos for
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { 
            applications: {
              some: {
                userId: user.id,
                status: "ACCEPTED"
              }
            }
          }
        ]
      },
      select: { id: true }
    });

    if (userProjects.length > 0) {
      orConditions.push({
        projectId: { in: userProjects.map(p => p.id) }
      });
    }

    // Include personal todos if requested
    if (params.includePersonal) {
      orConditions.push({
        projectId: null,
        creatorId: user.id
      });
    }

    if (orConditions.length === 0) {
      return "No todos found - you don't have access to any projects and personal todos were not requested.";
    }

    where.OR = orConditions;
  }

  if (params.status && params.status.length > 0) {
    where.status = { in: params.status };
  }

  if (params.assigneeId) {
    where.assigneeId = params.assigneeId;
  }

  if (params.creatorId) {
    where.creatorId = params.creatorId;
  }

  if (params.query) {
    where.OR = [
      { title: { contains: params.query, mode: 'insensitive' } },
      { description: { contains: params.query, mode: 'insensitive' } }
    ];
  }

  // Handle date filters
  const now = new Date();
  if (params.dueSoon) {
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    where.dueDate = {
      gte: now,
      lte: nextWeek
    };
  }

  if (params.overdue) {
    where.dueDate = {
      lt: now
    };
    // Overdue todos should not be completed
    where.status = { not: "COMPLETED" };
  }

  const todos = await prisma.todo.findMany({
    where,
    include: {
      creator: { select: { name: true, email: true } },
      assignee: { select: { name: true, email: true } },
      project: { select: { name: true } }
    },
    orderBy: [
      { dueDate: "asc" },
      { status: "asc" },
      { createdAt: "desc" }
    ],
    take: params.limit || 20,
    skip: params.offset || 0
  });

  if (todos.length === 0) {
    let message = "No todos found";
    if (params.query) message += ` matching "${params.query}"`;
    if (params.status) message += ` with status ${params.status.join(", ")}`;
    if (params.dueSoon) message += " due soon";
    if (params.overdue) message += " that are overdue";
    return message + ".";
  }

  const todoList = todos.map(todo => {
    const assigneeText = todo.assignee 
      ? ` (${todo.assignee.name || todo.assignee.email})`
      : " (unassigned)";
    
    const dueDateText = todo.dueDate ? ` - Due: ${todo.dueDate.toLocaleDateString()}` : "";
    
    let statusIcon = "⭕";
    if (todo.status === "COMPLETED") statusIcon = "✅";
    else if (todo.status === "IN_PROGRESS") statusIcon = "🔄";
    else if (todo.status === "WAITING_FOR") statusIcon = "⏳";
    
    // Mark overdue todos
    const isOverdue = todo.dueDate && todo.dueDate < now && 
                      todo.status !== "COMPLETED";
    const overdueText = isOverdue ? " 🚨 OVERDUE" : "";
    
    const projectInfo = todo.project?.name 
      ? `Project: ${todo.project.name}`
      : "Personal todo";
    
    return `  ${statusIcon} ${todo.title}${assigneeText}${dueDateText}${overdueText}
    ${projectInfo} | ID: ${todo.id}`;
  }).join("\n");

  const totalText = todos.length === (params.limit || 20) ? ` (showing first ${todos.length})` : "";
  return `Found ${todos.length} todo(s)${totalText}:\n\n${todoList}`;
}

export const searchTodosTool = {
  name: 'maix_search_todos',
  description: `Search todos with advanced filtering options, supporting both project and personal todos.
Examples:
- Search all accessible todos: { }
- Search with personal todos: { "includePersonal": true }
- Search by status: { "status": ["IN_PROGRESS", "WAITING_FOR"] }
- Search overdue todos: { "overdue": true, "includePersonal": true }
- Search by text: { "query": "database", "includePersonal": true }
- Search project todos: { "projectId": "proj123" }`,
  inputSchema: SearchTodosSchema,
  handler: handleSearchTodos,
};