# Todo System and Personal Projects Enhancement - Design Document

## Executive Summary

This design document outlines enhancements to the Maix todo system to support personal task management alongside the existing collaborative project structure. The key additions include standalone tasks, personal projects, enhanced task states, and a "My Tasks" view.

## Requirements

1. **Tasks not assigned to any projects** - Standalone tasks that exist independently
2. **Personal projects** - Single-user projects for personal items (home, kids, etc.)
3. **Enhanced task states** - NOT_STARTED, IN_PROGRESS, WAITING_FOR, DONE
4. **"My Tasks" view** - All tasks assigned to the current user
5. **Direct task creation** - Add tasks directly to "My Tasks"
6. **Personal categories** - Support for categorizing personal projects
7. **Improved My Todo UI** - Replace tabbed interface with project-grouped, state-organized view with drag-and-drop

## Current State Analysis

### Existing Schema
- **Todo Model**: Already supports optional `projectId` and `eventId` (standalone tasks possible)
- **TodoStatus**: Currently has OPEN, IN_PROGRESS, COMPLETED
- **Project Model**: Organization/volunteer-focused with HelpType enum
- **ProjectMember**: Many-to-many relationship for project collaboration

### Key Findings
1. ✅ **Standalone tasks already supported** - `projectId` is optional in schema
2. ❌ **No personal project concept** - All projects are organization-focused
3. ❌ **Missing task states** - Need NOT_STARTED, WAITING_FOR, DONE
4. ✅ **"My Tasks" query possible** - Can filter by `assigneeId`
5. ✅ **MCP tools exist** - Can extend existing AI assistant integration

## Design Approaches

### Approach 1: Minimal Changes (RECOMMENDED)
**Philosophy**: Extend existing models with minimal disruption

**Changes**:
1. Add `isPersonal` boolean to Project model
2. Add `category` field to Project for personal categorization
3. Update TodoStatus enum with new states
4. Create "My Tasks" API endpoint/view

**Pros**:
- Minimal migration complexity
- No breaking changes
- Reuses existing infrastructure
- Simpler authorization logic

**Cons**:
- Some organization fields irrelevant for personal projects
- Shared model might become cluttered

### Approach 2: Separate Personal System
**Philosophy**: Complete separation of personal and organizational systems

**Changes**:
1. Create PersonalProject model
2. Create PersonalTodo model
3. Separate API endpoints
4. Separate UI components

**Pros**:
- Clean separation of concerns
- Optimized fields for each use case
- No field pollution

**Cons**:
- Code duplication
- Complex migration
- Harder to move tasks between systems

### Approach 3: Type-based Polymorphism
**Philosophy**: Single model with type-based behavior

**Changes**:
1. Add ProjectType enum (ORGANIZATION, PERSONAL)
2. Conditional field validation based on type
3. Type-specific business logic

**Pros**:
- Single source of truth
- Flexible type system
- Easy to add new project types

**Cons**:
- Complex validation logic
- Potential for type confusion
- Harder to maintain

## Proposed Solution (Approach 1 - Minimal Changes)

### Schema Changes

```prisma
// Update TodoStatus enum
enum TodoStatus {
  NOT_STARTED    // New
  OPEN          // Existing (consider deprecating)
  IN_PROGRESS   // Existing
  WAITING_FOR   // New
  COMPLETED     // Existing
  DONE          // New (or reuse COMPLETED)
}

// Add to Project model
model Project {
  // ... existing fields ...
  
  isPersonal       Boolean         @default(false)
  personalCategory String?         // Free-form: "home", "kids", "health", etc.
  
  // Make these nullable for personal projects
  goal             String?         // Now nullable
  helpType         HelpType?       // Now nullable
  contactEmail     String?         // Now nullable
  
  // ... rest of model ...
}

// Add to Todo model
model Todo {
  // ... existing fields ...
  
  startDate       DateTime?        // When to start working on this
  
  // ... rest of model ...
}
```

### Alignment Outcomes - Decisions Made

#### Core Architecture Decisions
1. **[DECIDED: Option A]** Use existing Todo model for all tasks
2. **[DECIDED: Option A]** No separate PersonalProject model  
3. **[DECIDED: Option A]** Reuse and extend existing MCP tools
4. **[DECIDED: Option B]** Include sharing capabilities from start

#### Simplification Decisions
1. **Field Handling**: **[DECIDED: Nullable]** - Make org fields nullable for personal projects
2. **Sharing**: **[DECIDED: Reuse ProjectMember]** - Use existing member system
3. **State Transitions**: **[DECIDED: Free]** - Any state can transition to any other
4. **My Tasks**: **[DECIDED: Virtual]** - Query aggregation, no new model
5. **Personal Categories**: **[DECIDED: Free-form String]** - User types anything
6. **Drag-Drop**: **[DECIDED: Simple]** - Update status field only
7. **UI Grouping**: **[DECIDED: Flat List]** - Projects/tasks with visual headers
8. **WAITING_FOR**: **[DECIDED: Status Only]** - No additional context field

### Open Questions

#### Tier 1: Critical Blockers (Answered)
1. **Q: Should personal projects be visible to other users?**
   - **[DECIDED: Option B]** - Optional sharing with specific users
   
2. **Q: Can tasks be moved between personal and organization projects?**
   - **[DECIDED: Option A]** - Yes, with ownership transfer
   
3. **Q: Should personal projects support collaboration (e.g., shared with family)?**
   - **[DECIDED: Option B]** - Yes, allow family/friend sharing
   
4. **Q: What happens to tasks when a personal project is deleted?**
   - **[DECIDED: Option B]** - Convert to standalone tasks

#### Tier 2: Important (Should answer before relevant phase)
1. **Q: Do personal projects need all organization fields (goal, helpType, contactEmail)?**
   - **[AWAITING DECISION]**
   - Recommendation: Make these fields optional or null for personal projects
   
2. **Q: Should WAITING_FOR state track what/who we're waiting for?**
   - **[AWAITING DECISION]**
   - Recommendation: Add optional `waitingFor` text field
   
3. **Q: How to handle task state transitions (e.g., can go from DONE back to IN_PROGRESS)?**
   - **[AWAITING DECISION]**

#### Tier 3: Deferrable (Can answer during implementation)
1. Personal project templates (predefined categories)
2. Task recurring/repeat functionality
3. Personal project sharing with specific users
4. Task dependencies and subtasks

### Authorization Logic

```typescript
// Simplified authorization for personal projects
function canAccessProject(user: User, project: Project): boolean {
  if (project.isPersonal) {
    return project.ownerId === user.id;
  }
  
  // Existing logic for organization projects
  return project.ownerId === user.id || 
         project.members.some(m => m.userId === user.id);
}
```

### API Endpoints

```typescript
// New/Modified endpoints
GET    /api/todos/my-tasks     // All tasks assigned to current user
GET    /api/projects/personal  // User's personal projects
POST   /api/projects           // Accept isPersonal flag
GET    /api/todos/unassigned   // Standalone tasks (no project)
PATCH  /api/todos/:id/state    // Update task state (for drag-drop)
```

### UI/UX Design - My Todo Page

#### Current Problems
- Tabbed interface separates tasks unnaturally
- No visual project context
- Difficult to see overall workload
- No quick state transitions

#### Proposed New Design

**Layout Structure**:
```
My Tasks
├── Standalone Tasks (no project)
│   ├── Not Started    [task] [task] [task]
│   ├── In Progress    [task] [task]
│   ├── Waiting For    [task]
│   └── Done          [task] [task]
│
├── Project: Home Renovation (Personal)
│   ├── Not Started    [task] [task]
│   ├── In Progress    [task]
│   ├── Waiting For    [empty]
│   └── Done          [task] [task] [task]
│
└── Project: Maix Feature X (Organization)
    ├── Not Started    [task]
    ├── In Progress    [task] [task]
    ├── Waiting For    [task]
    └── Done          [task]
```

**Key Features**:
1. **Project Grouping**: Tasks organized by project first
2. **State Columns**: Within each project, tasks grouped by state
3. **Drag and Drop**: Drag tasks between states or projects
4. **Visual Indicators**: 
   - Personal projects marked with 🏠 or similar icon
   - Organization projects with 🏢 icon
   - Overdue tasks highlighted
5. **Quick Actions**:
   - Click to expand task details
   - Right-click for context menu
   - Keyboard shortcuts for state transitions
6. **Collapsible Sections**: Projects can be collapsed to reduce clutter
7. **Add Task**: "+" button in each state column for quick task creation

**Interaction Patterns**:
```typescript
// Drag task to new state
onDragEnd(taskId: string, newState: TodoStatus, newProjectId?: string) {
  updateTask(taskId, { 
    status: newState, 
    projectId: newProjectId 
  });
}

// Quick add task
onQuickAdd(projectId: string, state: TodoStatus, title: string) {
  createTask({ 
    title, 
    projectId, 
    status: state,
    assigneeId: currentUser.id 
  });
}
```

**Mobile Considerations**:
- Swipe gestures for state transitions
- Tap and hold to enter reorder mode
- Horizontal scroll for state columns if needed

### Migration Strategy

1. **Add new fields with defaults**
   - `isPersonal: false` for existing projects
   - Map existing TodoStatus values to new enum

2. **No data migration needed**
   - Existing projects remain organizational
   - Existing todos keep current status

3. **Backward compatible**
   - Old clients continue working
   - New features are additive

## Risk Analysis

### Technical Risks
- **Low**: Schema changes are additive
- **Low**: No breaking changes to existing APIs
- **Medium**: State machine complexity for todo transitions

### Business Risks
- **Low**: Personal projects isolated from organization data
- **Medium**: User confusion between personal/org projects
- **Low**: Performance impact minimal with proper indexing

## Success Metrics

1. Users can create and manage personal projects
2. Tasks can exist without project assignment
3. Enhanced task states provide better workflow visibility
4. "My Tasks" view shows comprehensive task list
5. No regression in existing project functionality

## Next Steps

**Awaiting Alignment Phase** - Need decisions on:
1. Personal project visibility rules
2. Task movement between project types
3. Collaboration features for personal projects
4. Cascade behavior for deletions
5. Required vs optional fields for personal projects

---

*Status: DESIGN PHASE COMPLETE - Awaiting Alignment*
*Date: 2025-01-09*
*Author: Claude with Human Requirements*