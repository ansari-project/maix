# MAIX MCP Tools Reference

This document provides comprehensive reference documentation for all MAIX MCP (Model Context Protocol) tools, including schemas, examples, and usage patterns.

## Overview

MAIX provides a robust MCP server that enables Claude Code integration with three enhanced tools:
- **`maix_manage_todo`**: Complete todo lifecycle management
- **`maix_search_todos`**: Advanced todo search and filtering  
- **`maix_manage_personal_project`**: Personal project CRUD operations

## Authentication

All MCP tools require authentication via Personal Access Token (PAT):

```bash
# Generate PAT at https://maix.io/settings
claude mcp add maix-platform \
  --transport http \
  --url https://maix.io/api/mcp \
  --header "Authorization: Bearer YOUR_PAT_TOKEN"
```

## Tool: `maix_manage_todo`

Manages todos with full CRUD operations, supporting both project and personal/standalone todos.

### Schema

```typescript
{
  action: "create" | "update" | "delete" | "get" | "list" | "list-standalone"
  todoId?: string          // Required for update, delete, get
  projectId?: string       // Optional for create, required for list
  title?: string           // Todo title (1-255 chars)
  description?: string     // Todo description
  status?: "NOT_STARTED" | "IN_PROGRESS" | "WAITING_FOR" | "COMPLETED"
  assigneeId?: string      // User ID to assign todo to
  dueDate?: string        // ISO date string (YYYY-MM-DD)
}
```

### Actions

#### `create` - Create New Todo

**Project Todo:**
```json
{
  "action": "create",
  "title": "Set up database schema",
  "description": "Create initial database tables for user management",
  "projectId": "proj123",
  "status": "NOT_STARTED",
  "assigneeId": "user456",
  "dueDate": "2024-03-15"
}
```

**Personal Todo:**
```json
{
  "action": "create", 
  "title": "Review React documentation",
  "description": "Study hooks and context API",
  "status": "NOT_STARTED",
  "dueDate": "2024-03-20"
}
```

**Response:**
```
Todo "Set up database schema" created successfully in project "Project Name" assigned to John Doe (due 3/15/2024). ID: abc123
```

#### `list` - List Project Todos

```json
{
  "action": "list",
  "projectId": "proj123"
}
```

**Response:**
```
Todos for project:
  ⭕ Set up database schema (assigned to John Doe) - Due: 3/15/2024 [abc123]
  🔄 Create API endpoints (unassigned) [def456]  
  ✅ Write documentation (assigned to Jane Smith) [ghi789]
```

#### `list-standalone` - List Personal Todos

```json
{
  "action": "list-standalone"
}
```

**Response:**
```
Your standalone personal todos:
  ⭕ Review React documentation (unassigned) - Due: 3/20/2024 [xyz123]
  🔄 Plan weekend project (unassigned) [abc456]
  ⏳ Wait for design feedback (unassigned) [def789]
```

#### `get` - Get Todo Details

```json
{
  "action": "get",
  "todoId": "abc123"
}
```

**Response:**
```
Todo Details:
Title: Set up database schema
Description: Create initial database tables for user management
Status: NOT_STARTED
Assigned to: John Doe
Due Date: 3/15/2024
Project: Project Name
Created by: Jane Smith
Created: 3/1/2024
ID: abc123
```

#### `update` - Update Todo

```json
{
  "action": "update",
  "todoId": "abc123",
  "status": "IN_PROGRESS",
  "assigneeId": "user789",
  "dueDate": "2024-03-25"
}
```

**Response:**
```
Todo "Set up database schema" updated successfully in project "Project Name".
```

#### `delete` - Delete Todo

```json
{
  "action": "delete",
  "todoId": "abc123"
}
```

**Response:**
```
Todo "Set up database schema" deleted successfully from project "Project Name".
```

### Status Icons

| Status | Icon | Meaning |
|--------|------|---------|
| `NOT_STARTED` | ⭕ | Not yet begun |
| `IN_PROGRESS` | 🔄 | Currently active |
| `WAITING_FOR` | ⏳ | Blocked/waiting |
| `COMPLETED` | ✅ | Work finished |

### Permission Model

- **Personal Todos**: Only creator can manage
- **Project Todos**: Project members and accepted volunteers
- **Assignment**: Only valid project members can be assigned
- **Management**: Project admins and todo creators have full access

---

## Tool: `maix_search_todos`

Search and list todos with advanced filtering options, supporting both project and personal todos.

### Schema

```typescript
{
  projectId?: string                    // Filter by specific project
  includePersonal?: boolean            // Include personal/standalone todos
  status?: ("NOT_STARTED" | "IN_PROGRESS" | "WAITING_FOR" | "COMPLETED")[]
  assigneeId?: string                  // Filter by assignee
  creatorId?: string                   // Filter by creator
  query?: string                       // Text search in title/description
  limit?: number                       // Max results (1-100, default 20)
  offset?: number                      // Skip results (default 0)
  dueSoon?: boolean                   // Due within 7 days
  overdue?: boolean                   // Past due date
}
```

### Examples

#### Basic Search with Personal Todos
```json
{
  "includePersonal": true,
  "limit": 10
}
```

**Response:**
```
Found 5 todo(s):

  🔄 Set up CI/CD pipeline (John Doe) - Due: 3/15/2024
    Project: Web Platform | ID: abc123
  ⭕ Review documentation (unassigned)
    Personal todo | ID: def456
  ⏳ Wait for API approval (Jane Smith) - Due: 3/10/2024 🚨 OVERDUE
    Project: Mobile App | ID: ghi789
```

#### Multi-Status Search
```json
{
  "status": ["IN_PROGRESS", "WAITING_FOR"],
  "includePersonal": true,
  "limit": 20
}
```

#### Text Search
```json
{
  "query": "database",
  "includePersonal": true,
  "limit": 5
}
```

#### Overdue Todos
```json
{
  "overdue": true,
  "includePersonal": true
}
```

#### Project-Specific Search
```json
{
  "projectId": "proj123",
  "status": ["NOT_STARTED", "IN_PROGRESS"]
}
```

### Search Features

- **Full-Text Search**: Searches title and description fields
- **Case-Insensitive**: Automatic case-insensitive matching
- **Multi-Status Filtering**: Include multiple status values
- **Date-Based Filters**: Overdue and due soon options
- **Personal Todo Integration**: Seamlessly includes standalone todos
- **Pagination Support**: Limit and offset for large result sets
- **Permission Aware**: Only returns accessible todos

---

## Tool: `maix_manage_personal_project`

Manages personal projects with CRUD operations and sharing capabilities.

### Schema

```typescript
{
  action: "create" | "update" | "delete" | "get" | "list" | "share" | "unshare"
  projectId?: string              // Required for update, delete, get, share, unshare
  name?: string                   // Project name (1-255 chars)
  description?: string            // Project description
  personalCategory?: string       // Category for organization (max 100 chars)
  targetCompletionDate?: string   // ISO date string (YYYY-MM-DD)
  status?: "IN_PROGRESS" | "COMPLETED" | "ON_HOLD"
  shareWithUserId?: string        // User ID to share with (share action)
  unshareUserId?: string         // User ID to unshare from (unshare action)
}
```

### Actions

#### `create` - Create Personal Project

```json
{
  "action": "create",
  "name": "Learn React Native",
  "description": "Build a mobile app to track daily habits and goals",
  "personalCategory": "Learning",
  "targetCompletionDate": "2024-06-01",
  "status": "IN_PROGRESS"
}
```

**Response:**
```
Personal project "Learn React Native" created successfully (Category: Learning) (Target: 6/1/2024). ID: abc123
```

#### `list` - List Personal Projects

```json
{
  "action": "list"
}
```

**Response:**
```
Your personal projects:
  🔄 Learn React Native [Learning] (2 active todos) [abc123]
  ✅ Portfolio Website [Web Development] (shared) (1 member) [def456]
  ⏸️ Mobile Game [Gaming] [ghi789]
```

#### `get` - Get Project Details

```json
{
  "action": "get", 
  "projectId": "abc123"
}
```

**Response:**
```
Personal Project Details:
Name: Learn React Native
Description: Build a mobile app to track daily habits and goals
Status: IN_PROGRESS
Category: Learning
Target Completion: 6/1/2024
Owner: You
Members: John Doe, Jane Smith
Active todos: 2
Created: 2/15/2024
Last updated: 3/1/2024
ID: abc123
```

#### `update` - Update Project

```json
{
  "action": "update",
  "projectId": "abc123",
  "status": "COMPLETED",
  "personalCategory": "Learning - Advanced"
}
```

**Response:**
```
Personal project "Learn React Native" updated successfully.
```

#### `delete` - Delete Project

```json
{
  "action": "delete",
  "projectId": "abc123"
}
```

**Response:**
```
Personal project "Learn React Native" deleted successfully (2 todos converted to standalone personal todos).
```

#### `share` - Share Project

```json
{
  "action": "share",
  "projectId": "abc123",
  "shareWithUserId": "user456"
}
```

**Response:**
```
Personal project "Learn React Native" shared successfully with John Doe.
```

#### `unshare` - Remove Project Access

```json
{
  "action": "unshare",
  "projectId": "abc123", 
  "unshareUserId": "user456"
}
```

**Response:**
```
Personal project "Learn React Native" unshared from John Doe.
```

### Project Status Icons

| Status | Icon | Description |
|--------|------|-------------|
| `IN_PROGRESS` | 🔄 | Actively working |
| `COMPLETED` | ✅ | Project finished |
| `ON_HOLD` | ⏸️ | Temporarily paused |

### Features

- **Category Organization**: Free-form categories for personal organization
- **Sharing System**: Share projects with collaborators while maintaining ownership
- **Todo Integration**: Associates with project todos, orphans on deletion
- **Progress Tracking**: Track active todos and completion status
- **Member Management**: View shared members and manage access

---

## Usage Patterns

### Daily Workflow

```bash
# Morning check-in
"Show me all my personal todos"
"Search for todos with status IN_PROGRESS including personal"

# Create new work
"Create a personal todo: Review PR feedback, status NOT_STARTED, due tomorrow"
"Create todo for project xyz123: Update documentation"

# Update progress  
"Update todo abc123 status to WAITING_FOR"
"List todos for project xyz123"
```

### Project Management

```bash
# Project setup
"Create personal project: Learn TypeScript with category Programming"
"Create todo for personal project abc123: Set up development environment"
"Create todo for personal project abc123: Complete basic tutorial"

# Progress tracking
"Get personal project abc123 details"
"Search todos in personal project abc123 with status COMPLETED"

# Collaboration
"Share personal project abc123 with user456"
"List all personal projects"
```

### Weekly Reviews

```bash
# Status overview
"Search for overdue todos including personal ones"
"Search todos with status COMPLETED from last week"

# Planning
"Create personal project: Q2 Learning Goals with category Professional Development"
"Update personal project abc123 status to ON_HOLD"
```

## Error Handling

### Common Error Responses

**Permission Denied:**
```
Error: You don't have permission to view this todo.
```

**Invalid Status:**
```  
Error: Invalid status. Use: NOT_STARTED, IN_PROGRESS, WAITING_FOR, or COMPLETED.
```

**Missing Required Field:**
```
Error: Title is required for creating a todo.
```

**Resource Not Found:**
```
Error: Todo not found.
```

## Testing

Use the automated test suite to validate MCP functionality:

```bash
# Run comprehensive MCP tests
node scripts/test-enhanced-mcp.js

# Expected output:
# 🎉 All enhanced MCP features are working correctly!
# 📊 Test Results: 20 passed, 0 failed
```

## Rate Limits

- **Requests per minute**: 60 per PAT token
- **Bulk operations**: Max 100 items per request  
- **Search results**: Max 100 results per query
- **Concurrent requests**: Max 10 simultaneous requests

## Security Considerations

- **Token Security**: Store PAT tokens securely, rotate regularly
- **Permission Model**: All operations validate user permissions
- **Input Validation**: All inputs validated via Zod schemas
- **SQL Injection Prevention**: Prisma ORM provides built-in protection
- **Data Isolation**: Personal todos only accessible by creator

## Troubleshooting

### MCP Connection Issues

**Tools Not Available:**
```bash
# Check MCP configuration
claude mcp list maix-platform

# Re-add if needed
claude mcp remove maix-platform
claude mcp add maix-platform --transport http --url https://maix.io/api/mcp --header "Authorization: Bearer NEW_TOKEN"
```

**Authentication Errors:**
- Verify PAT token is valid and not expired
- Check token has required scopes in MAIX settings
- Ensure proper Authorization header format

**Permission Denied:**
- Confirm project membership for project todos
- Verify ownership for personal todos and projects
- Check if PAT token was generated by correct user

### Search Issues  

**No Results Found:**
- Include `includePersonal: true` for standalone todos
- Verify status filters match your todo statuses
- Check project membership for project-based searches

**Performance Issues:**
- Use specific filters to reduce result set size
- Implement pagination for large datasets
- Consider caching frequently accessed data

This comprehensive reference provides all necessary information for effectively using MAIX MCP tools with Claude Code integration.