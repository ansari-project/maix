# Following System Design - Final (Revised)

## Problem Statement & Requirements

### Nature of the Problem
We need to implement a notification subscription system that allows users to "follow" organizations, projects, and products to receive updates about their activities. This is **NOT a permission system** - following grants zero additional access and is purely about notification preferences.

### Why This Problem Needs Solving
Currently, users must manually check entities for updates or rely on being a member to receive notifications. There's no way for interested external users to subscribe to public entity updates without joining as members. Following fills this gap by providing:
- **Update subscriptions** without membership obligations
- **Notification preferences** for entities users can already see
- **Discovery mechanism** through activity feeds
- **User control** over what updates they receive

### Three Orthogonal Systems (Critical Architecture)

**IMPORTANT**: The platform has three completely separate, independent systems:

1. **RBAC (Role-Based Access Control)**
   - Controls what **actions** users can perform
   - Hierarchy: VIEWER → MEMBER → ADMIN → OWNER
   - Determines: Can user edit? Delete? Invite? Manage?

2. **Visibility System**
   - Controls what **entities** users can see
   - Levels: PRIVATE → ORG_VISIBLE → PUBLIC
   - Determines: Can user view this entity at all?

3. **Following System (This Design)**
   - Controls what **notifications** users receive
   - Binary: FOLLOWING / NOT FOLLOWING
   - Determines: Does user get notified about updates?
   - **NEVER affects access or permissions**

### Functional Requirements
1. **Follow/Unfollow Actions**: Users can follow/unfollow entities they can already see
2. **Visibility-Gated Following**: Can only follow what visibility rules allow you to see
3. **Notification Delivery**: Followers receive notifications about entity updates
4. **Activity Feeds**: Users can view a feed of updates from followed entities
5. **Follow Management**: Users can manage their subscriptions in one place
6. **No Permission Changes**: Following never grants access to anything

### Non-Functional Requirements
- **Performance**: Handle 10K+ followers per entity efficiently
- **Scalability**: Asynchronous notification generation for large follower counts
- **Security**: Following cannot bypass visibility or RBAC rules
- **Clarity**: Users understand following = notifications only

### Success Criteria
- Users can subscribe to updates from visible entities
- Following provides zero additional access or permissions
- Notifications respect visibility rules at delivery time
- Clear separation from RBAC and visibility systems

---

## Alignment Outcomes

### Architecture Decision: **[REVISED]** Clean Separation of Concerns
**Rationale**: Following is purely a notification subscription system, completely orthogonal to RBAC and visibility. This matches industry best practices (GitHub, GitLab, Asana) and prevents security vulnerabilities.

### Entity Scope: **[DECIDED]** All Entity Types Simultaneously
**Rationale**: Implement for organizations, projects, and products from the start for complete consistency.

### Role System Unification: **[DECIDED]** Unify OrgRole and UnifiedRole
**Rationale**: Take this opportunity to clean up the inconsistent role architecture (separate from following).

### Following Permissions: **[REVISED]** Zero Additional Access
**Rationale**: Following is ONLY about notifications. Followers see exactly what non-followers see based on visibility rules. No special access, no additional permissions.

### Expert Consensus:
- **Gemini (9/10 confidence)**: Strong recommendation for clean separation
- **GPT-5**: "Choose B. Keep RBAC for what you can do, Visibility for what you can see, Following for what you hear about"
- **Unanimous agreement**: Conflating systems creates security risks and technical debt

---

## Final Architecture

### Database Schema
```sql
-- Following is purely for notifications
model Following {
  id             String   @id @default(cuid())
  userId         String
  followableId   String
  followableType FollowableType // ORGANIZATION, PROJECT, PRODUCT
  followedAt     DateTime @default(now())
  notificationsEnabled Boolean @default(true)
  
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, followableId, followableType])
  @@index([followableId, followableType])  -- For getFollowers queries
  @@index([userId, followableType])        -- For getUserFollowing queries
  @@index([followedAt])
}

enum FollowableType {
  ORGANIZATION
  PROJECT  
  PRODUCT
}

-- Unify role systems (separate concern from following)
enum UnifiedRole {
  OWNER
  ADMIN  
  MEMBER
  VIEWER
}

-- Update OrganizationMember to use UnifiedRole
model OrganizationMember {
  // ... existing fields ...
  role           UnifiedRole  // Changed from OrgRole
  // ... rest unchanged ...
}
```

### Permission Model

**Critical**: Following provides **ZERO additional access or permissions**.

```typescript
// RBAC Check (determines actions)
function canUserPerformAction(user, action, entity) {
  // Check user's role via member tables
  // NEVER reads Following table
}

// Visibility Check (determines viewing)
function canUserSee(user, entity) {
  // Check entity visibility (PUBLIC, ORG_VISIBLE, PRIVATE)
  // Check user's membership if needed
  // NEVER reads Following table
}

// Following Check (determines notifications only)
function isUserFollowing(user, entity) {
  // ONLY used for notification routing
  // NEVER affects access control
}
```

### Following Rules

1. **Follow Requirements**:
   - User must be authenticated
   - User must have view permission (via visibility system)
   - Cannot follow yourself (for user entities if added later)

2. **Notification Delivery**:
   - Always re-check visibility at delivery time
   - If follower loses view access, silently skip notification
   - No need to delete follow records when visibility changes

3. **Follow Management**:
   - Can unfollow even if you lost view access (cleanup allowed)
   - Follow counts only visible to those who can see the entity
   - Follow lists respect entity visibility

### Notification Architecture

**Asynchronous Processing** (Critical for scale):
1. Entity posts update → Event published
2. Background job fetches followers
3. For each follower batch:
   - Check visibility at delivery time
   - Create notification if user can still see entity
   - Skip silently if user lost access
4. Notifications delivered via user's preferred channels

**Performance Considerations**:
- Batch processing (1000 followers per job)
- Index optimization for follower queries
- Delivery-time visibility checks prevent stale access

---

## Implementation Phases (Revised)

### Phase 1: Database Migration & Core Schema
- Add Following table with proper indexes
- Add FollowableType enum
- Begin role unification (add unifiedRole field)
- **NO permission logic in Following table**

### Phase 2: Role System Unification
- Safely migrate OrganizationMember to UnifiedRole
- Use expand-and-contract pattern
- **Separate from following logic entirely**

### Phase 3: Following Service Layer
- Implement follow/unfollow operations
- **Enforce visibility checks on follow**
- **Never grant permissions via following**
- Service methods for notification system only

### Phase 4: REST API Endpoints
- Follow/unfollow endpoints
- **Must pass visibility check to follow**
- List endpoints for followers/following
- **No access control via following**

### Phase 5: Async Notification System
- Background job infrastructure
- **Visibility re-check at delivery time**
- Batch processing for scale
- Activity feed generation

### Phase 6: UI Components
- Follow/unfollow buttons
- Following management interface
- Activity feed display
- **Clear messaging: "Follow for updates"**

### Phase 7: Role Migration Completion
- Finalize UnifiedRole migration
- Remove OrgRole enum
- **Still separate from following**

---

## Migration Strategy

### From Conflated Design to Clean Separation

1. **Audit Permission Checks**:
   - Find any code checking follower status for access
   - Remove ALL permission logic based on following
   - Replace with proper RBAC/visibility checks

2. **Update API Contracts**:
   - Follow endpoints only affect notifications
   - No "follower can view" or similar permissions
   - Clear documentation of separation

3. **Add Safety Checks**:
   - Follow creation requires canUserSee()
   - Notification delivery requires canUserSee()
   - Never use following for access decisions

4. **UI/UX Clarity**:
   - "Follow" button says "Get updates" or "Subscribe"
   - Help text: "Following lets you receive notifications"
   - Never imply access changes from following

---

## Security Considerations

### What Following is NOT
- ❌ NOT a permission level
- ❌ NOT a way to grant access
- ❌ NOT a visibility modifier
- ❌ NOT part of RBAC

### Security Boundaries
- Following table is NEVER read during authorization
- Visibility changes don't require follow cleanup
- Follow state cannot bypass any access controls
- Notification delivery enforces visibility

### Testing Requirements
- Verify follower with no visibility gets NO notifications
- Verify follow action requires current visibility
- Verify no permission checks read Following table
- Verify visibility loss stops notifications

---

## Expert Review Complete: **[APPROVED]**

Both Gemini and GPT-5 unanimously recommend this clean separation of concerns. Key validations:
- Matches industry best practices (GitHub model)
- Prevents security vulnerabilities
- Reduces system complexity
- Clear user mental model
- Maintainable architecture

## Summary

The Following System is a **pure notification subscription service** that:
1. Requires visibility to follow
2. Grants zero additional permissions
3. Delivers notifications respecting current visibility
4. Remains completely independent of RBAC and visibility systems

This clean separation ensures security, clarity, and maintainability while providing users with the notification features they need.