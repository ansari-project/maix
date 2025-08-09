# MAIX API Reference

This document provides comprehensive reference documentation for all MAIX API endpoints, including request/response schemas, authentication requirements, and usage examples.

## Overview

MAIX provides a RESTful API with the following base URLs:
- **Development**: `http://localhost:3000/api`
- **Production**: `https://maix.io/api`

All API endpoints use JSON for request and response payloads unless otherwise specified.

## Authentication

MAIX uses NextAuth.js for session-based authentication and Personal Access Tokens (PAT) for API access.

### Session Authentication
Most web API endpoints require user authentication via NextAuth.js sessions:

```javascript
// Automatically handled by NextAuth.js in browser sessions
// No additional headers required for authenticated pages
```

### Personal Access Token (PAT) Authentication
API endpoints and MCP tools require PAT authentication:

```http
Authorization: Bearer maix_pat_your_token_here
```

**Generate PAT tokens at**: `/settings` → API Tokens section

## Core Endpoints

### Authentication Endpoints

#### POST `/api/auth/signup`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "username": "johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "johndoe"
  }
}
```

### Profile Management

#### GET `/api/profile`
Get current user profile information.

**Headers:** Requires session authentication

**Response:**
```json
{
  "id": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "username": "johndoe",
  "bio": "Full-stack developer passionate about AI",
  "skills": ["React", "Node.js", "Python"],
  "experienceLevel": "SENIOR",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### PUT `/api/profile`
Update user profile information.

**Headers:** Requires session authentication

**Request Body:**
```json
{
  "name": "John Smith",
  "bio": "Updated bio",
  "skills": ["React", "TypeScript", "Python", "AI/ML"],
  "experienceLevel": "SENIOR"
}
```

## Enhanced Todo System API

### Todo Management

#### GET `/api/todos/my-tasks`
Retrieve grouped tasks for the authenticated user with enhanced status support.

**Headers:** Requires session authentication

**Query Parameters:**
- `includePersonal` (boolean): Include standalone personal todos
- `status` (array): Filter by status values (`NOT_STARTED`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR`, `COMPLETED`, `DONE`)
- `groupBy` (string): Group by `project`, `status`, or `assignee`

**Response:**
```json
{
  "groups": [
    {
      "groupKey": "project-id-123",
      "groupName": "AI Chatbot Project",
      "project": {
        "id": "project-id-123",
        "name": "AI Chatbot Project",
        "isPersonal": false
      },
      "tasks": [
        {
          "id": "todo-456",
          "title": "Implement natural language processing",
          "description": "Add NLP capabilities using Claude API",
          "status": "IN_PROGRESS",
          "dueDate": "2024-03-15",
          "assignee": {
            "id": "user789",
            "name": "Jane Smith",
            "email": "jane@example.com"
          },
          "creator": {
            "id": "user123",
            "name": "John Doe"
          },
          "createdAt": "2024-03-01T10:00:00Z",
          "updatedAt": "2024-03-05T15:30:00Z"
        }
      ],
      "counts": {
        "NOT_STARTED": 2,
        "IN_PROGRESS": 1,
        "WAITING_FOR": 0,
        "COMPLETED": 3,
        "DONE": 1,
        "total": 7
      }
    },
    {
      "groupKey": "personal",
      "groupName": "Personal Tasks",
      "project": null,
      "tasks": [
        {
          "id": "todo-789",
          "title": "Review React 18 documentation",
          "description": "Study new concurrent features",
          "status": "NOT_STARTED",
          "dueDate": null,
          "assignee": null,
          "creator": {
            "id": "user123",
            "name": "John Doe"
          },
          "createdAt": "2024-03-08T09:00:00Z",
          "updatedAt": "2024-03-08T09:00:00Z"
        }
      ],
      "counts": {
        "NOT_STARTED": 1,
        "IN_PROGRESS": 0,
        "WAITING_FOR": 0,
        "COMPLETED": 0,
        "DONE": 0,
        "total": 1
      }
    }
  ]
}
```

#### POST `/api/todos/standalone`
Create a standalone personal todo (not associated with any project).

**Headers:** Requires session authentication

**Request Body:**
```json
{
  "title": "Review new TypeScript features",
  "description": "Study TypeScript 5.0 new capabilities",
  "status": "NOT_STARTED",
  "dueDate": "2024-03-20"
}
```

**Response:**
```json
{
  "id": "todo-abc123",
  "title": "Review new TypeScript features",
  "description": "Study TypeScript 5.0 new capabilities",
  "status": "NOT_STARTED",
  "dueDate": "2024-03-20",
  "projectId": null,
  "assignee": null,
  "creator": {
    "id": "user123",
    "name": "John Doe"
  },
  "createdAt": "2024-03-08T14:30:00Z",
  "updatedAt": "2024-03-08T14:30:00Z"
}
```

#### PUT `/api/todos/[todoId]`
Update an existing todo (project or personal).

**Headers:** Requires session authentication

**Path Parameters:**
- `todoId`: ID of the todo to update

**Request Body:**
```json
{
  "title": "Updated todo title",
  "description": "Updated description",
  "status": "IN_PROGRESS",
  "assigneeId": "user789",
  "dueDate": "2024-03-25"
}
```

**Response:**
```json
{
  "id": "todo-456",
  "title": "Updated todo title",
  "description": "Updated description",
  "status": "IN_PROGRESS",
  "dueDate": "2024-03-25",
  "assignee": {
    "id": "user789",
    "name": "Jane Smith"
  },
  "updatedAt": "2024-03-08T16:45:00Z"
}
```

#### PUT `/api/todos/[todoId]/status`
Update only the status of a todo (optimized endpoint).

**Headers:** Requires session authentication

**Path Parameters:**
- `todoId`: ID of the todo to update

**Request Body:**
```json
{
  "status": "COMPLETED"
}
```

**Response:**
```json
{
  "id": "todo-456",
  "status": "COMPLETED",
  "updatedAt": "2024-03-08T17:00:00Z"
}
```

#### DELETE `/api/todos/[todoId]`
Delete a todo (requires appropriate permissions).

**Headers:** Requires session authentication

**Path Parameters:**
- `todoId`: ID of the todo to delete

**Response:**
```json
{
  "success": true,
  "message": "Todo deleted successfully"
}
```

### Personal Project Management

#### GET `/api/projects/personal`
List personal projects for the authenticated user.

**Headers:** Requires session authentication

**Response:**
```json
{
  "projects": [
    {
      "id": "project-abc123",
      "name": "Learn React Native",
      "description": "Build a mobile app to track daily habits",
      "personalCategory": "Learning",
      "status": "IN_PROGRESS",
      "targetCompletionDate": "2024-06-01",
      "isPersonal": true,
      "isShared": false,
      "memberCount": 1,
      "todoCount": 5,
      "activeTodoCount": 2,
      "createdAt": "2024-02-15T08:00:00Z",
      "updatedAt": "2024-03-01T12:30:00Z"
    },
    {
      "id": "project-def456",
      "name": "Portfolio Website Redesign",
      "description": "Modernize personal portfolio with Next.js",
      "personalCategory": "Web Development",
      "status": "COMPLETED",
      "targetCompletionDate": "2024-02-28",
      "isPersonal": true,
      "isShared": true,
      "memberCount": 3,
      "todoCount": 8,
      "activeTodoCount": 0,
      "createdAt": "2024-01-10T10:00:00Z",
      "updatedAt": "2024-02-28T18:45:00Z"
    }
  ]
}
```

#### POST `/api/projects/personal`
Create a new personal project.

**Headers:** Requires session authentication

**Request Body:**
```json
{
  "name": "Learn Machine Learning",
  "description": "Complete Andrew Ng's ML course and build projects",
  "personalCategory": "Education",
  "status": "IN_PROGRESS",
  "targetCompletionDate": "2024-08-31"
}
```

**Response:**
```json
{
  "id": "project-ghi789",
  "name": "Learn Machine Learning",
  "description": "Complete Andrew Ng's ML course and build projects",
  "personalCategory": "Education",
  "status": "IN_PROGRESS",
  "targetCompletionDate": "2024-08-31",
  "isPersonal": true,
  "isShared": false,
  "ownerId": "user123",
  "createdAt": "2024-03-08T20:15:00Z",
  "updatedAt": "2024-03-08T20:15:00Z"
}
```

#### GET `/api/projects/personal/categories`
Get list of personal project categories used by the current user.

**Headers:** Requires session authentication

**Response:**
```json
{
  "categories": [
    "Learning",
    "Web Development", 
    "Education",
    "Side Projects",
    "Open Source",
    "Career Development"
  ]
}
```

### Project Todo Management

#### GET `/api/projects/[id]/todos`
List todos for a specific project.

**Headers:** Requires session authentication

**Path Parameters:**
- `id`: Project ID

**Query Parameters:**
- `status` (array): Filter by status values
- `assigneeId` (string): Filter by assignee
- `limit` (number): Maximum results (default: 50)
- `offset` (number): Skip results for pagination (default: 0)

**Response:**
```json
{
  "todos": [
    {
      "id": "todo-123",
      "title": "Set up development environment",
      "description": "Configure local dev setup with Docker",
      "status": "COMPLETED",
      "dueDate": "2024-03-10",
      "assignee": {
        "id": "user456",
        "name": "Bob Wilson",
        "email": "bob@example.com"
      },
      "creator": {
        "id": "user123",
        "name": "John Doe"
      },
      "createdAt": "2024-03-01T09:00:00Z",
      "updatedAt": "2024-03-10T16:20:00Z"
    }
  ],
  "totalCount": 12,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### POST `/api/projects/[id]/todos`
Create a new todo for a project.

**Headers:** Requires session authentication

**Path Parameters:**
- `id`: Project ID

**Request Body:**
```json
{
  "title": "Implement user authentication",
  "description": "Add login/logout functionality using NextAuth.js",
  "status": "NOT_STARTED",
  "assigneeId": "user789",
  "dueDate": "2024-03-25"
}
```

**Response:**
```json
{
  "id": "todo-new456",
  "title": "Implement user authentication",
  "description": "Add login/logout functionality using NextAuth.js",
  "status": "NOT_STARTED",
  "projectId": "project123",
  "assignee": {
    "id": "user789",
    "name": "Alice Johnson"
  },
  "creator": {
    "id": "user123",
    "name": "John Doe"
  },
  "dueDate": "2024-03-25",
  "createdAt": "2024-03-08T21:30:00Z",
  "updatedAt": "2024-03-08T21:30:00Z"
}
```

## Status Codes and Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created successfully  
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (validation errors)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {
      "field": "title",
      "issue": "Title is required and must be 1-255 characters"
    }
  }
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED` - User must be logged in
- `AUTHORIZATION_FAILED` - Insufficient permissions  
- `VALIDATION_ERROR` - Request validation failed
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `DUPLICATE_RESOURCE` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Enhanced Todo Status Values

The enhanced todo system supports 6 status values:

| Status | Description | Usage |
|--------|-------------|-------|
| `NOT_STARTED` | Task created but not yet begun | Default for new tasks |
| `OPEN` | Task ready to be worked on | Legacy status (same as NOT_STARTED) |
| `IN_PROGRESS` | Currently being worked on | Active development |
| `WAITING_FOR` | Blocked waiting for external input | Dependencies, reviews, approvals |
| `COMPLETED` | Task finished and delivered | Work done, ready for review |
| `DONE` | Task fully complete and accepted | Final state, reviewed and approved |

## Permission Model

### Todo Permissions
- **Personal Todos**: Only the creator can view, edit, or delete
- **Project Todos**: Project members and accepted volunteers can view
- **Management**: Project admins and todo creators can manage (create, update, delete)
- **Assignment**: Only valid project members can be assigned to todos

### Personal Project Permissions  
- **Ownership**: Creator has full control over personal projects
- **Sharing**: Owners can share projects with other users
- **Member Access**: Shared members can view project and contribute to todos
- **Deletion**: Only owner can delete personal projects

## Rate Limiting

API endpoints have the following rate limits:

- **Authenticated requests**: 1000 requests per hour per user
- **Unauthenticated requests**: 100 requests per hour per IP
- **Search endpoints**: 60 requests per minute per user  
- **MCP endpoints**: 60 requests per minute per PAT token

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1709856000
```

## Pagination

List endpoints support cursor-based pagination:

**Query Parameters:**
- `limit`: Number of results (1-100, default 20)
- `offset`: Number of results to skip (default 0)

**Response includes pagination metadata:**
```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "totalCount": 156,
    "hasMore": true
  }
}
```

## Webhook Support

MAIX supports webhooks for real-time notifications of todo and project changes:

### Available Events
- `todo.created` - New todo created
- `todo.updated` - Todo status or details changed
- `todo.deleted` - Todo deleted
- `project.shared` - Personal project shared
- `project.updated` - Project details changed

### Webhook Payload Example
```json
{
  "event": "todo.updated",
  "timestamp": "2024-03-08T22:00:00Z",
  "data": {
    "todo": {
      "id": "todo-123",
      "title": "Updated todo",
      "status": "COMPLETED",
      "projectId": "project-456"
    },
    "changes": {
      "status": {
        "from": "IN_PROGRESS",
        "to": "COMPLETED"
      }
    }
  }
}
```

## SDKs and Libraries

### JavaScript/TypeScript SDK
```bash
npm install @maix/api-client
```

```javascript
import { MaixClient } from '@maix/api-client';

const client = new MaixClient({
  baseUrl: 'https://maix.io/api',
  token: 'your-pat-token'
});

// Create a personal todo
const todo = await client.todos.createStandalone({
  title: 'Learn GraphQL',
  status: 'NOT_STARTED'
});

// List personal projects
const projects = await client.projects.listPersonal();
```

### MCP Integration
Use the MCP tools for Claude Code integration:

```bash
claude mcp add maix-platform \
  --transport http \
  --url https://maix.io/api/mcp \
  --header "Authorization: Bearer YOUR_PAT_TOKEN"
```

See [MCP Tools Reference](../guides/mcp-tools-reference.md) for detailed usage.

## Examples and Use Cases

### Daily Task Management Workflow
```javascript
// Morning: Get all active tasks
const tasks = await fetch('/api/todos/my-tasks?includePersonal=true&status[]=IN_PROGRESS&status[]=NOT_STARTED');

// Create a quick personal todo
await fetch('/api/todos/standalone', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Review PR #123',
    status: 'NOT_STARTED',
    dueDate: '2024-03-09'
  })
});

// Update task status
await fetch('/api/todos/task-456/status', {
  method: 'PUT', 
  body: JSON.stringify({ status: 'COMPLETED' })
});
```

### Personal Project Management
```javascript
// Create a learning project
const project = await fetch('/api/projects/personal', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Master Kubernetes',
    personalCategory: 'DevOps Learning',
    targetCompletionDate: '2024-12-31'
  })
});

// Add todos to the project
await fetch(`/api/projects/${project.id}/todos`, {
  method: 'POST',
  body: JSON.stringify({
    title: 'Complete CKA certification course',
    status: 'NOT_STARTED'
  })
});
```

This API reference provides comprehensive documentation for integrating with MAIX's enhanced todo system and personal project management features.