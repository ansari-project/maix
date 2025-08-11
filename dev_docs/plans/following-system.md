# Following System Implementation Plan - Final (Revised)

## Overview
Implement a **pure notification subscription system** for organizations, projects, and products. Following grants **ZERO additional permissions** - it only controls who receives notifications about entity updates.

**Critical Architecture Principle**: Complete separation of concerns between:
- **RBAC**: Controls actions (edit, delete, manage) 
- **Visibility**: Controls viewing (public, org-visible, private)
- **Following**: Controls notifications (subscribed/not subscribed)

**Key Implementation Rules**:
1. Following table is NEVER read during authorization
2. Must have visibility to follow an entity
3. Notifications re-check visibility at delivery time
4. Following grants no access whatsoever

## Phase Structure (Revised for Clean Separation)

### Phase 1: Database Migration & Core Schema
**Objective**: Establish database foundation as pure notification subscription system

#### Phase 1-I: Implement - Database Schema for Notifications Only
- Add `Following` table as notification subscription tracker:
  ```sql
  model Following {
    id             String   @id @default(cuid())
    userId         String
    followableId   String
    followableType FollowableType
    followedAt     DateTime @default(now())
    notificationsEnabled Boolean @default(true)
    
    @@unique([userId, followableId, followableType])
    @@index([followableId, followableType])  -- For getFollowers()
    @@index([userId, followableType])        -- For getUserFollowing()
  }
  ```
- Add `FollowableType` enum (ORGANIZATION, PROJECT, PRODUCT)
- Add nullable `unifiedRole` field to `OrganizationMember` (for separate role unification)
- **CRITICAL**: No permission or visibility fields in Following table

**Success Criteria**: 
- Following table created as pure subscription tracker
- Proper indexes for 10K+ follower queries
- No access control logic in schema
- Migration applies successfully

#### Phase 1-T: Test - Verify Notification-Only Schema
- Test Following table CRUD operations
- Test uniqueness constraints work properly
- Verify NO permission logic in Following table
- **Performance test**: Verify index-only scans for follower counts
- Test that Following has no FK relationships to permission tables

**Success Criteria**:
- Following operations are independent of permissions
- Queries use index-only scans for performance
- No ability to grant access via Following

#### Phase 1-R: Review - Separation of Concerns Validation
- Review schema ensures clean separation
- Verify no permission leakage possible
- Validate notification-only design
- Check indexes for scale requirements

**Success Criteria**:
- Expert confirms clean separation
- No security vulnerabilities identified
- Performance strategy validated

#### Phase 1-C: Commit & Push - Notification Schema
- Commit with message emphasizing notification-only design
- Push changes to repository
- Document separation of concerns in commit

**Success Criteria**:
- Schema committed as notification system
- Clear documentation of intent

---

### Phase 2: Role System Unification (Separate Concern)
**Objective**: Unify role systems - completely separate from following

#### Phase 2-I: Implement - Role Unification (Not Following Related)
- Update OrganizationMember operations to dual-write `role` and `unifiedRole`
- **Feature flag** for emergency rollback
- **Batched, idempotent** backfill script
- **Monitoring** for field discrepancies
- **CRITICAL**: This is RBAC work, not following work

**Success Criteria**:
- Role unification in progress
- No impact on following system
- Complete separation maintained

#### Phase 2-T: Test - Role System Only
- Test dual-write functionality
- Test backfill idempotency
- Test monitoring detects issues
- **Verify**: No following logic involved

**Success Criteria**:
- Role migration working independently
- Following system unaffected

#### Phase 2-R: Review - RBAC Migration Review
- Review role migration safety
- Confirm separation from following
- Validate zero-downtime approach

**Success Criteria**:
- Role migration approved
- Independence confirmed

#### Phase 2-C: Commit & Push - RBAC Changes
- Commit role unification work
- Clear message: RBAC work, not following

**Success Criteria**:
- RBAC changes isolated
- No following system coupling

---

### Phase 3: Following Service Layer (Notifications Only)
**Objective**: Implement following as pure notification subscription service

#### Phase 3-I: Implement - Notification Subscription Service
- Create `followingService` for notification subscriptions:
  ```typescript
  class FollowingService {
    async follow(userId, entityId, entityType) {
      // 1. Check visibility (user must be able to see entity)
      if (!await canUserSee(userId, entityId, entityType)) {
        throw new Error('Cannot follow: No visibility')
      }
      // 2. Create subscription record
      // 3. NEVER grant any permissions
    }
    
    async getFollowersForNotification(entityId, entityType) {
      // ONLY used by notification system
      // Returns user IDs for notification delivery
    }
  }
  ```
- **CRITICAL**: Service ONLY manages subscriptions
- **NEVER** called during authorization checks
- **ALWAYS** requires visibility to follow

**Success Criteria**:
- Service manages subscriptions only
- Enforces visibility requirements
- No permission logic whatsoever

#### Phase 3-T: Test - Notification Service Testing
- Test follow requires visibility
- Test cannot follow private entities without access
- Test following grants NO additional access
- **Critical test**: Verify service never called during auth
- Test follower lists only used for notifications

**Success Criteria**:
- Following requires visibility
- Following grants zero access
- Service isolated from auth system

#### Phase 3-R: Review - Service Separation Review
- Verify service has no auth responsibilities
- Confirm notification-only design
- Review visibility enforcement

**Success Criteria**:
- Clean separation confirmed
- No permission leakage
- Notification-only verified

#### Phase 3-C: Commit & Push - Notification Service
- Commit notification subscription service
- Document separation in commit message

**Success Criteria**:
- Service deployed as notification-only
- Clear architectural boundaries

---

### Phase 4: REST API Endpoints (Subscription Management)
**Objective**: Create subscription management APIs with no permission implications

#### Phase 4-I: Implement - Subscription APIs
- Implement subscription endpoints:
  ```typescript
  POST /api/v1/organizations/[orgId]/followers
  // Subscribe to notifications (requires visibility)
  
  DELETE /api/v1/organizations/[orgId]/followers/me
  // Unsubscribe from notifications
  
  GET /api/v1/organizations/[orgId]/followers
  // List subscribers (respects visibility)
  ```
- **Feature flags** for API control
- **Clear naming**: "Subscribe to updates" not "Follow for access"
- **Visibility checks** on all operations
- **NEVER** modify permissions

**Success Criteria**:
- APIs manage subscriptions only
- Clear notification terminology
- Visibility enforced

#### Phase 4-T: Test - API Subscription Testing
- Test subscription requires visibility
- Test subscription grants no access
- Test unsubscribe always allowed
- **Load test**: 100+ concurrent subscriptions
- **Security test**: Verify no permission bypass

**Success Criteria**:
- APIs are notification-only
- No security vulnerabilities
- Performance validated

#### Phase 4-R: Review - API Design Review
- Review RESTful design
- Verify no permission implications
- Check clear notification semantics

**Success Criteria**:
- APIs clearly notification-focused
- No access control confusion

#### Phase 4-C: Commit & Push - Subscription APIs
- Commit subscription management APIs
- Update API documentation

**Success Criteria**:
- APIs deployed and documented
- Clear separation maintained

---

### Phase 5: Async Notification System (Core Delivery) - Parallel with Phase 4
**Objective**: Build scalable notification delivery with visibility checks

**Dependencies**: Phase 3 (Following Service) - **NOT Phase 4**

#### Phase 5-I: Implement - Async Notification Delivery
- **Critical Architecture**:
  ```typescript
  class NotificationProcessor {
    async processEntityUpdate(entityId, entityType, updateData) {
      // 1. Fetch followers (from Following table)
      const followers = await getFollowers(entityId, entityType)
      
      // 2. Batch process with visibility checks
      for (const batch of chunk(followers, 1000)) {
        await processNotificationBatch(batch, entityId, entityType, updateData)
      }
    }
    
    async processNotificationBatch(userIds, entityId, entityType, updateData) {
      for (const userId of userIds) {
        // CRITICAL: Re-check visibility at delivery time
        if (await canUserSee(userId, entityId, entityType)) {
          await createNotification(userId, updateData)
        }
        // Silent skip if no visibility
      }
    }
  }
  ```
- Background job queue for scale
- **Visibility re-check** at delivery time
- Batch processing (1000 users per job)
- Silent skip when visibility lost

**Success Criteria**:
- Async processing working
- Visibility enforced at delivery
- No permission leakage
- Scales to 10K+ followers

#### Phase 5-T: Test - Notification Delivery Testing
- Test visibility checked at delivery
- Test follower without visibility gets NO notification
- **Load test**: 10K+ follower notification generation
- Test visibility changes stop notifications
- Test no blocking of user requests

**Success Criteria**:
- Notifications respect visibility
- Scales to large follower counts
- No security vulnerabilities

#### Phase 5-R: Review - Notification Architecture Review
- Review async architecture
- Verify visibility enforcement
- Check performance strategy

**Success Criteria**:
- Architecture approved
- Security validated
- Performance confirmed

#### Phase 5-C: Commit & Push - Notification System
- Commit async notification system
- Deploy background job infrastructure

**Success Criteria**:
- Notification system operational
- Visibility checks enforced

---

### Phase 6: UI Components (User Messaging)
**Objective**: Build UI that clearly communicates notification-only following

**Dependencies**: Phase 4 (APIs needed for UI)

#### Phase 6-I: Implement - Notification UI Components
- Create subscription UI components:
  ```typescript
  // Clear messaging in UI
  <FollowButton 
    label="Get Updates"
    helpText="Subscribe to notifications about this organization"
    // NOT "Follow for access" or similar
  />
  ```
- **Button text**: "Get Updates" or "Subscribe"
- **Help text**: "Receive notifications about updates"
- **Settings page**: "Notification Subscriptions"
- **NEVER** imply access changes
- Activity feed for subscribed updates

**Success Criteria**:
- UI clearly shows notification purpose
- No permission implications
- Clear subscription management

#### Phase 6-T: Test - UI Clarity Testing
- Test UI messaging is clear
- Test no permission confusion
- User testing for comprehension
- Accessibility testing

**Success Criteria**:
- Users understand notification-only
- No access confusion
- Accessible interface

#### Phase 6-R: Review - UX Messaging Review
- Review all UI text
- Verify notification focus
- Check for permission implications

**Success Criteria**:
- Messaging approved
- Clear separation communicated

#### Phase 6-C: Commit & Push - Notification UI
- Commit UI with clear messaging
- Deploy subscription interface

**Success Criteria**:
- UI deployed with clear purpose
- Users understand system

---

### Phase 7: Role Migration Completion (RBAC Cleanup)
**Objective**: Complete role unification - still separate from following

**Dependencies**: Phase 2 (dual-write must be established)

#### Phase 7-I: Implement - Finalize Role System
- Switch all reads to `unifiedRole`
- Remove dual-write logic
- Prepare final migration
- **Still completely separate from following**

**Success Criteria**:
- Role system unified
- Following system unaffected
- Clean separation maintained

#### Phase 7-T: Test - Final Role Testing
- Test unified role system
- Verify following unaffected
- Test rollback procedures

**Success Criteria**:
- Roles working correctly
- Following independent

#### Phase 7-R: Review - Final Separation Review
- Confirm complete separation
- Validate architecture

**Success Criteria**:
- Clean architecture confirmed

#### Phase 7-C: Commit & Push - Role Cleanup
- Commit final role changes
- Remove old role system

**Success Criteria**:
- Clean unified system
- Separation maintained

---

## Dependencies (Optimized for Parallel Development)

### Phase Dependencies
- **Phase 2** depends on **Phase 1** (schema must exist)
- **Phase 3** depends on **Phase 1** (Following table must exist)
- **Phase 4** depends on **Phase 3** (service layer needed for APIs)
- **Phase 5** depends on **Phase 3** (service layer needed for notifications) ⚡ **NOT Phase 4**
- **Phase 6** depends on **Phase 4** (APIs needed for UI)
- **Phase 7** depends on **Phase 2** (dual-write must be established)

**Note**: Phase 4 and Phase 5 can be developed in parallel after Phase 3 completion

---

## Critical Security & Testing Requirements

### Security Testing (Every Phase)
1. **Verify Following Never Grants Access**:
   - Test follower without visibility cannot see entity
   - Test following doesn't bypass any permission
   - Test authorization never reads Following table

2. **Visibility Enforcement**:
   - Test cannot follow without visibility
   - Test notifications stop when visibility lost
   - Test follower counts respect visibility

3. **Clean Separation**:
   - Grep codebase: No auth code references Following
   - Grep codebase: No Following code references roles
   - Test systems work independently

### Performance Requirements
- Follow operation < 200ms
- Follower count query < 50ms with 10K+ followers
- Notification generation async (never blocks user)
- Batch processing prevents timeouts

### User Understanding
- UI copy review: No permission implications
- User testing: Understand notification-only
- Help documentation: Clear separation explained

## Success Metrics

### Technical Metrics
- Zero permission checks using Following table
- 100% visibility enforcement on follow
- 100% visibility re-check on notification
- No auth system dependencies on Following

### User Metrics
- Users understand "follow = notifications"
- No confusion about access levels
- Clear subscription management

### Security Metrics
- No permission bypass via following
- No visibility leaks via notifications
- Complete system separation verified

## Risk Mitigation

### Architecture Risks
- **Risk**: Developers add permission logic to following
- **Mitigation**: Code review checklist, automated tests, clear documentation

### Security Risks
- **Risk**: Following bypasses visibility
- **Mitigation**: Visibility checks at follow and notification time

### User Understanding
- **Risk**: Users think following grants access
- **Mitigation**: Clear UI copy, help text, documentation

## Expert Validation Complete

Both Gemini and GPT-5 unanimously validated this clean separation approach:
- **Gemini**: "9/10 confidence - fundamental best practice"
- **GPT-5**: "Stronger security posture, cleaner architecture"

This implementation plan ensures Following remains a pure notification subscription system with zero permission implications.