import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TodoStatus } from "@prisma/client";
import { canManageTodos, canViewTodos } from "@/lib/permissions/todo-permissions";
import type { User } from "@prisma/client";

// Zod schema for todo management parameters
export const ManageTodoSchema = z.object({
  action: z.enum(["create", "update", "delete", "get", "list"]).describe("The operation to perform"),
  todoId: z.string().optional().describe("The ID of the todo (required for update, delete, get actions)"),
  projectId: z.string().optional().describe("The ID of the project (required for create and list actions)"),
  title: z.string().min(1).max(255).optional().describe("Todo title"),
  description: z.string().optional().describe("Todo description"),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]).optional().describe("Todo status"),
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
      if (!params.projectId || !params.title) {
        throw new Error("Project ID and title are required for creating a todo.");
      }

      // Check permissions
      const canManage = await canManageTodos(user.id, params.projectId);
      if (!canManage) {
        throw new Error("You don't have permission to create todos for this project.");
      }

      const todo = await prisma.todo.create({
        data: {
          title: params.title,
          description: params.description,
          status: params.status || "OPEN",
          projectId: params.projectId,
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

      return `Todo "${todo.title}" created successfully in project "${todo.project.name}"${assigneeText}${dueDateText}. ID: ${todo.id}`;
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
                          todo.status === "IN_PROGRESS" ? "🔄" : "⭕";
        
        return `  ${statusIcon} ${todo.title}${assigneeText}${dueDateText} [${todo.id}]`;
      }).join("\n");

      return `Todos for project:\n${todoList}`;
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
      const canView = await canViewTodos(user.id, todo.projectId);
      if (!canView) {
        throw new Error("You don't have permission to view this todo.");
      }

      const assigneeText = todo.assignee 
        ? `Assigned to: ${todo.assignee.name || todo.assignee.email}\n`
        : "Assigned to: Unassigned\n";
      
      const dueDateText = todo.dueDate 
        ? `Due Date: ${todo.dueDate.toLocaleDateString()}\n`
        : "Due Date: Not set\n";

      return `Todo Details:
Title: ${todo.title}
Description: ${todo.description || "No description"}
Status: ${todo.status}
${assigneeText}${dueDateText}Project: ${todo.project.name}
Created by: ${todo.creator.name || todo.creator.email}
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
      const canManage = await canManageTodos(user.id, existingTodo.projectId);
      if (!canManage) {
        throw new Error("You don't have permission to update this todo.");
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

      return `Todo "${updatedTodo.title}" updated successfully in project "${updatedTodo.project.name}".`;
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
      const canManage = await canManageTodos(user.id, existingTodo.projectId);
      if (!canManage) {
        throw new Error("You don't have permission to delete this todo.");
      }

      await prisma.todo.delete({
        where: { id: params.todoId }
      });

      return `Todo "${existingTodo.title}" deleted successfully from project "${existingTodo.project.name}".`;
    }

    default:
      throw new Error("Invalid action. Use: create, update, get, list, or delete.");
  }
}