# Project Todos System - Execution Plan

## Executive Summary
This plan outlines the implementation of a todo management system for Maix projects, enabling project owners and volunteers to coordinate tasks effectively. The system will integrate seamlessly with existing project management features while maintaining our principles of simplicity and pragmatism.

## End-to-End User Experience

### User Journey
1. **Project Owner Creates Todo**
   - Navigate to project detail page
   - Click "Add Todo" button in new Todos section
   - Fill form: title, description (optional), assignee (optional), due date (optional)
   - Submit to create todo

2. **Volunteer Views Assigned Todos**
   - Visit project page to see all project todos
   - Filter by status (Open/In Progress/Completed)
   - Click todo to view details and linked posts
   - Update status as work progresses

3. **Task Coordination**
   - Create posts (updates/discussions) linked to specific todos
   - Track progress through status changes
   - See due dates for time-sensitive tasks
   - Reassign tasks as team changes

## Implementation Phases

### Phase 1: Database & Core Infrastructure (2-3 days)

**Objectives**: Establish database schema and core data access layer

**Tasks**:
1. **Database Migration**
   ```prisma
   // Add to schema.prisma
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
     creator     User    @relation("TodosCreated", fields: [creatorId], references: [id])
     assignee    User?   @relation("TodosAssigned", fields: [assigneeId], references: [id], onDelete: SetNull)
     posts       Post[]  @relation("TodoPosts")
     
     @@index([projectId, status])
     @@index([assigneeId, status])
     @@map("todos")
   }
   
   enum TodoStatus {
     OPEN
     IN_PROGRESS
     COMPLETED
   }
   ```

2. **Update Post Model**
   ```prisma
   // Add to Post model
   todoId      String?
   todo        Todo?    @relation("TodoPosts", fields: [todoId], references: [id], onDelete: SetNull)
   
   @@index([todoId])
   ```

3. **Create Type Definitions**
   ```typescript
   // src/types/todo.ts
   export interface Todo {
     id: string
     title: string
     description?: string
     status: TodoStatus
     dueDate?: Date
     createdAt: Date
     updatedAt: Date
     projectId: string
     creatorId: string
     assigneeId?: string
     creator?: User
     assignee?: User
     project?: Project
     posts?: Post[]
   }
   
   export enum TodoStatus {
     OPEN = 'OPEN',
     IN_PROGRESS = 'IN_PROGRESS',
     COMPLETED = 'COMPLETED'
   }
   ```

**Deliverables**:
- Database migration file
- Updated Prisma schema
- TypeScript type definitions

### Phase 2: API Layer (2-3 days)

**Status**: ✅ Complete

**Objectives**: Implement secure API endpoints with proper permissions

**Tasks**:
1. **Create Todo CRUD API**
   ```typescript
   // src/app/api/projects/[projectId]/todos/route.ts
   // POST - Create todo
   // GET - List project todos
   
   // src/app/api/todos/[todoId]/route.ts
   // PATCH - Update todo
   // DELETE - Delete todo
   ```

2. **Permission Utilities**
   ```typescript
   // src/lib/permissions/todo-permissions.ts
   export async function canManageTodos(userId: string, projectId: string): Promise<boolean>
   export async function canUpdateTodo(userId: string, todo: Todo): Promise<boolean>
   export async function canDeleteTodo(userId: string, todo: Todo): Promise<boolean>
   export async function isValidAssignee(userId: string, projectId: string): Promise<boolean>
   ```

3. **Validation Schemas**
   ```typescript
   // src/lib/validations/todo.ts
   export const createTodoSchema = z.object({
     title: z.string().min(1).max(255),
     description: z.string().optional(),
     assigneeId: z.string().optional(),
     dueDate: z.string().datetime().optional()
   })
   
   export const updateTodoSchema = z.object({
     title: z.string().min(1).max(255).optional(),
     description: z.string().optional(),
     status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED']).optional(),
     assigneeId: z.string().nullable().optional(),
     dueDate: z.string().datetime().nullable().optional()
   })
   ```

4. **Update Post API**
   - Add todoId support to existing post creation/update endpoints
   - Validate todoId belongs to same project as post

**Deliverables**:
- Four API endpoints with tests
- Permission validation functions
- Zod validation schemas
- Updated post endpoints

### Phase 3: UI Components (3-4 days)

**Objectives**: Build reusable UI components following existing patterns

**Tasks**:
1. **Todo Components**
   ```typescript
   // src/components/todos/todo-card.tsx
   // Display individual todo with status badge
   
   // src/components/todos/todo-list.tsx
   // List todos with filtering
   
   // src/components/todos/todo-form.tsx
   // Create/edit todo form
   
   // src/components/todos/todo-status-badge.tsx
   // Visual status indicator
   
   // src/components/todos/assignee-selector.tsx
   // Project participant search/select
   ```

2. **Integration Components**
   ```typescript
   // src/components/todos/todo-section.tsx
   // Complete todos section for project page
   
   // src/components/todos/todo-post-link.tsx
   // UI for linking posts to todos
   ```

3. **Date Picker Integration**
   - Use existing shadcn/ui Calendar component
   - Format dates with date-fns

**Deliverables**:
- 7 React components
- Consistent styling with existing UI
- Mobile-responsive design

### Phase 4: Project Page Integration (2 days)

**Objectives**: Seamlessly integrate todos into project detail page

**Tasks**:
1. **Update Project Page**
   ```typescript
   // src/app/projects/[id]/page.tsx
   // Add TodoSection component
   // Position between Updates and Q&A sections
   ```

2. **Data Fetching**
   - Add todos to project page data fetch
   - Implement pagination for large todo lists
   - Include participant data for assignee selection

3. **User Interactions**
   - Create todo flow
   - Update todo status
   - Assign/reassign todos
   - Link posts to todos

**Deliverables**:
- Updated project page
- Smooth user interactions
- Performance optimization

### Phase 5: MCP Integration (1-2 days)

**Objectives**: Enable AI agents to manage todos via MCP

**Tasks**:
1. **Implement MCP Tools**
   ```typescript
   // Add to MCP server
   - maix_manage_todo
   - maix_search_todos
   ```

2. **Update Existing Tools**
   - Add todoId to maix_manage_post
   - Include todo count in project details

3. **Permission Validation**
   - Ensure MCP respects same permissions as web UI

**Deliverables**:
- Two new MCP tools
- Updated existing tools
- MCP documentation

### Phase 6: Testing & Polish (2 days)

**Objectives**: Ensure quality and reliability

**Tasks**:
1. **Unit Tests**
   - API endpoint tests
   - Permission validation tests
   - Component tests

2. **Integration Tests**
   - Todo creation flow
   - Status update flow
   - Post attachment flow

3. **Edge Cases**
   - User deletion handling
   - Project deletion cascade
   - Concurrent updates

4. **UI Polish**
   - Loading states
   - Error handling
   - Empty states
   - Success feedback

**Deliverables**:
- Comprehensive test suite
- Polished user experience
- Bug fixes

## Technical Implementation Details

### API Response Formats
```typescript
// GET /api/projects/[projectId]/todos
{
  todos: Todo[],
  pagination: {
    total: number,
    page: number,
    pageSize: number
  }
}

// POST/PATCH response
{
  todo: Todo
}
```

### Component Props
```typescript
// TodoCard
interface TodoCardProps {
  todo: Todo
  onStatusChange: (status: TodoStatus) => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
  canDelete: boolean
}

// TodoForm
interface TodoFormProps {
  projectId: string
  participants: User[]
  todo?: Todo // For editing
  onSubmit: (data: TodoFormData) => void
  onCancel: () => void
}
```

### State Management
- Use React Query for data fetching and caching
- Optimistic updates for better UX
- Invalidate queries after mutations

## Success Criteria

### Phase 1 Success
- Database migration runs successfully
- Types compile without errors

### Phase 2 Success
- All API endpoints return correct data
- Permissions properly enforced
- 100% test coverage for critical paths

### Phase 3 Success
- Components render correctly
- Responsive on mobile devices
- Consistent with existing UI patterns

### Phase 4 Success
- Todos visible on project page
- All CRUD operations work smoothly
- No performance regression

### Phase 5 Success
- MCP tools function correctly
- Same permission model as web UI

### Phase 6 Success
- All tests passing
- No critical bugs
- Smooth user experience

## Risk Mitigation

### Performance Risks
- **Risk**: Large number of todos slowing project page
- **Mitigation**: Implement pagination, lazy loading

### Data Integrity Risks
- **Risk**: Orphaned todos after user deletion
- **Mitigation**: Proper cascade rules, SetNull for assignees

### Security Risks
- **Risk**: Users assigning todos to non-participants
- **Mitigation**: Server-side validation of assignees

## Future Considerations

### Phase 2 Features (Not in MVP)
- My Todos dashboard view
- Email notifications for due dates
- Bulk operations
- Priority levels
- Todo comments

### Integration Opportunities
- Link todos to project milestones
- Generate todos from AI suggestions
- Export todos for external tools

## Implementation Order

1. Start with database schema (enables parallel work)
2. Build API layer with tests
3. Create UI components in isolation
4. Integrate into project page
5. Add MCP support
6. Polish and test comprehensively

## Team Coordination

- **Backend**: Focus on API and permissions
- **Frontend**: Build components using mock data initially
- **Testing**: Write tests alongside implementation
- **Documentation**: Update as features complete

This execution plan provides a clear roadmap for implementing the project todos system while maintaining code quality and user experience standards.