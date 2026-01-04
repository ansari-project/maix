# Review: Following System Implementation

**ID**: 0002
**Status**: integrated
**Feature**: Following System (Notification Subscriptions)
**Date**: 2025-08-11
**Migrated from**: dev_docs/lessons/following-system.md

## Summary

The Following System provides notification subscription functionality for Maix, allowing users to "Get Updates" on organizations, projects, tasks, and users. The key architectural decision was maintaining complete separation from RBAC and Visibility systems - following grants ZERO permissions.

## What Went Well

### Clear Architectural Separation
- Maintained complete separation between Following, RBAC, and Visibility systems
- Following grants ZERO permissions - purely for notifications
- Clean implementation with no permission confusion

### Phased Implementation
- 7 phases allowed incremental progress with clear milestones
- Could validate each layer before building the next
- Caught issues early (e.g., API path mismatches)

### User Feedback Integration
- Immediate simplification when user said "I don't think we need the dual write stuff"
- Cleaner code without unnecessary complexity

### Design-First Development
- DAPPER design phase clarified architecture upfront
- Avoided permission system confusion from the start
- No major architectural changes during implementation

## Challenges Encountered

### UI Integration Oversight
- Built complete backend but UI wasn't accessible to users initially
- Discovery during Evaluate phase prompted adding FollowButton to entity pages
- **Lesson**: Verify user-facing integration during implementation, not just at the end

### Test Maintenance
- Tests broke when API paths changed from `/api/v1/` to `/api/following/`
- 27 failing tests blocking commits
- **Lesson**: Update tests immediately when refactoring APIs

### Migration Complexity
- Initial design included complex UnifiedRole dual-write migration
- User feedback showed it wasn't needed
- **Lesson**: Start simple, add complexity only when proven necessary

## Key Patterns

### Pure Service Layer
```typescript
// Service handles business logic, not permissions
class FollowingService {
  async follow(input) {
    // Caller must check permissions
    // Service only handles following logic
  }
}
```

### Clear Messaging
```typescript
// Clear that this is notifications only
<Button>Get Updates</Button>
// Not: <Button>Follow</Button>
```

### Centralized Configuration
```typescript
export const followingApiPaths = {
  followers: (type, id) => `/api/following/${type}/${id}/followers`
}
```

## Recommendations

1. **Always Have a User-Facing Component** - Even if minimal, make features accessible
2. **Test API Contracts Continuously** - Don't let tests drift from implementation
3. **Implement Core Functionality First** - Notifications should have been in MVP
4. **Use DAPPER Evaluation Seriously** - Check user experience, not just code
5. **Simplify Aggressively** - Start simple, add complexity only when needed

## Impact on Process

Added to Evaluate phase checklist:
- [ ] Can users discover the feature?
- [ ] Can users use the feature end-to-end?
- [ ] Is the feature's purpose clear to users?
- [ ] Are success/error states visible?

## Verdict

**Success Level**: 85% - Feature is usable and architecturally sound, but missing notification delivery

**Key Takeaway**: The Following system proves that clean architectural separation and clear messaging can prevent permission confusion in social features. A feature isn't complete until users can actually use it.

---

*Migrated from DAPPER lessons to codev structure on 2026-01-04*
