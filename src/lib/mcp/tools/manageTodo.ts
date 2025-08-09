import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TodoStatus } from "@prisma/client";
import { canManageTodos, canViewTodos } from "@/lib/permissions/todo-permissions";
import type { User } from "@prisma/client";

// Zod schema for todo management parameters
export const ManageTodoSchema = z.object({
  action: z.enum(["create", "update", "delete", "get", "list", "list-standalone"]).describe("The operation to perform"),
  todoId: z.string().optional().describe("The ID of the todo (required for update, delete, get actions)"),
  projectId: z.string().optional().describe("The ID of the project (optional for create, required for list actions - use list-standalone for personal todos)"),
  title: z.string().min(1).max(255).optional().describe("Todo title"),
  description: z.string().optional().describe("Todo description"),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "WAITING_FOR", "COMPLETED"]).optional().describe("Todo status"),
  assigneeId: z.string().nullable().optional().describe("ID of user to assign the todo to"),
  dueDate: z.string().optional().describe("Due date in ISO format (YYYY-MM-DD)")
});

export type ManageTodoParams = z.infer<typeof ManageTodoSchema>;

interface Context {
  user: User;
}

export async function handleManageTodo(params: ManageTodoParams, context: Context): Promise<string> {
  const { user } = context;

  switch (params.action) {
    case "create": {
      if (!params.title) {
        throw new Error("Title is required for creating a todo.");
      }

      // Check permissions for project todos
      if (params.projectId) {
        const canManage = await canManageTodos(user.id, params.projectId);
        if (!canManage) {
          throw new Error("You don't have permission to create todos for this project.");
        }
      }
      // For standalone/personal todos, user can always create their own

      const todo = await prisma.todo.create({
        data: {
          title: params.title,
          description: params.description,
          status: params.status || "NOT_STARTED",
          projectId: params.projectId || null,
          creatorId: user.id,
          assigneeId: params.assigneeId || null,
          dueDate: params.dueDate ? new Date(params.dueDate) : null,
        },
        include: {
          creator: { select: { name: true, email: true } },
          assignee: { select: { name: true, email: true } },
          project: { select: { name: true } }
        }
      });

      const assigneeText = todo.assignee 
        ? ` assigned to ${todo.assignee.name || todo.assignee.email}`
        : " (unassigned)";
      
      const dueDateText = todo.dueDate 
        ? ` (due ${todo.dueDate.toLocaleDateString()})`
        : "";

      const projectText = todo.project?.name 
        ? ` in project "${todo.project.name}"`
        : " as personal todo";
      
      return `Todo "${todo.title}" created successfully${projectText}${assigneeText}${dueDateText}. ID: ${todo.id}`;
    }

    case "list": {
      if (!params.projectId) {
        throw new Error("Project ID is required for listing todos.");
      }

      // Check permissions
      const canView = await canViewTodos(user.id, params.projectId);
      if (!canView) {
        throw new Error("You don't have permission to view todos for this project.");
      }

      const todos = await prisma.todo.findMany({
        where: { projectId: params.projectId },
        include: {
          creator: { select: { name: true, email: true } },
          assignee: { select: { name: true, email: true } },
        },
        orderBy: [
          { status: "asc" },
          { createdAt: "desc" }
        ]
      });

      if (todos.length === 0) {
        return "No todos found for this project.";
      }

      const todoList = todos.map(todo => {
        const assigneeText = todo.assignee 
          ? ` (assigned to ${todo.assignee.name || todo.assignee.email})`
          : " (unassigned)";
        
        const dueDateText = todo.dueDate 
          ? ` - Due: ${todo.dueDate.toLocaleDateString()}`
          : "";
        
        const statusIcon = todo.status === "COMPLETED" ? "✅" : 
                          todo.status === "IN_PROGRESS" ? "🔄" : 
                          todo.status === "WAITING_FOR" ? "⏳" : "⭕";
        
        return `  ${statusIcon} ${todo.title}${assigneeText}${dueDateText} [${todo.id}]`;
      }).join("\n");

      return `Todos for project:\n${todoList}`;
    }

    case "list-standalone": {
      const todos = await prisma.todo.findMany({
        where: { 
          creatorId: user.id,
          projectId: null // Standalone todos have no project
        },
        include: {
          creator: { select: { name: true, email: true } },
          assignee: { select: { name: true, email: true } },
        },
        orderBy: [
          { status: "asc" },
          { createdAt: "desc" }
        ]
      });

      if (todos.length === 0) {
        return "No standalone personal todos found.";
      }

      const todoList = todos.map(todo => {
        const assigneeText = todo.assignee 
          ? ` (assigned to ${todo.assignee.name || todo.assignee.email})`
          : " (unassigned)";
        
        const dueDateText = todo.dueDate 
          ? ` - Due: ${todo.dueDate.toLocaleDateString()}`
          : "";
        
        const statusIcon = todo.status === "COMPLETED" ? "✅" : 
                          todo.status === "IN_PROGRESS" ? "🔄" : 
                          todo.status === "WAITING_FOR" ? "⏳" : "⭕";
        
        return `  ${statusIcon} ${todo.title}${assigneeText}${dueDateText} [${todo.id}]`;
      }).join("\n");

      return `Your standalone personal todos:\n${todoList}`;
    }

    case "get": {
      if (!params.todoId) {
        throw new Error("Todo ID is required.");
      }

      const todo = await prisma.todo.findUnique({
        where: { id: params.todoId },
        include: {
          creator: { select: { name: true, email: true } },
          assignee: { select: { name: true, email: true } },
          project: { select: { name: true, ownerId: true } }
        }
      });

      if (!todo) {
        throw new Error("Todo not found.");
      }

      // Check permissions
      if (todo.projectId) {
        // Project todo - check project permissions
        const canView = await canViewTodos(user.id, todo.projectId);
        if (!canView) {
          throw new Error("You don't have permission to view this todo.");
        }
      } else {
        // Standalone personal todo - only creator can view
        if (todo.creatorId !== user.id) {
          throw new Error("You don't have permission to view this personal todo.");
        }
      }

      const assigneeText = todo.assignee 
        ? `Assigned to: ${todo.assignee.name || todo.assignee.email}\n`
        : "Assigned to: Unassigned\n";
      
      const dueDateText = todo.dueDate 
        ? `Due Date: ${todo.dueDate.toLocaleDateString()}\n`
        : "Due Date: Not set\n";

      const projectText = todo.project?.name 
        ? `Project: ${todo.project.name}\n`
        : "Type: Personal todo\n";

      return `Todo Details:
Title: ${todo.title}
Description: ${todo.description || "No description"}
Status: ${todo.status}
${assigneeText}${dueDateText}${projectText}Created by: ${todo.creator.name || todo.creator.email}
Created: ${todo.createdAt.toLocaleDateString()}
ID: ${todo.id}`;
    }

    case "update": {
      if (!params.todoId) {
        throw new Error("Todo ID is required for updates.");
      }

      // First, get the todo to check permissions
      const existingTodo = await prisma.todo.findUnique({
        where: { id: params.todoId },
        include: { project: true }
      });

      if (!existingTodo) {
        throw new Error("Todo not found.");
      }

      // Check permissions
      if (existingTodo.projectId) {
        // Project todo - check project permissions
        const canManage = await canManageTodos(user.id, existingTodo.projectId);
        if (!canManage) {
          throw new Error("You don't have permission to update this todo.");
        }
      } else {
        // Standalone personal todo - only creator can update
        if (existingTodo.creatorId !== user.id) {
          throw new Error("You don't have permission to update this personal todo.");
        }
      }

      const updateData: any = {};
      if (params.title) updateData.title = params.title;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.status) updateData.status = params.status as TodoStatus;
      if (params.assigneeId !== undefined) updateData.assigneeId = params.assigneeId;
      if (params.dueDate !== undefined) {
        updateData.dueDate = params.dueDate ? new Date(params.dueDate) : null;
      }

      const updatedTodo = await prisma.todo.update({
        where: { id: params.todoId },
        data: updateData,
        include: {
          assignee: { select: { name: true, email: true } },
          project: { select: { name: true } }
        }
      });

      const projectText = updatedTodo.project?.name 
        ? ` in project "${updatedTodo.project.name}"`
        : " (personal todo)";
      return `Todo "${updatedTodo.title}" updated successfully${projectText}.`;
    }

    case "delete": {
      if (!params.todoId) {
        throw new Error("Todo ID is required for deletion.");
      }

      // First, get the todo to check permissions
      const existingTodo = await prisma.todo.findUnique({
        where: { id: params.todoId },
        include: { project: true }
      });

      if (!existingTodo) {
        throw new Error("Todo not found.");
      }

      // Check permissions
      if (existingTodo.projectId) {
        // Project todo - check project permissions
        const canManage = await canManageTodos(user.id, existingTodo.projectId);
        if (!canManage) {
          throw new Error("You don't have permission to delete this todo.");
        }
      } else {
        // Standalone personal todo - only creator can delete
        if (existingTodo.creatorId !== user.id) {
          throw new Error("You don't have permission to delete this personal todo.");
        }
      }

      await prisma.todo.delete({
        where: { id: params.todoId }
      });

      const projectText = existingTodo.project?.name 
        ? ` from project "${existingTodo.project.name}"`
        : " (personal todo)";
      return `Todo "${existingTodo.title}" deleted successfully${projectText}.`;
    }

    default:
      throw new Error("Invalid action. Use: create, update, get, list, list-standalone, or delete.");
  }
}

export const manageTodoTool = {
  name: 'maix_manage_todo',
  description: `Manages todos with full CRUD operations, supporting both project and personal/standalone todos.
Examples:
- Create project todo: 
  { 
    "action": "create",
    "title": "Set up database schema",
    "description": "Create initial database tables for user management",
    "projectId": "proj123",
    "status": "NOT_STARTED",
    "dueDate": "2024-03-15"
  }
- Create personal todo: 
  { 
    "action": "create",
    "title": "Review React documentation",
    "description": "Study hooks and context API",
    "status": "NOT_STARTED"
  }
- List personal todos: { "action": "list-standalone" }
- Update todo status: { "action": "update", "todoId": "todo123", "status": "IN_PROGRESS" }
- Get todo details: { "action": "get", "todoId": "todo123" }`,
  inputSchema: ManageTodoSchema,
  handler: handleManageTodo,
};