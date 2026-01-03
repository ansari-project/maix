# Lessons Learned

> Consolidated from project implementations. Last updated: 2026-01-04

## Testing

### Test Behavior, Not Implementation
- Tests that check specific CSS classes or exact text strings are brittle
- Focus on user behavior and outcomes rather than implementation details
- When UI text changes, tests should still verify intent

### UI Library Testing Challenges
- Radix UI uses complex DOM manipulation that Jest doesn't fully support
- Some UI libraries require special test setup or simplified testing strategies
- Solution: Simplify tests to verify component presence rather than behavior when needed

### Test-Driven Development Value
- Writing comprehensive tests for each phase catches issues early
- Separating tests by feature area makes them easier to maintain and understand
- Update tests immediately when refactoring APIs - don't let them drift

### Integration Tests Over Unit Tests
- Use real database for service layer, API routes, data operations
- Mock only external services (email, payments, third-party APIs)
- Never mock Prisma or internal database operations

## Architecture

### Separation of Concerns - Three Orthogonal Systems
1. **RBAC System** - Controls what actions users can perform (OWNER → ADMIN → MEMBER → VIEWER)
2. **Visibility System** - Controls what entities users can see (PUBLIC → PRIVATE → DRAFT)
3. **Following System** - Controls notification subscriptions only (grants ZERO permissions)

**Key Pattern**: Never mix concerns. Following should NEVER check permissions, RBAC should NEVER check following status.

### Component Design
- Design components for reusability from the start with clear props interfaces
- Same component can be reused across different contexts (e.g., TodoDetailsPanel in event manager)
- Reduces duplication and ensures consistent UX across features

### Performance Patterns
- **Lazy Loading**: Load optional/advanced features only when user engages
- **React.memo**: Apply to layout components that re-render frequently
- **useMemo for Context Values**: Memoize context provider values to prevent cascade re-renders
- **useMemo for Calculations**: Memoize grouped/derived state calculations

### API Design Patterns
- Centralized path utilities prevent inconsistencies across codebase
- RESTful patterns work well for CRUD operations
- Batch endpoints reduce network calls

### Database Design
- Composite unique indexes prevent duplicate records
- Proper foreign keys ensure data integrity
- Indexes on query patterns improve performance

## Process

### DAPPER Methodology Value
- Design→Align→Plan→Produce→Evaluate→Revise prevents scope creep
- Each stage has clear deliverables and exit criteria
- No feature creep, no missed requirements, clear decision points

### ITRC Cycle Enforcement
- Implement→Test→Review→Commit within each phase prevents technical debt
- Evidence-based completion (test output, review continuation_ids) prevents skipped steps
- Never mark todos complete without proof of execution

### Simplification Decisions
- Accepting simplifications during Align phase removes complexity without sacrificing core value
- Start simple, add complexity only when proven necessary
- For each accepted complexity, document why simpler approach won't work

### User Experience Validation
- **A feature isn't complete until users can actually use it**
- Backend-only features provide no value
- Check user experience throughout implementation, not just at the end
- UI integration is part of "done"

### Phase-Based Delivery
- Each phase should deliver complete, testable functionality
- Small, complete increments maintain momentum
- Problems discovered early when fixes are cheap

### Session Continuity
- DAPPER + todo list enables seamless handoffs between sessions
- No time wasted remembering state or re-reading code
- Maintain detailed todos and phase documentation for all long-running projects

## Tooling

### Library Selection
- Choose modern, TypeScript-first libraries over legacy options (e.g., @dnd-kit)
- Built-in accessibility, keyboard support, and touch handling reduce custom code

### Auto-save Pattern
- Debounced auto-save provides better UX than save buttons
- Users never lose work, no cognitive load about saving
- Clear previous timeout, set new one, handle errors

### Git Workflow
- Always fetch and check remote status before pushing
- Use `git pull --rebase` to incorporate remote changes
- Keep commits atomic with descriptive messages

### Expert Consultation
- Use multiple AI models (GPT-5, Gemini Pro) for methodology improvements
- Expert review catches issues and suggests improvements early
- Valuable for process reviews, not just code reviews

## Integration

### AI Service Integration
- Always provide fallback for AI-enhanced features
- AI should be pure enhancement, traditional interface works independently
- Make AI features optional, not mandatory for core functionality

### Mobile Experience
- Design mobile experience separately, don't just adapt desktop
- Test on actual mobile devices, not just browser dev tools
- Optimize for mobile performance from day 1

### UI Framework Integration
- Some UI libraries need special test setup
- Document test simplification strategies for complex UI libraries
- Create test helpers for common patterns

## Anti-Patterns to Avoid

### Mixed Concerns
```typescript
// Bad: Following checking permissions
if (canUserSee(entity)) {
  await follow(entity)
}
```

### Scattered Configuration
```typescript
// Bad: Hardcoded paths everywhere
fetch('/api/v1/organizations/...')
fetch('/api/following/organizations/...')
```

### Backend-Only Features
- Complete API with no UI means users can't access the feature
- Backend implementation without UI integration = 0% complete from user perspective

### Over-Engineering
- Command syntax parsing would add complexity with minimal benefit
- Premature optimization before measuring impact
- Complex solutions without considering simpler alternatives

### Testing Implementation Details
- Tests that check specific CSS classes or exact text are brittle
- Write tests that focus on behavior rather than specific strings

## Patterns to Replicate

1. **DAPPER + ITRC methodology** - Systematic approach prevents issues
2. **Evidence-based completion** - Require proof before marking work done
3. **Expert consultation** - Use multiple AI models for methodology reviews
4. **Phase-based delivery** - Each phase must deliver working, testable functionality
5. **Performance-first implementation** - Optimize during development, not after
6. **Mobile-native design** - Design mobile experience independently
7. **AI as enhancement** - Make AI features optional, traditional interface primary
8. **Progressive disclosure** - Start simple, expand on user action
9. **Centralized configuration** - Single source of truth for API paths, constants

## Key Takeaways

1. **Trust the process** - Every DAPPER phase has value, even when it feels like overhead
2. **User experience is paramount** - A feature isn't done until users can use it
3. **Simplify aggressively** - Start simple, add complexity only when needed
4. **Separation of concerns** - Keep orthogonal systems completely independent
5. **Test behavior, not implementation** - Focus on outcomes, not details
6. **Document decisions** - Record why approaches were chosen or rejected

---

*Consolidated from project implementations. Sources: Following System, Todo Quick Add, Interface Redesign, Todo Redesign*
