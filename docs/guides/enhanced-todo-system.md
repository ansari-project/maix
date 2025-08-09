# Enhanced Todo System Guide

The Enhanced Todo System in MAIX provides comprehensive task management capabilities for both project-based and personal workflows. This guide covers all features, usage patterns, and API capabilities.

## Overview

The enhanced todo system supports:
- **6-Value Status Workflow**: `NOT_STARTED` → `OPEN` → `IN_PROGRESS` → `WAITING_FOR` → `COMPLETED` → `DONE`
- **Personal/Standalone Todos**: Tasks not tied to any project
- **Project-Based Todos**: Tasks within collaborative projects
- **Advanced Search**: Filter by status, assignments, due dates, and text
- **MCP Integration**: Full API access via Claude Code CLI

## Core Concepts

### Todo Status Values

| Status | Icon | Description | When to Use |
|--------|------|-------------|-------------|
| `NOT_STARTED` | ⭕ | Task created but not yet begun | Initial state for planned tasks |
| `OPEN` | 🔵 | Task ready to be worked on | Legacy status, same as NOT_STARTED |
| `IN_PROGRESS` | 🔄 | Currently being worked on | Active development/execution |
| `WAITING_FOR` | ⏳ | Blocked waiting for external input | Dependencies, reviews, approvals |
| `COMPLETED` | ✅ | Task finished and delivered | Work done, ready for review |
| `DONE` | ✅ | Task fully complete and accepted | Final state, accepted/approved |

### Todo Types

#### Personal/Standalone Todos
- Not associated with any project
- Only visible to the creator
- Perfect for personal task management
- Can be created via UI or MCP tools

#### Project-Based Todos
- Associated with a specific project
- Visible to project members and volunteers
- Support assignment to team members
- Collaborative task management

## User Interface Features

### My Tasks Kanban View
- **Drag-and-Drop**: Move tasks between status columns
- **Project Grouping**: Tasks organized by project
- **Quick Actions**: Create tasks inline, update status
- **Visual Indicators**: Icons, due dates, assignments

### Standalone Tasks Tab
- **Personal Focus**: View only your personal todos
- **Simple Management**: Create, edit, delete personal tasks
- **Status Filtering**: Filter by completion status

### Personal Projects
- **Project Creation**: Create personal projects with categories
- **Task Association**: Link todos to personal projects
- **Sharing**: Share personal projects with collaborators
- **Progress Tracking**: Monitor project completion

## API Endpoints

### Todo Management API

#### GET `/api/todos/my-tasks`
Retrieve grouped tasks for the authenticated user.

**Query Parameters:**
- `includePersonal` (boolean): Include standalone todos
- `status` (array): Filter by status values
- `groupBy` (string): Group tasks by `project`, `status`, or `assignee`

**Response:**
```json
{
  "groups": [
    {
      "groupKey": "project-id-or-personal",
      "groupName": "Project Name or Personal",
      "project": { /* project details */ },
      "tasks": [
        {
          "id": "task-id",
          "title": "Task Title",
          "status": "IN_PROGRESS",
          "dueDate": "2024-03-15",
          "assignee": { "name": "John Doe" },
          "project": { "name": "Project Name" }
        }
      ],
      "counts": {
        "NOT_STARTED": 2,
        "IN_PROGRESS": 1,
        "COMPLETED": 3,
        "total": 6
      }
    }
  ]
}
```

#### POST `/api/todos/standalone`
Create a standalone personal todo.

**Request Body:**
```json
{
  "title": "Review documentation",
  "description": "Review the new API documentation",
  "status": "NOT_STARTED",
  "dueDate": "2024-03-20"
}
```

#### PUT `/api/todos/[id]`
Update an existing todo.

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "assigneeId": "user-id"
}
```

### Personal Projects API

#### GET `/api/projects/personal`
List personal projects for the authenticated user.

#### POST `/api/projects/personal`
Create a new personal project.

**Request Body:**
```json
{
  "name": "Learn React Native",
  "description": "Build a mobile app for habit tracking",
  "personalCategory": "Learning",
  "targetCompletionDate": "2024-06-01",
  "status": "IN_PROGRESS"
}
```

## MCP (Model Context Protocol) Integration

### Available MCP Tools

The enhanced todo system provides three powerful MCP tools for Claude Code integration:

#### 1. `maix_manage_todo`
Complete CRUD operations for todos with enhanced status support.

**Examples:**
```bash
# Create a personal todo
"Create a personal todo: Review React 18 documentation with status NOT_STARTED"

# Create a project todo  
"Create a todo for project abc123: Set up CI/CD pipeline, assign to john@example.com"

# Update todo status
"Update todo def456 status to WAITING_FOR"

# List standalone todos
"Show me all my personal todos"
```

**Actions:**
- `create`: Create new todos (project or personal)
- `update`: Update title, description, status, assignment, due date
- `get`: Retrieve detailed todo information
- `list`: List todos for a specific project
- `list-standalone`: List personal todos only
- `delete`: Remove todos (with permission checks)

#### 2. `maix_search_todos`
Advanced search with filtering and personal todo support.

**Examples:**
```bash
# Search with personal todos included
"Search for todos containing 'database' including my personal todos"

# Multi-status search
"Find all todos that are IN_PROGRESS or WAITING_FOR, include personal"

# Overdue todos
"Show me all overdue todos including personal ones"

# Project-specific search
"Search todos in project abc123 with status NOT_STARTED"
```

**Features:**
- Text search in titles and descriptions
- Status filtering (single or multiple)
- Personal todo inclusion via `includePersonal` parameter
- Due date filtering (overdue, due soon)
- Assignment and creator filtering
- Pagination support

#### 3. `maix_manage_personal_project`
Complete personal project lifecycle management.

**Examples:**
```bash
# Create personal project
"Create a personal project: Learn TypeScript with category Programming, target date 2024-12-31"

# List personal projects
"Show me all my personal projects"

# Share project
"Share personal project abc123 with user def456"

# Update project status
"Update personal project abc123 status to COMPLETED"
```

**Actions:**
- `create`: Create new personal projects
- `list`: List accessible personal projects
- `get`: Retrieve detailed project information
- `update`: Update project details and status
- `delete`: Remove projects (orphans todos to standalone)
- `share`: Share projects with other users
- `unshare`: Remove project access from users

### MCP Setup Instructions

1. **Generate Personal Access Token**
   - Go to MAIX Settings → API Tokens
   - Create a new token with appropriate scopes
   - Copy the token securely

2. **Add MAIX MCP Server to Claude Code**
   ```bash
   claude mcp add maix-platform \
     --transport http \
     --url https://maix.io/api/mcp \
     --header "Authorization: Bearer YOUR_PAT_TOKEN"
   ```

3. **Verify Installation**
   ```bash
   # Test the connection
   claude mcp list-tools maix-platform
   
   # Should show: maix_manage_todo, maix_search_todos, maix_manage_personal_project
   ```

### MCP Usage Patterns

#### Daily Task Management
```bash
# Morning routine
"Show me all my personal todos"
"Create a personal todo: Review pull requests, status NOT_STARTED"
"Update todo abc123 status to IN_PROGRESS"

# Project work
"List todos for project xyz789"
"Create todo for project xyz789: Update API documentation, assign to me"
"Search todos in project xyz789 with status WAITING_FOR"
```

#### Project Planning
```bash
# Create and organize
"Create personal project: Redesign Homepage with category UI/UX"
"Create todo for personal project abc123: Create wireframes"
"Create todo for personal project abc123: Implement responsive design"

# Track progress
"Show personal project abc123 details"
"Search todos in personal project abc123 with status COMPLETED"
```

#### Weekly Reviews
```bash
# Status overview
"Search for todos with status IN_PROGRESS including personal"
"Show me all overdue todos including personal ones"
"List all personal projects with active todos"

# Update and plan
"Update todo abc123 status to COMPLETED"
"Create personal todo: Plan next week's priorities"
```

## Advanced Features

### Permission System
- **Personal Todos**: Only creator can view, edit, delete
- **Project Todos**: Members and accepted volunteers can view
- **Management Rights**: Project admins and creators can manage
- **Assignment Rights**: Only valid project members can be assigned

### Search Capabilities
- **Full-Text Search**: Search in titles and descriptions
- **Status Filtering**: Single or multiple status values
- **Date Filtering**: Overdue, due soon, custom ranges
- **Assignment Search**: By assignee or creator
- **Project Scope**: All accessible or specific project

### Data Integrity
- **Transaction Safety**: Project deletion properly orphans todos
- **Referential Integrity**: Cascading deletes and updates
- **Audit Trail**: Creation and modification timestamps
- **Permission Enforcement**: All operations validate access rights

## Best Practices

### Status Workflow
1. **NOT_STARTED** → **IN_PROGRESS**: When beginning work
2. **IN_PROGRESS** → **WAITING_FOR**: When blocked
3. **WAITING_FOR** → **IN_PROGRESS**: When unblocked
4. **IN_PROGRESS** → **COMPLETED**: When work finished
5. **COMPLETED** → **DONE**: When reviewed/accepted

### Personal vs Project Todos
- Use **personal todos** for individual tasks, learning, and planning
- Use **project todos** for collaborative work and shared accountability
- Consider **personal projects** for larger personal initiatives

### MCP Integration
- Use MCP for bulk operations and quick updates
- Combine with web UI for detailed viewing and complex operations
- Leverage search capabilities for weekly reviews and planning

## Troubleshooting

### Common Issues

**MCP Tools Not Available**
- Verify PAT token is valid and not expired
- Check network connectivity to MAIX API
- Ensure Claude Code MCP configuration is correct

**Permission Denied Errors**
- Confirm you're a project member for project todos
- Verify ownership for personal todos and projects
- Check if PAT token has required scopes

**Search Not Finding Results**
- Include `includePersonal: true` for personal todos
- Check status filters match your todos
- Verify project membership for project-based search

**Status Updates Failing**
- Ensure status value is valid (6 supported values)
- Check permissions on the specific todo
- Verify todo exists and is accessible

### Getting Help

- **Documentation**: Reference this guide and API docs
- **MCP Test Suite**: Run `node scripts/test-enhanced-mcp.js` 
- **Community**: GitHub Issues for bug reports and feature requests
- **API Testing**: Use built-in test endpoints for troubleshooting

## Migration Notes

### From Legacy Todo System
- **OPEN status**: Automatically maps to NOT_STARTED in new system
- **Existing todos**: All existing todos remain accessible
- **API compatibility**: Legacy endpoints continue to work
- **Gradual adoption**: New features can be adopted incrementally

### Database Schema Changes
- **TodoStatus enum**: Expanded to 6 values with legacy support
- **Personal projects**: New isPersonal flag on Project model
- **Standalone todos**: projectId can be null for personal todos
- **Backward compatibility**: All existing data remains valid

This enhanced todo system provides a comprehensive, flexible foundation for both personal productivity and collaborative project management within the MAIX platform.