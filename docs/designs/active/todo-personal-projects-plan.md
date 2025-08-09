# Todo System and Personal Projects - Implementation Plan

## Phase 1: Schema Updates and Migration
**Goal**: Update database schema with new fields and enums

### Deliverables
1. Updated Prisma schema with:
   - New TodoStatus values (NOT_STARTED, WAITING_FOR, DONE)
   - Todo.startDate field
   - Project.isPersonal and personalCategory fields
   - Nullable org fields (goal, helpType, contactEmail)
2. Migration script generated and tested
3. TypeScript types regenerated
4. Tests for schema changes

### Tasks
- [ ] Update schema.prisma with new enums and fields
- [ ] Generate migration with `npm run db:migrate:new add_personal_projects_and_todo_states`
- [ ] Review migration SQL for safety and table locking
- [ ] Add backfill script for existing data:
  - [ ] Set existing Todo.status to appropriate values
  - [ ] Set Todo.startDate = createdAt for existing todos
  - [ ] Set Project.isPersonal = false for existing projects
- [ ] Create indexes for new query patterns:
  - [ ] Index on (assigneeId, status) for My Tasks
  - [ ] Index on (projectId, status) for project grouping
  - [ ] Index on (isPersonal, ownerId) for personal projects
- [ ] Document rollback procedure
- [ ] Apply migration to test database
- [ ] Run `npm run build` to verify TypeScript compilation
- [ ] Update existing type definitions in src/types/todo.ts
- [ ] **TEST**: Write integration tests for new schema fields
- [ ] **TEST**: Verify backfill scripts work correctly
- [ ] **TEST**: Run `npm run test:integration`
- [ ] **REVIEW**: Code review with `mcp__zen__codereview`

### Success Criteria
- Migration applies cleanly
- No data loss on existing records
- TypeScript compiles without errors
- All tests pass
- Code review complete

---

## Phase 2: Backend Services Layer
**Goal**: Implement business logic for personal projects and enhanced todos

### Deliverables
1. Updated todo service with:
   - Support for standalone tasks (no projectId)
   - New state transitions
   - Start date handling
2. Updated project service with:
   - Personal project creation/management
   - Sharing logic using ProjectMember
   - Category management
3. Permission updates for personal projects

### Tasks
- [ ] Create/update `src/lib/services/todo.service.ts`
  - [ ] Add createStandaloneTask method
  - [ ] Update state transition logic (free transitions)
  - [ ] Add getMyTasks aggregation method
- [ ] Update `src/lib/services/project.service.ts`
  - [ ] Add createPersonalProject method
  - [ ] Update access control for personal projects
  - [ ] Handle task orphaning on project deletion
- [ ] Update `src/lib/permissions/project-permissions.ts`
  - [ ] Add personal project visibility rules
  - [ ] Handle sharing permissions

- [ ] **TEST**: Write unit tests for service methods
- [ ] **TEST**: Write integration tests for permissions
- [ ] **TEST**: Run `npm run test`
- [ ] **REVIEW**: Code review with `mcp__zen__codereview`

### Success Criteria
- Services handle all new fields correctly
- Permission checks work for personal vs org projects
- Tasks can exist without projects
- All tests pass
- Code review complete

---

## Phase 3: API Endpoints
**Goal**: Expose new functionality through REST APIs

### Deliverables
1. New/updated endpoints:
   - GET /api/todos/my-tasks
   - GET /api/projects/personal
   - PATCH /api/todos/:id/state
   - Updated POST /api/projects (handle isPersonal)
2. Input validation with Zod
3. Proper error handling

### Tasks
- [ ] Create `src/app/api/todos/my-tasks/route.ts`
- [ ] Create `src/app/api/projects/personal/route.ts`
- [ ] Update `src/app/api/todos/[id]/state/route.ts` for drag-drop
- [ ] Update project creation endpoint for personal projects
- [ ] Add Zod schemas for new fields in `src/lib/validations/`
- [ ] Write API route tests

- [ ] **TEST**: Write API route tests
- [ ] **TEST**: Test validation with invalid inputs
- [ ] **TEST**: Test authorization scenarios
- [ ] **REVIEW**: Code review with `mcp__zen__codereview`

### Success Criteria
- All endpoints return correct data
- Validation rejects invalid inputs
- Authorization works correctly
- All tests pass
- Code review complete

---

## Phase 4: UI Components - My Tasks Page
**Goal**: Replace tabbed interface with new project-grouped view

### Deliverables
1. New My Tasks page layout with:
   - Flat list with project headers
   - State grouping within projects
   - Drag-and-drop functionality
2. Quick task creation
3. State transition animations

### Tasks
- [ ] Create `src/components/todos/MyTasksView.tsx`
- [ ] Implement drag-and-drop with @dnd-kit/sortable
- [ ] Create `src/components/todos/TaskCard.tsx` component
- [ ] Add project section headers with icons
- [ ] Implement quick-add functionality
- [ ] Add loading and error states
- [ ] Update `src/app/todos/page.tsx` to use new view

- [ ] **TEST**: Write component tests
- [ ] **TEST**: Test drag-and-drop functionality
- [ ] **TEST**: Test quick-add feature
- [ ] **REVIEW**: Code review with `mcp__zen__codereview`

### Success Criteria
- Tasks display grouped by project and state
- Drag-and-drop updates task state
- Quick add works in each column
- Responsive on desktop and tablet
- All tests pass
- Code review complete

---

## Phase 5: Personal Project UI
**Goal**: Add UI for creating and managing personal projects

### Deliverables
1. Personal project creation dialog
2. Project settings/sharing UI
3. Category input field

### Tasks
- [ ] Create `src/components/projects/CreatePersonalProject.tsx`
- [ ] Add category free-text input
- [ ] Create sharing UI (add/remove members)
- [ ] Update project list to show personal projects
- [ ] Add personal project indicators in UI

### Success Criteria
- Users can create personal projects
- Sharing works through member system
- Categories are free-form text

---

## Phase 6: MCP Tool Updates
**Goal**: Extend AI assistant tools for personal task management

### Deliverables
1. Updated MCP tools that understand personal projects
2. Support for new task states
3. Personal task creation via AI

### Tasks
- [ ] Update `src/lib/mcp/tools/manageTodo.ts`
  - [ ] Handle personal project context
  - [ ] Support new states
  - [ ] Add start date support
- [ ] Update `src/lib/mcp/tools/searchTodos.ts`
  - [ ] Include personal projects in search
  - [ ] Filter by personal/org type
- [ ] Update tool descriptions and prompts
- [ ] Test with AI assistant

- [ ] **TEST**: Test AI assistant with personal projects
- [ ] **TEST**: Verify AI respects privacy rules
- [ ] **REVIEW**: Code review with `mcp__zen__codereview`

### Success Criteria
- AI can create tasks in personal projects
- AI understands new task states
- AI respects personal project privacy
- All tests pass
- Code review complete

---

## Phase 7: Documentation and Polish
**Goal**: Document new features and refine UX

### Deliverables
1. User documentation
2. API documentation
3. Final UX polish

### Tasks
- [ ] Document personal projects in user guide
- [ ] Update API documentation
- [ ] Add tooltips and help text
- [ ] Optimize queries for performance
- [ ] Add keyboard shortcuts
- [ ] Final bug fixes

### Success Criteria
- Documentation complete
- Features intuitive to use
- Performance optimized

---

## Risk Mitigation

1. **Migration Risk**: Test thoroughly on copy of production data
2. **Permission Bugs**: Extensive testing of access control
3. **Performance**: Add indexes for new query patterns
4. **UX Confusion**: Clear visual distinction between personal/org

## Dependencies

- Existing todo and project infrastructure
- @dnd-kit/sortable for drag-and-drop
- Existing MCP tool framework
- NextAuth for user context

## Estimated Complexity

- **Phase 1-3**: Backend changes - Medium complexity
- **Phase 4-5**: UI changes - High complexity (drag-drop)
- **Phase 6**: MCP updates - Low complexity
- **Phase 7-8**: Testing/Polish - Medium complexity

---

## Expert Review Feedback

### O4-mini Review Summary

**Critical Issues Identified:**

1. **Migration Safety**
   - Need backfill scripts for existing data (startDate, status defaults)
   - Enum updates can lock tables - need non-locking migration strategy
   - Missing rollback procedures

2. **Missing Components**
   - No indexes planned for new query patterns
   - No audit trail for state transitions
   - Missing pagination for My Tasks endpoint
   - No invitation workflow for sharing

3. **Security Concerns**
   - Need rate limiting on write endpoints
   - Must verify permissions on all state transitions
   - Orphaned tasks visibility needs explicit handling

4. **Performance Issues**
   - N+1 query risk in UI task grouping
   - Need batched updates for drag-drop
   - Consider caching for My Tasks

### Gemini Pro Review Summary

**Strengths:**
- Logical phase progression
- Good separation of concerns
- Incremental delivery approach

**Recommendations:**
- Move index creation to Phase 1
- Start testing earlier (Phase 2)
- Consider audit logging requirements
- Add error monitoring strategy

### Incorporated Changes

Based on expert review, the following adjustments should be made:

1. **Phase 1 Addition**: Add index creation and backfill scripts
2. **Phase 2 Addition**: Start unit tests immediately
3. **Phase 3 Addition**: Add pagination and rate limiting
4. **Phase 4 Change**: Use single aggregation query for performance
5. **New consideration**: Audit trail for state changes (deferred to future)

---

*Status: PLAN PHASE COMPLETE - Expert Reviewed*
*Date: 2025-01-09*
*Reviewed by: O4-mini, Gemini Pro*