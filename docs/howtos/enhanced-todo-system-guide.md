# Enhanced Todo System - User Guide

This guide walks you through using MAIX's enhanced todo system, covering personal task management, project collaboration, and AI assistant integration.

## What's New in the Enhanced Todo System

The enhanced todo system introduces powerful new capabilities:

✨ **6-Status Workflow**: More granular task tracking with `NOT_STARTED`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR`, `COMPLETED`, `DONE`

📋 **Personal Todos**: Create tasks not tied to any project for personal productivity

🏗️ **Personal Projects**: Organize your learning goals and side projects with dedicated project spaces

🤖 **AI Integration**: Manage tasks via Claude Code CLI for seamless workflow automation

🎨 **Enhanced UI**: Improved My Tasks dashboard with drag-and-drop kanban boards

## Getting Started

### 1. Access Your Enhanced Tasks Dashboard

Navigate to **My Tasks** from your MAIX dashboard sidebar. You'll see:
- **Kanban Board**: Visual task management with status columns
- **Personal Tasks Tab**: Dedicated space for standalone todos  
- **Personal Projects**: Your private project workspace

### 2. Understanding Task Status Flow

The enhanced system uses a 6-status workflow that mirrors real development processes:

```
NOT_STARTED → IN_PROGRESS → COMPLETED → DONE
      ↓             ↓
    OPEN      WAITING_FOR
```

**Status Meanings:**
- ⭕ **NOT_STARTED** - Task created but work hasn't begun
- 🔵 **OPEN** - Ready to work on (legacy status)
- 🔄 **IN_PROGRESS** - Currently working on this task
- ⏳ **WAITING_FOR** - Blocked waiting for something (approval, feedback, dependencies)
- ✅ **COMPLETED** - Work finished, ready for review
- ✅ **DONE** - Fully complete and accepted

## Using Personal Todos

Personal todos are perfect for individual productivity and learning goals.

### Creating Personal Todos

**Via Web Interface:**
1. Go to **My Tasks** → **Personal Tasks** tab
2. Click **"Add Personal Todo"**
3. Fill in title, description, and due date
4. Set initial status (usually `NOT_STARTED`)
5. Click **"Create Todo"**

**Via Claude Code CLI:**
```bash
# Quick personal todo
"Create a personal todo: Review React 18 documentation with status NOT_STARTED"

# With details and due date
"Create a personal todo: Complete TypeScript advanced course, description: Focus on generics and utility types, due 2024-04-15"
```

### Managing Personal Todos

**Update Status:**
- **Web**: Drag and drop between status columns in the kanban board
- **Claude**: `"Update todo abc123 status to IN_PROGRESS"`

**View All Personal Todos:**
- **Web**: Personal Tasks tab shows all your standalone todos
- **Claude**: `"Show me all my personal todos"`

**Edit Todo Details:**
- **Web**: Click on a todo card to edit title, description, due date
- **Claude**: `"Update todo abc123 title to 'Updated task name' and due date to 2024-04-20"`

## Working with Personal Projects

Personal projects help organize related todos and track larger goals.

### Creating Personal Projects

**Via Web Interface:**
1. Go to **My Tasks** → **Personal Projects** section
2. Click **"Create Personal Project"**
3. Enter project details:
   - **Name**: Your project title
   - **Description**: What you're building/learning
   - **Category**: For organization (e.g., "Learning", "Side Project", "Career")
   - **Target Date**: When you aim to complete
   - **Status**: `IN_PROGRESS`, `COMPLETED`, or `ON_HOLD`

**Via Claude Code CLI:**
```bash
# Create a learning project
"Create a personal project: Learn Machine Learning with category AI/ML, target date 2024-08-31, description: Complete Andrew Ng course and build 3 ML projects"

# Create a side project
"Create a personal project: Portfolio Website Redesign with category Web Development, target date 2024-06-01"
```

### Managing Personal Projects

**Add Todos to Personal Projects:**
```bash
# Via Claude Code
"Create todo for personal project abc123: Set up development environment"
"Create todo for personal project abc123: Complete first tutorial module, status NOT_STARTED, due 2024-04-10"
```

**Track Project Progress:**
```bash
# Get project overview
"Show personal project abc123 details"

# See project todos
"List todos for project abc123"

# Search completed work
"Search todos in personal project abc123 with status COMPLETED"
```

**Share Personal Projects:**
Personal projects can be shared with collaborators:
```bash
# Share with a friend or mentor
"Share personal project abc123 with user def456"

# Remove access
"Unshare personal project abc123 from user def456"
```

## Collaborative Project Todos

When working on MAIX community projects, use project todos for team coordination.

### Creating Project Todos

**Via Web Interface:**
1. Navigate to any project you're a member of
2. Go to the **Tasks** tab
3. Click **"Add Task"**
4. Fill in details and assign to team members

**Via Claude Code CLI:**
```bash
# Create task for a community project
"Create todo for project xyz789: Implement user authentication, assign to john@example.com, due 2024-04-15"

# Create and self-assign
"Create todo for project xyz789: Write API documentation, assign to me"
```

### Managing Project Todos

**View Project Tasks:**
```bash
# List all project todos
"List todos for project xyz789"

# Filter by status
"Search todos in project xyz789 with status IN_PROGRESS"

# Find overdue tasks
"Search for overdue todos in project xyz789"
```

**Update Project Tasks:**
```bash
# Change status
"Update todo abc123 status to WAITING_FOR"

# Reassign task
"Update todo abc123 assignee to jane@example.com"

# Update details
"Update todo abc123 description to 'Updated requirements based on feedback'"
```

## Advanced Search and Filtering

The enhanced system provides powerful search capabilities.

### Web Interface Search

**My Tasks Dashboard:**
- **Filter by Status**: Click status column headers to filter
- **Group by Project**: Toggle between project and status grouping
- **Search Text**: Use the search bar to find todos by title/description

### Claude Code Advanced Search

**Multi-Status Search:**
```bash
# Find all active work
"Search for todos with status IN_PROGRESS or WAITING_FOR, include personal"

# Find completed work from last week  
"Search todos with status COMPLETED including personal ones"
```

**Text Search:**
```bash
# Search by keyword
"Search for todos containing 'API' including my personal todos"

# Combined filters
"Search for todos containing 'documentation' with status NOT_STARTED in project xyz789"
```

**Due Date Filters:**
```bash
# Find overdue tasks
"Show me all overdue todos including personal ones"

# Due soon
"Search for todos due within 7 days including personal"
```

## Daily Workflow Examples

### Morning Routine
```bash
# Check what's in progress
"Search for todos with status IN_PROGRESS including personal"

# See today's priorities
"Search for todos due today including personal ones"

# Quick status update from yesterday
"Update todo abc123 status to COMPLETED"
```

### Weekly Planning
```bash
# Review personal projects
"List all personal projects"

# Create weekly goals
"Create a personal todo: Plan next week's learning priorities, due this Friday"

# Update project status
"Update personal project abc123 status to ON_HOLD"
```

### Project Collaboration
```bash
# Morning standup prep
"List todos for project xyz789 assigned to me"

# Update team on blockers
"Update todo abc123 status to WAITING_FOR"
"Create todo for project xyz789: Review design mockups, assign to designer@example.com"

# End of sprint review
"Search todos in project xyz789 with status COMPLETED"
```

## Tips and Best Practices

### Status Workflow Tips

1. **Start with NOT_STARTED** for all new tasks
2. **Move to IN_PROGRESS** when you begin work
3. **Use WAITING_FOR** for blocked tasks (be specific in comments about what you're waiting for)
4. **Mark COMPLETED** when work is done but needs review
5. **Only use DONE** after review/acceptance is complete

### Personal Project Organization

1. **Use descriptive categories** like "Learning - Frontend", "Side Project - Mobile", "Career - Certifications"
2. **Set realistic target dates** and update them as needed
3. **Break large projects into smaller todos** for better progress tracking
4. **Share learning projects** with mentors or study partners

### Claude Code Integration

1. **Use natural language** - the AI understands context like "assign to me" or "due tomorrow"
2. **Be specific with project references** - use project IDs when possible
3. **Combine operations** - "Create todo and assign to john@example.com due next Friday"
4. **Regular check-ins** - use Claude for daily/weekly reviews

### Collaboration Best Practices

1. **Clear assignments** - always assign project todos to specific team members
2. **Detailed descriptions** - include context and acceptance criteria
3. **Use due dates wisely** - set them for deadlines, not estimates
4. **Update status promptly** - keep team informed of progress and blockers

## Troubleshooting Common Issues

### Can't See Personal Todos
- Make sure you're on the **Personal Tasks** tab
- Check if **Include Personal** is enabled in search filters
- Personal todos only show for their creator

### Permission Denied Errors
- **Project Todos**: Verify you're a project member or accepted volunteer
- **Personal Todos**: Only creators can manage their personal todos
- **Assignments**: Only project members can be assigned tasks

### Claude Code Not Working
1. **Check MCP setup**: Ensure MAIX MCP server is properly configured
2. **Verify PAT token**: Generate a fresh Personal Access Token if needed
3. **Test connection**: Try `"List all personal projects"` as a simple test
4. **Check permissions**: Ensure your PAT token has required scopes

### Tasks Not Updating
- **Refresh the page** - web interface updates may need a refresh
- **Check permissions** - ensure you have rights to update the specific todo
- **Verify project membership** for project todos

### Search Not Finding Results
- **Include personal todos** - use `includePersonal: true` in searches
- **Check status filters** - ensure you're not filtering out the todos you want
- **Verify project access** - you can only search todos in projects you're a member of

## Getting Help

- **Documentation**: Reference this guide and [MCP Tools Reference](../guides/mcp-tools-reference.md)
- **API Reference**: See [API Documentation](../ref/api-reference.md) for developers
- **Community**: Ask questions in MAIX project discussions
- **Support**: Report issues via GitHub Issues

---

The enhanced todo system is designed to grow with your workflow - start simple with personal todos and gradually explore advanced features like personal projects and AI integration as your needs evolve!