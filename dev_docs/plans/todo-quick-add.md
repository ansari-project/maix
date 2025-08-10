# Todo Quick-Add Implementation Plan

## Overview
Implement inline quick-add functionality for todos using a Progressive Disclosure approach based on the aligned design. The quick-add will start simple (title only) and can expand to show additional fields.

## Architectural Approach

### Progressive Disclosure Pattern
Based on expert review and user requirements, we'll implement a hybrid approach:

1. **Default State**: Simple single-line text input for title
2. **Expanded State**: Shows additional fields on demand:
   - Project selection (typeahead, default: uncategorized)
   - Status selection (dropdown, default: Not Started)
   - Start date (date picker, default: today)
   - End date (date picker, optional)
3. **Trigger**: Expand icon button next to input (+ keyboard shortcut Tab or Cmd+Shift+A)

This preserves the "quick" nature while supporting advanced options when needed.

---

## Phase 1: Create QuickAddTodo Component with Progressive Disclosure

### Objective
Create a reusable QuickAddTodo component that starts simple and can expand to show more fields.

### Tasks (ITRC Structure)

#### Phase 1-I: Implement
1. Create `src/components/todos/quick-add-todo.tsx` component
   - Simple title input as default state
   - Expand button (icon) to show advanced fields
   - Collapsible panel with:
     - Project typeahead/autocomplete (default: uncategorized)
     - Status dropdown (default: NOT_STARTED)
     - Start date picker (default: today)
     - End date picker (optional, no default)
   - Adjacent Add button that appears on focus/hover/content
   - Local state management with useState
   - Loading and error states
2. Add hover detection logic for button visibility
3. Implement keyboard support:
   - Enter to submit (from title field)
   - Tab to expand advanced fields
   - Cmd+Shift+A as alternate expand shortcut
4. Add accessibility attributes (role="alert" for errors, proper ARIA for collapsible)

#### Phase 1-T: Test
1. Write unit tests for QuickAddTodo component
   - Test progressive disclosure (expand/collapse)
   - Test field defaults
   - Test button visibility logic
   - Test form submission with minimal and full data
   - Test error handling
   - Test keyboard interactions
2. Run tests and ensure all pass

#### Phase 1-R: Review
1. Run code review with mcp__zen__codereview
2. Address any identified issues
3. Verify accessibility compliance
4. Check progressive disclosure UX

#### Phase 1-C: Commit & Push
1. Stage changes
2. Commit with message: "feat: Phase 1 - Add QuickAddTodo component with progressive disclosure"
3. Push to remote repository

### Success Criteria
- [ ] Component renders in simple mode by default
- [ ] Expands to show all fields on trigger
- [ ] All field defaults work correctly
- [ ] Button appears/hides based on focus/hover/content
- [ ] Form submission works with minimal and full data
- [ ] Error states display properly
- [ ] All tests passing
- [ ] Code reviewed and issues addressed

### Dependencies
- Existing Button, Input, Select components from shadcn/ui
- Date picker component (may need to add if not present)
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
   - Ensure created todo respects expanded field values
2. Ensure quick-add appears in ALL groups (including Completed)
3. Wire up project selection to actual projects list
4. Ensure status from expanded form overrides group context

#### Phase 2-T: Test
1. Write integration tests for todo-list with quick-add
   - Test quick-add in each status group
   - Test that expanded fields are respected
   - Test list updates after creation
   - Test multiple quick-adds
2. Manual testing on desktop and mobile
3. Test project selection functionality

#### Phase 2-R: Review
1. Run code review focusing on integration points
2. Verify no regression in existing functionality
3. Check mobile responsiveness
4. Verify progressive disclosure works in context

#### Phase 2-C: Commit & Push
1. Stage changes
2. Commit with message: "feat: Phase 2 - Integrate progressive quick-add into todo lists"
3. Push to remote repository

### Success Criteria
- [ ] Quick-add appears in all status groups
- [ ] Todos created successfully with all field values
- [ ] List updates immediately after creation
- [ ] Mobile experience works as expected
- [ ] Progressive disclosure smooth in list context
- [ ] All tests passing

### Dependencies
- Phase 1 completed (QuickAddTodo component)
- Projects data available for typeahead

---

## Phase 3: Update Empty States

### Objective
Improve empty state to show clear call-to-action for todo creation.

### Tasks (ITRC Structure)

#### Phase 3-I: Implement
1. Update empty state in `todo-list.tsx`
   - Replace "No todos yet" with actionable CTA
   - Add "Create first todo" button
   - Button triggers quick-add in default (simple) mode
2. Ensure consistent empty state across all views
3. Maintain visual hierarchy

#### Phase 3-T: Test
1. Test empty state behavior
   - Verify CTA button appears when no todos
   - Test button triggers quick-add
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
- [ ] CTA button triggers quick-add
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
   - Add QuickAddTodo to all project groups
   - Ensure consistent behavior with status groups
2. Handle projectId correctly for grouped views
   - Pre-select project in expanded form based on group
   - Allow override via project selector
3. Test with various project configurations

#### Phase 4-T: Test
1. Test quick-add in project groups
   - Test Uncategorized group specifically
   - Test project pre-selection
   - Test project override capability
   - Verify correct project association
2. Integration testing with multiple projects

#### Phase 4-R: Review
1. Review project integration
2. Verify no cross-project issues
3. Check data integrity
4. Verify project context handling

#### Phase 4-C: Commit & Push
1. Stage changes
2. Commit with message: "feat: Phase 4 - Support quick-add in project groups"
3. Push to remote repository

### Success Criteria
- [ ] Quick-add works in all project groups
- [ ] Uncategorized group has quick-add
- [ ] Project pre-selection works correctly
- [ ] Correct project associations maintained
- [ ] All tests passing

### Dependencies
- Phase 3 completed
- Project grouping views exist

---

## Phase 5: Polish and Optimization

### Objective
Final polish, performance optimization, and documentation updates.

### Tasks (ITRC Structure)

#### Phase 5-I: Implement
1. Performance optimizations
   - Lazy load date picker component
   - Optimize typeahead queries
   - Minimize re-renders
2. Visual polish
   - Ensure smooth expand/collapse animation
   - Polish field layouts in expanded mode
   - Add obvious visual indicators per decision
3. Add power-user enhancements (stretch goal)
   - Simple command syntax parsing (/p:project /due:tomorrow)
   - Only if time permits
4. Update related documentation

#### Phase 5-T: Test
1. Performance testing
   - Measure render performance
   - Test with large project lists
   - Test typeahead responsiveness
2. Cross-browser testing
3. Final regression testing
4. Test command syntax if implemented

#### Phase 5-R: Review
1. Final comprehensive review
2. Performance metrics review
3. Documentation review
4. UX polish review

#### Phase 5-C: Commit & Push
1. Stage all remaining changes
2. Commit with message: "feat: Phase 5 - Polish and optimize progressive quick-add"
3. Push to remote repository

### Success Criteria
- [ ] No performance degradation
- [ ] Smooth expand/collapse animation
- [ ] Consistent visual design
- [ ] Documentation updated
- [ ] All tests passing
- [ ] Feature complete

### Dependencies
- All previous phases completed

---

## Risk Management

### Potential Risks
1. **Complexity of Progressive Disclosure**: Mitigated by keeping initial state simple
2. **Date Picker Component**: May need to add/integrate if not present
3. **Typeahead Performance**: Mitigated by debouncing and query optimization
4. **Mobile Expanded State**: Mitigated by responsive design testing

### Rollback Plan
Each phase is independently deployable. If issues arise:
1. Revert last commit
2. Fix identified issues
3. Re-test thoroughly
4. Re-deploy

---

## Expert Review Summary

The progressive disclosure approach was validated by expert analysis as the optimal solution because it:
- Preserves the "quick" nature of quick-add for simple cases
- Provides advanced options without cluttering the default UI
- Offers better discoverability than command syntax alone
- Avoids the complexity and ambiguity of NLP parsing
- Creates a layered experience suitable for both beginners and power users

---

## Definition of Done
- [ ] All phases completed with ITRC cycles
- [ ] Progressive disclosure working smoothly
- [ ] All fields functional with proper defaults
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] No regressions in existing functionality
- [ ] Documentation updated
- [ ] Feature working on desktop and mobile
- [ ] Accessibility verified

---

**Status:** Plan approved and ready for implementation