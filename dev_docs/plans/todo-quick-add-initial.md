# Todo Quick-Add Implementation Plan

## Overview
Implement inline quick-add functionality for todos with Option B architecture (inline editable fields with adjacent buttons) based on the aligned design.

## Phase 1: Add Quick-Add Component

### Objective
Create a reusable QuickAddTodo component that provides inline todo creation.

### Tasks (ITRC Structure)

#### Phase 1-I: Implement
1. Create `src/components/todos/quick-add-todo.tsx` component
   - Input field with placeholder "Add a new todo..."
   - Adjacent Add button that appears on focus/hover/content
   - Local state management with useState
   - Loading and error states
2. Add hover detection logic
3. Implement keyboard support (Enter to submit)
4. Add accessibility attributes (role="alert" for errors)

#### Phase 1-T: Test
1. Write unit tests for QuickAddTodo component
   - Test button visibility logic
   - Test form submission
   - Test error handling
   - Test keyboard interaction
2. Run tests and ensure all pass

#### Phase 1-R: Review
1. Run code review with mcp__zen__codereview
2. Address any identified issues
3. Verify accessibility compliance

#### Phase 1-C: Commit & Push
1. Stage changes
2. Commit with message: "feat: Phase 1 - Add QuickAddTodo component"
3. Push to remote repository

### Success Criteria
- [ ] Component renders correctly
- [ ] Button appears/hides based on focus/hover/content
- [ ] Form submission works
- [ ] Error states display properly
- [ ] All tests passing
- [ ] Code reviewed and issues addressed

### Dependencies
- Existing Button and Input components from shadcn/ui
- Existing API endpoint for todo creation

---

## Phase 2: Integrate Quick-Add into Todo Lists

### Objective
Add QuickAddTodo component to each status group in the todo list.

### Tasks (ITRC Structure)

#### Phase 2-I: Implement
1. Update `src/components/todos/todo-list.tsx`
   - Add QuickAddTodo at bottom of each status group
   - Pass appropriate props (projectId, onTodoCreated callback)
   - Handle todo creation and list updates
2. Ensure quick-add appears in ALL groups (including Completed)
3. Default status to "NOT_STARTED" for all groups (per simplification)

#### Phase 2-T: Test
1. Write integration tests for todo-list with quick-add
   - Test quick-add in each status group
   - Test list updates after creation
   - Test multiple quick-adds
2. Manual testing on desktop and mobile

#### Phase 2-R: Review
1. Run code review focusing on integration points
2. Verify no regression in existing functionality
3. Check mobile responsiveness

#### Phase 2-C: Commit & Push
1. Stage changes
2. Commit with message: "feat: Phase 2 - Integrate quick-add into todo lists"
3. Push to remote repository

### Success Criteria
- [ ] Quick-add appears in all status groups
- [ ] Todos created successfully from any group
- [ ] List updates immediately after creation
- [ ] Mobile experience works as expected
- [ ] All tests passing

### Dependencies
- Phase 1 completed (QuickAddTodo component)

---

## Phase 3: Update Empty States

### Objective
Improve empty state to show clear call-to-action for todo creation.

### Tasks (ITRC Structure)

#### Phase 3-I: Implement
1. Update empty state in `todo-list.tsx`
   - Replace "No todos yet" with actionable CTA
   - Add "Create first todo" button
   - Button triggers same creation flow as quick-add
2. Ensure consistent empty state across all views
3. Maintain visual hierarchy

#### Phase 3-T: Test
1. Test empty state behavior
   - Verify CTA button appears when no todos
   - Test button functionality
   - Verify state updates after first todo
2. Test filtered empty states

#### Phase 3-R: Review
1. Review UX consistency
2. Verify empty state messaging
3. Check visual design alignment

#### Phase 3-C: Commit & Push
1. Stage changes
2. Commit with message: "feat: Phase 3 - Update empty states with CTA"
3. Push to remote repository

### Success Criteria
- [ ] Empty state shows clear CTA
- [ ] CTA button triggers todo creation
- [ ] Consistent behavior across views
- [ ] All tests passing

### Dependencies
- Phase 2 completed (integration working)

---

## Phase 4: Support Project Groups

### Objective
Extend quick-add to work with project grouping views (including Uncategorized group).

### Tasks (ITRC Structure)

#### Phase 4-I: Implement
1. Update project grouping components if they exist
   - Add QuickAddTodo to Uncategorized group
   - Ensure consistent behavior with status groups
2. Handle projectId correctly for grouped views
3. Test with various project configurations

#### Phase 4-T: Test
1. Test quick-add in project groups
   - Test Uncategorized group specifically
   - Test with multiple projects
   - Verify correct project association
2. Integration testing

#### Phase 4-R: Review
1. Review project integration
2. Verify no cross-project issues
3. Check data integrity

#### Phase 4-C: Commit & Push
1. Stage changes
2. Commit with message: "feat: Phase 4 - Support quick-add in project groups"
3. Push to remote repository

### Success Criteria
- [ ] Quick-add works in project groups
- [ ] Uncategorized group has quick-add
- [ ] Correct project associations
- [ ] All tests passing

### Dependencies
- Phase 3 completed

---

## Phase 5: Polish and Optimization

### Objective
Final polish, performance optimization, and documentation updates.

### Tasks (ITRC Structure)

#### Phase 5-I: Implement
1. Performance optimizations
   - Lazy load quick-add components if needed
   - Optimize re-renders
2. Visual polish
   - Ensure consistent styling
   - Add obvious visual indicators per decision
3. Update any related documentation

#### Phase 5-T: Test
1. Performance testing
   - Measure render performance
   - Test with large todo lists
2. Cross-browser testing
3. Final regression testing

#### Phase 5-R: Review
1. Final comprehensive review
2. Performance metrics review
3. Documentation review

#### Phase 5-C: Commit & Push
1. Stage all remaining changes
2. Commit with message: "feat: Phase 5 - Polish and optimize quick-add"
3. Push to remote repository

### Success Criteria
- [ ] No performance degradation
- [ ] Consistent visual design
- [ ] Documentation updated
- [ ] All tests passing
- [ ] Feature complete

### Dependencies
- All previous phases completed

---

## Risk Management

### Potential Risks
1. **Performance Impact**: Mitigated by lazy loading
2. **Mobile Usability**: Mitigated by thorough testing
3. **State Management Complexity**: Mitigated by local state approach
4. **Accessibility Issues**: Mitigated by proper ARIA attributes

### Rollback Plan
Each phase is independently deployable. If issues arise:
1. Revert last commit
2. Fix identified issues
3. Re-test thoroughly
4. Re-deploy

---

## Timeline Estimate
- Phase 1: 1-2 hours (component creation)
- Phase 2: 1-2 hours (integration)
- Phase 3: 30 minutes (empty states)
- Phase 4: 1 hour (project groups)
- Phase 5: 1 hour (polish)

Total: 4-6 hours of implementation time

---

## Definition of Done
- [ ] All phases completed with ITRC cycles
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] No regressions in existing functionality
- [ ] Documentation updated
- [ ] Feature working on desktop and mobile
- [ ] Accessibility verified

---

**Status:** Plan reviewed by expert models and validated as comprehensive and well-structured. Ready for human review.