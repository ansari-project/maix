# Todo Page Redesign

## Overview

Redesign the todo page with a modern split-pane interface featuring grouped, draggable todos on the left and an editable details panel on the right. This replaces the current basic todo list with a productivity-focused interface optimized for task management and collaboration.

## Context and Requirements

### Background

The current todo page provides basic CRUD functionality but lacks modern productivity features like grouping, drag-and-drop status changes, and detailed task views. Users need better ways to organize, prioritize, and collaborate on todos across projects and organizations.

### Core Requirements

- **Split-pane interface**: Left half shows grouped todo list, right half shows selected todo details
- **Dynamic grouping**: Group by Status, End Date, Start Date, Project, Organization
- **Status-based sorting**: Default order: Not Started → In Progress → Waiting → Completed
- **Collapsible groups**: Users can expand/collapse group sublists
- **Drag-and-drop**: Move todos between ANY groups (not just status)
- **Editable details**: Full todo editing in right panel including comments
- **Empty state**: "Click on a todo to see the details" when nothing selected

### Non-Goals

- Kanban board views (explicitly rejected by user)
- Statistics or analytics dashboard
- Calendar integration or timeline views
- Bulk operations or mass editing (use AI interface for complex operations)
- Advanced filtering beyond grouping

## Design

### High-Level Architecture

**SELECTED: Option B - Split Architecture with Separate Components**
- TodoListPane and TodoDetailsPane as independent components
- Shared state via React Context or state management library
- Event-driven communication between panes
- Modular drag-and-drop implementation
- **Rationale**: TodoDetailsPanel needs reusability in other parts of app (event manager)

### Key Technical Decisions

#### Database Schema
Current schema supports the requirements:
- `Todo` model has `status`, `dueDate`, `createdAt`, `projectId` fields
- `TodoComment` model exists for comments functionality  
- No schema changes required for basic implementation

#### Libraries and Dependencies
- **Drag-and-drop**: @dnd-kit (modern, accessible, TypeScript-first)
- **State management**: React built-in useState/useContext (simple)
- **Comments**: Existing `<Markdown>` component for rendering
- **Split panes**: Custom CSS Grid (fixed 50/50 split)

#### Critical Code Patterns
- **Grouping algorithm**: Dynamic grouping with memoized group calculations (useMemo)
- **Drag handlers**: Optimistic updates with server sync and rollback
- **Comment persistence**: Auto-save with 3-second debounced API calls
- **No virtualization**: Expected <50 todos per user

### Integration Points

#### API Endpoints
- `PATCH /api/todos/[id]` - Update todo via drag-and-drop (any field, not just status)
- `POST /api/todos/[id]/comments` - Add comments to todos
- `GET /api/todos` - Fetch todos with grouping/sorting parameters

#### MCP Tools
- Leverage existing `mcp__maix__maix_manage_todo` tool
- `mcp__maix__maix_search_todos` for filtering and grouping

#### UI Components
- **TodoGroupList**: Collapsible groups with drag zones
- **TodoDetailsPanel**: Editable form with comments section (REUSABLE)
- **TodoDragItem**: Draggable todo item with status indicators
- **CommentThread**: Simple flat comments (no threading)

## Success Criteria

- Users can group todos by any of the 5 specified criteria
- Drag-and-drop works between ANY group types (not just status)
- Details panel provides full editing capabilities with auto-save
- Comments system allows team collaboration with simple flat structure
- Interface remains responsive with <50 todos
- Zero layout shifts during drag operations
- TodoDetailsPanel can be reused in event manager and other contexts

## Proposed Simplifications

1. **Static Grouping Over Dynamic** - **[REJECTED]**
   - Current approach: User can switch between 5 grouping options dynamically
   - Simplified approach: Default to Status grouping only, add others later
   - Trade-offs: Reduced initial complexity vs less user flexibility  
   - **Decision**: REJECTED - Need dynamic grouping from start

2. **Basic Drag-and-Drop Over Advanced** - **[ACCEPTED]**
   - Current approach: Full drag-and-drop with visual feedback, animations, multi-drop
   - Simplified approach: Simple drag between groups only
   - Trade-offs: Faster implementation vs reduced UX polish
   - **Decision**: ACCEPTED - Focus on core functionality first

3. **Auto-save Over Manual Save** - **[ACCEPTED]**
   - Current approach: Explicit save buttons for todo details
   - Simplified approach: Auto-save changes with debounced API calls  
   - Trade-offs: Better UX vs potential data loss on network issues
   - **Decision**: ACCEPTED - 3-second debounce with error handling

4. **In-memory Comments Over Real-time** - **[ACCEPTED WITH MODIFICATION]**
   - Current approach: Real-time comment updates with WebSocket
   - Simplified approach: Comments refresh on todo selection
   - Trade-offs: Simpler implementation vs less collaborative feel
   - **Decision**: ACCEPTED - However local updates (not from other users) must be real-time

5. **CSS Grid Layout Over Split-pane Library** - **[ACCEPTED]**
   - Current approach: Import react-split-pane for resizable panels
   - Simplified approach: Fixed 50/50 split with CSS Grid
   - Trade-offs: No resize capability vs zero dependencies
   - **Decision**: ACCEPTED - Fixed layout is sufficient

6. **Single Status Update Over Batch Operations** - **[ACCEPTED]**
   - Current approach: Support multi-select and batch status updates
   - Simplified approach: One todo status change per drag operation
   - Trade-offs: More user clicks vs simpler state management
   - **Decision**: ACCEPTED - For complex operations use AI interface

7. **Local State Over Complex State Management** - **[ACCEPTED]**
   - Current approach: Zustand or Redux for complex state management
   - Simplified approach: React useState and useContext
   - Trade-offs: Less scalable vs simpler and fewer dependencies
   - **Decision**: ACCEPTED - Component state sufficient for scope

8. **Basic Virtualization Over Advanced** - **[ACCEPTED]**
   - Current approach: Full virtual scrolling with dynamic heights
   - Simplified approach: Simple pagination or basic virtualization
   - Trade-offs: Less smooth scrolling vs easier implementation
   - **Decision**: ACCEPTED - No virtualization needed for <50 todos

## Open Questions - RESOLVED

1. **Business Logic**: Should drag-and-drop be restricted to status changes only?
   - **DECISION**: No - drag-and-drop should work between ALL group types
   - **Impact**: Requires more complex drag handlers and state management

2. **Data Persistence**: How should comment threading work for todos?
   - **DECISION**: Simple comment lists for now (no threading)
   - **Impact**: Simpler database schema and UI implementation

3. **User Experience**: Should collapsed state persist across sessions?
   - **DECISION**: Session only (no persistence)
   - **Impact**: Simpler state management, no localStorage or server storage

4. **Performance**: What's the maximum expected todos per user?
   - **DECISION**: <50 todos per user
   - **Impact**: No virtualization needed, simpler rendering

5. **Integration**: Should personal todos and project todos be mixed in the same view?
   - **DECISION**: Unified view (show both together)
   - **Impact**: Single data source, unified grouping algorithms

---

## Alignment Summary

### Key Architecture Changes
- **Architecture**: Changed from Option A to Option B for component reusability
- **Drag-and-drop scope**: Expanded from status-only to all group types
- **Grouping**: Rejected static grouping - need dynamic from start
- **Performance**: Confirmed <50 todos, no virtualization needed

### Implementation Priorities
1. **Dynamic grouping system** - All 5 group types from Phase 1
2. **Universal drag-and-drop** - Between any group types, not just status
3. **Component reusability** - TodoDetailsPanel must work standalone
4. **Auto-save with optimistic updates** - Local changes immediate, remote sync background
5. **Simple flat comments** - No threading complexity

### Technical Constraints Confirmed
- Fixed 50/50 CSS Grid layout (no resizing)
- Session-only collapsed state (no persistence)
- useState/useContext for state management (no complex libraries)
- Memoized grouping calculations for performance
- Expected scale: <50 todos per user

**Design phase complete. Ready for DAPPER Plan phase with expert review.**