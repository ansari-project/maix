# Project Todos System

## Overview
Add a simple todo management system to projects, allowing project owners and accepted volunteers to create, assign, and track tasks within project context.

## Requirements
- **Todos belong to projects**: Each todo is scoped to a specific project
- **Assignment system**: Todos can be assigned to project participants (owners + accepted volunteers + org members)
- **Due date tracking**: Optional due dates for task scheduling
- **Permission-based creation**: Only project participants can create todos
- **Status tracking**: Three-state model (open/in-progress/completed)

## Core Features

### Todo Management
- Create todos with title, optional description, optional due date
- Assign todos to project participants only (not all Maix users)
- Update todo status (open → in progress → completed)
- Edit todo details (assignee, due date, description)
- Delete todos (creator or project owner only)
- Attach relevant posts (updates, discussions) to todos for context

### Permission Model
Following existing `canPostUpdate` pattern:
```typescript
const canManageTodos = isProjectOwner || isAcceptedVolunteer || isOrganizationMember
```

### UI Integration
- Add "Todos" section to project detail page
- Todo creation form (similar to project update form)
- Todo list with status indicators (Open, In Progress, Completed)
- Assignee selector with project participant search
- Due date picker using existing date utilities
- Post attachment interface showing linked posts with preview
- Ability to attach posts via search or dropdown

## Simplified Data Model

### Database Schema
```prisma
model Todo {
  id          String     @id @default(cuid())
  title       String     @db.VarChar(255)
  description String?    @db.Text
  status      TodoStatus @default(OPEN)
  dueDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  projectId   String
  creatorId   String
  assigneeId  String?
  
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  creator     User    @relation("TodosCreated", fields: [creatorId], references: [id], onDelete: SetNull)
  assignee    User?   @relation("TodosAssigned", fields: [assigneeId], references: [id], onDelete: SetNull)
  posts       Post[]  @relation("TodoPosts") // One-to-many: posts attached to this todo
  
  @@index([projectId, status])
  @@index([assigneeId, status])
  @@map("todos")
}

// Update Post model to include optional todo reference
model Post {
  // ... existing fields ...
  
  todoId      String?
  todo        Todo?    @relation("TodoPosts", fields: [todoId], references: [id], onDelete: SetNull)
  
  // ... existing relations ...
  
  @@index([todoId])
}

enum TodoStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
}
```

### Key Design Decisions
- **Three-state status model**: OPEN/IN_PROGRESS/COMPLETED for clear task progress visibility
- **No priority system**: Teams can organize by due dates and manual prioritization
- **Project-participant assignments**: Reduces noise, maintains project security
- **Cascade delete**: Todos deleted when project is deleted
- **SetNull assignee**: Handle user deletion gracefully
- **Simple post attachment**: Posts can optionally belong to one todo (no junction table)

## API Design

### Endpoints
```
POST   /api/projects/[projectId]/todos    # Create todo
GET    /api/projects/[projectId]/todos    # List project todos (includes attached posts)
PATCH  /api/todos/[todoId]               # Update todo
DELETE /api/todos/[todoId]               # Delete todo

# Post updates to include todoId
POST   /api/posts                        # Create post (can include todoId)
PATCH  /api/posts/[postId]               # Update post (can change todoId)
```

### Permission Validation
- Reuse existing `hasResourceAccess` utility
- Check project participation for todo creation
- Validate assignee is project participant
- Allow updates by creator, assignee, or project owner

## Libraries Needed

### Existing Dependencies (No New Installations)
- **react-hook-form + zod**: Form validation (already in use)
- **@radix-ui/react-calendar**: Date picker (part of shadcn/ui)
- **date-fns**: Date utilities (already in use)
- **cmdk**: User search/select (already in use)

### Integration Points
- Leverage existing `hasResourceAccess` for permissions
- Follow existing Card/Form component patterns  
- Reuse project status badge styling for todo status
- Use existing user search patterns for assignee selection

## Implementation Priority

### Phase 1 (MVP) ✅ COMPLETED
- Basic CRUD operations
- Simple list view with status filtering
- Project participant assignment only
- No notifications (keep it simple)

**Phase 1 Status**: Database schema, types, and migration completed and deployed (August 3, 2025)

### Phase 2 (Future Enhancements)
- User dashboard "My Todos" view across all projects
- Due date notifications via existing notification system
- Bulk status updates
- Priority system (LOW/MEDIUM/HIGH/CRITICAL)
- Todo comments/discussion threads

## Technical Considerations

### Database Performance
- Composite indexes on `[projectId, status]` and `[assigneeId, status]`
- Pagination for projects with many todos
- Efficient participant lookup queries

### Security & Data Integrity
- Validate assignee can access project during assignment
- Handle user deletion with SetNull cascade
- Prevent assigning todos to non-participants
- Maintain project privacy through participant-only assignments
- Edge case: When user is removed from project, unassign their todos
- Performance: Don't use eager loading - load relations explicitly to avoid N+1 queries

### User Experience
- Consistent with existing project management patterns
- Clear visual status indicators
- Responsive design for mobile usage
- Intuitive assignment workflow

## Success Metrics
- **Developer adoption**: Project owners actively create todos
- **Collaboration improvement**: Volunteers use todos for task coordination
- **System integration**: Seamless workflow with existing project features
- **Performance**: Fast todo operations without impacting project page load

## MCP Integration

### New MCP Tools
Add todo management capabilities to the Maix MCP server:

#### maix_manage_todo
```typescript
interface TodoManageParams {
  action: 'create' | 'update' | 'delete' | 'get' | 'list'
  projectId?: string        // Required for create/list
  todoId?: string          // Required for update/delete/get
  title?: string           // Required for create
  description?: string
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
  assigneeId?: string      // Must be project participant
  dueDate?: string         // ISO 8601 format
}
```

#### maix_search_todos
```typescript
interface TodoSearchParams {
  projectId?: string       // Filter by project
  assigneeId?: string      // Filter by assignee
  status?: TodoStatus[]    // Filter by status
  dueBefore?: string       // ISO 8601 date
  dueAfter?: string        // ISO 8601 date
  query?: string           // Search in title/description
  limit?: number
  offset?: number
}
```

### Integration with Existing Tools
- **maix_manage_post**: Add optional `todoId` parameter to attach posts to todos
- **maix_manage_project**: Include todo count in project details
- **maix_update_profile**: Could show assigned todo count

### MCP Permissions
- Follow same permission model as posts
- Validate user is project participant before todo operations
- Check assignee is valid project participant

## Alignment with Maix Values
- **Community collaboration**: Enables better volunteer coordination
- **Knowledge sharing**: Clear task documentation and progress tracking
- **Simplicity**: Focused feature set without over-engineering
- **Trust building**: Transparent task management within project teams

## Design Principles Applied
- **Bias towards simple solutions**: Minimal feature set addressing current needs
- **Follow existing patterns**: Reuses established permission and UI patterns
- **Database consistency**: Proper foreign key constraints and cascade behavior
- **Incremental enhancement**: Foundation for future feature expansion