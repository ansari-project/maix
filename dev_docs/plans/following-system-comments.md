# Following System Implementation Plan - Initial

## Overview
Implement following system for organizations, projects, and products with polymorphic database design, unified role system, and phased notification rollout.

**Key Expert Refinements Applied:**
- Phase dependency optimization for parallel development
- Asynchronous notification architecture for scalability
- Enhanced database migration safety protocols
- Comprehensive performance testing requirements

## Phase Structure

### Phase 1: Database Migration & Core Schema
**Objective**: Establish database foundation with safe role system migration

#### Phase 1-I: Implement - Database Schema Changes
- Add `Following` table with polymorphic relationships and optimized indexes:
  ```sql
  @@index([followableId, followableType])  -- Critical for getFollowers()
  @@index([userId, followableType])        -- Critical for getUserFollowing()
  @@unique([userId, followableId, followableType])
  ```
- Add `FollowableType` enum (ORGANIZATION, PROJECT, PRODUCT)  
- Add nullable `unifiedRole` field to `OrganizationMember` (expand phase)
- Generate and review Prisma migration files

**Success Criteria**: 
- Migration generated without errors with specified composite indexes
- Both old `role` and new `unifiedRole` fields exist in `OrganizationMember`
- Following table created with performance-optimized indexes
- Database migration applies successfully in development

#### Phase 1-T: Test - Database Schema Validation
- Integration tests for Following table CRUD operations
- Test uniqueness constraints (user cannot follow same entity twice)
- Verify cascade deletes work properly
- Test role migration compatibility
- **Performance tests**: Verify index-only scans for follower count queries

**Success Criteria**:
- All database operations work as expected
- Constraint violations handled properly
- Follower count queries use index-only scans (verified with EXPLAIN)
- No performance regressions on existing queries

#### Phase 1-R: Review - Schema Design Review
- Code review using `mcp__zen__codereview` tool
- Review migration SQL for safety and correctness
- Validate index strategy for 10K+ followers per entity
- Check for any missing constraints or relationships

**Success Criteria**:
- Code review completed with continuation_id
- No critical issues identified
- Migration strategy approved

#### Phase 1-C: Commit & Push - Database Changes
- Commit database migration with descriptive message
- Push changes to repository
- Update `.claude-task` with progress

**Success Criteria**:
- Changes committed and pushed successfully
- Migration files included in commit

---

### Phase 2: Role System Unification (Expand & Contract Pattern)
**Objective**: Safely migrate OrganizationMember to use UnifiedRole with zero downtime

#### Phase 2-I: Implement - Dual Write System with Safety Features
- Update all OrganizationMember create operations to write to both fields
- Update all OrganizationMember update operations for dual writes  
- **Enhanced**: Feature flag for dual-write logic (emergency off switch)
- **Enhanced**: Idempotent and batched backfill script for existing records
- **Enhanced**: Monitoring script to detect role field discrepancies
- Create utility functions for role mapping (OrgRole → UnifiedRole)

**Success Criteria**:
- All write operations populate both fields
- Backfill script processes records in batches of 1000
- Monitoring detects any dual-write failures
- Feature flag can disable dual-write if needed

#### Phase 2-T: Test - Enhanced Dual Write Validation
- Test OrganizationMember creation with both fields populated
- **Enhanced**: Test backfill script idempotency (can run multiple times safely)
- **Enhanced**: Test monitoring script detects artificial discrepancies
- Test role permission functions work with both old and new roles
- Test feature flag properly reverts to single-write mode

**Success Criteria**:
- New records have both fields populated correctly
- Backfill script can be safely re-run without side effects
- Monitoring provides reliable discrepancy detection
- Feature flag rollback works correctly

#### Phase 2-R: Review - Migration Safety Review
- Code review for dual write implementation
- Review backfill script for data integrity
- Validate zero-downtime migration approach

**Success Criteria**:
- Migration approach validated as safe
- No data integrity risks identified

#### Phase 2-C: Commit & Push - Dual Write System
- Commit dual write implementation
- Push changes and deploy to development
- Run backfill script in development environment

**Success Criteria**:
- Dual write system deployed
- Backfill completed in development
- No production issues

---

### Phase 3: Following Core Service Layer
**Objective**: Implement core following business logic and API foundation

#### Phase 3-I: Implement - Following Service
- Create `followingService` with core operations:
  - `follow(userId, followableId, followableType)`
  - `unfollow(userId, followableId, followableType)` 
  - `isFollowing(userId, followableId, followableType)`
  - `getFollowers(followableId, followableType)`
  - `getUserFollowing(userId)`
- Implement validation logic (cannot follow yourself, entity must exist)
- Add proper error handling and TypeScript types
- Create service-level tests

**Success Criteria**:
- All core operations implemented and working
- Proper validation and error handling
- TypeScript types defined

#### Phase 3-T: Test - Service Layer Testing
- Unit tests for all followingService methods
- Integration tests with real database operations
- Test edge cases (duplicate follows, non-existent entities, etc.)
- Test permission validation (user cannot follow private entities they can't access)

**Success Criteria**:
- All service methods tested
- Edge cases handled correctly
- 100% test coverage on service layer

#### Phase 3-R: Review - Service Architecture Review
- Code review for service layer design
- Review error handling patterns
- Validate API consistency with existing services

**Success Criteria**:
- Service architecture approved
- Code quality standards met

#### Phase 3-C: Commit & Push - Core Service
- Commit following service implementation
- Push changes with comprehensive tests

**Success Criteria**:
- Service layer committed and deployed
- All tests passing

---

### Phase 4: REST API Endpoints
**Objective**: Create RESTful API endpoints for following functionality

#### Phase 4-I: Implement - API Routes
- Create API routes for each entity type:
  - `POST /api/v1/organizations/[orgId]/followers` (follow org)
  - `DELETE /api/v1/organizations/[orgId]/followers/me` (unfollow org)  
  - `GET /api/v1/organizations/[orgId]/followers` (list org followers)
  - Similar routes for projects and products
- Create unified user following route:
  - `GET /api/v1/users/me/following` (list what user follows)
- Implement authentication middleware
- Add request validation with Zod schemas
- Return proper HTTP status codes and response formats

**Success Criteria**:
- All API endpoints implemented
- Authentication and validation working
- Consistent response formats

#### Phase 4-T: Test - API Integration Testing
- API tests for all follow/unfollow endpoints
- Test authentication requirements
- Test authorization (users can only follow what they can see)
- Test error cases (404s, 400s, 401s)
- Test pagination for follower lists

**Success Criteria**:
- All API endpoints tested
- Proper error handling verified
- Authentication/authorization working

#### Phase 4-R: Review - API Design Review
- Review RESTful design consistency
- Check error handling patterns
- Validate response formats match existing API conventions

**Success Criteria**:
- API design approved
- Consistent with existing patterns

#### Phase 4-C: Commit & Push - API Endpoints
- Commit API implementation
- Push changes and update API documentation

**Success Criteria**:
- APIs deployed and functional
- Documentation updated

---

### Phase 5: Activity Feed with Async Notifications (Parallel with Phase 4)
**Objective**: Implement scalable activity feed using asynchronous notification generation

**Dependencies**: Phase 3 (Following Service) - **NOT Phase 4**

#### Phase 5-I: Implement - Async Activity Feed System
- **Critical**: Implement async notification architecture:
  - Event publishing when entities post updates
  - Background job queue for notification generation
  - Batched notification creation (process 1000 followers per batch)
- Create activity feed service:
  - Generate notifications asynchronously via background jobs
  - Query notifications to build activity feed for users
  - Mark notifications as read
- Create activity feed API endpoints:
  - `GET /api/v1/users/me/activity-feed` (paginated)
  - `POST /api/v1/notifications/[notificationId]/read`
- Add new notification types for following activity

**Success Criteria**:
- Background job system handles notification generation
- Entity updates trigger async notification jobs
- Activity feed API returns paginated results
- Notification generation doesn't block user requests

#### Phase 5-T: Test - Activity Feed Testing with Scale Validation
- Test notification generation for followers (async flow)
- Test activity feed queries and pagination
- Test read/unread functionality
- **Enhanced**: Load test async notification job with 10K+ followers
- Integration tests with post creation workflow

**Success Criteria**:
- Activity feed works end-to-end asynchronously
- 10K+ notification generation completes within acceptable time
- No blocking of user-facing requests during notification creation
- All notification flows tested

#### Phase 5-R: Review - Notification Architecture Review
- Review activity feed implementation
- Check performance of notification queries
- Validate integration with existing notification system

**Success Criteria**:
- Implementation approach approved
- No performance concerns

#### Phase 5-C: Commit & Push - Activity Feed
- Commit activity feed implementation
- Push changes and deploy MVP notifications

**Success Criteria**:
- Activity feed deployed and working
- Users can see updates from followed entities

---

### Phase 6: UI Components & User Interface
**Objective**: Build user interface for following functionality

#### Phase 6-I: Implement - UI Components
- Create Follow/Unfollow button component
- Add follow buttons to organization, project, product pages  
- Create "Following" section in user settings
- Create activity feed UI component
- Add follower count displays to entity pages
- Implement following management interface

**Success Criteria**:
- Follow buttons work on all entity pages
- Users can manage their following list in settings
- Activity feed UI displays notifications properly

#### Phase 6-T: Test - UI Testing
- Component tests for Follow/Unfollow button
- Integration tests for following management
- Test activity feed UI with various notification types
- Test responsive design and accessibility

**Success Criteria**:
- All UI components working
- Good user experience
- Accessible design

#### Phase 6-R: Review - UI/UX Review
- Review user interface design
- Check accessibility compliance
- Validate user experience flow

**Success Criteria**:
- UI design approved
- User experience validated

#### Phase 6-C: Commit & Push - UI Implementation
- Commit UI components
- Push changes and deploy user interface

**Success Criteria**:
- Following UI live and functional
- Users can follow/unfollow entities through UI

---

### Phase 7: Role Migration Completion (Contract Phase)
**Objective**: Complete role system unification by removing old OrgRole system

#### Phase 7-I: Implement - Switch to UnifiedRole
- Update all OrganizationMember read operations to use `unifiedRole` only
- Remove dual write logic (write only to `unifiedRole`)
- Update permission checks to use UnifiedRole consistently
- Prepare migration to make `unifiedRole` non-nullable and remove `role`

**Success Criteria**:
- All code reads from unifiedRole only
- No references to old role field in application code
- Migration prepared to clean up schema

#### Phase 7-T: Test - Role System Testing
- Test all organization permission checks work with UnifiedRole
- Test OrganizationMember operations use new field only
- Verify no application code depends on old role field

**Success Criteria**:
- Permission system works correctly
- No dependency on old role field

#### Phase 7-R: Review - Migration Completion Review
- Review complete elimination of OrgRole dependencies
- Validate migration safety for schema cleanup

**Success Criteria**:
- Safe to remove old role system
- No breaking changes

#### Phase 7-C: Commit & Push - Role Migration Complete
- Commit UnifiedRole migration completion
- Deploy schema cleanup migration
- Remove OrgRole enum and old role field

**Success Criteria**:
- Role system unified successfully
- Clean database schema
- All functionality working

---

## Dependencies

### Phase Dependencies (Optimized for Parallel Development)
- **Phase 2** depends on **Phase 1** (schema must exist before role migration)
- **Phase 3** depends on **Phase 1** (Following table must exist)
- **Phase 4** depends on **Phase 3** (service layer needed for APIs)
- **Phase 5** depends on **Phase 3** (service layer needed for notifications) ⚡ **OPTIMIZED - Not Phase 4**
- **Phase 6** depends on **Phase 4** (APIs needed for UI)
- **Phase 7** depends on **Phase 2** (dual write must be established)

**Note**: Phase 4 and Phase 5 can be developed in parallel after Phase 3 completion

### External Dependencies
- Prisma ORM for database operations
- NextAuth.js for authentication
- Existing notification system for activity feeds
- Existing entity permission systems

## Risk Mitigation

### Database Migration Risks
- **Risk**: Migration fails or causes downtime
- **Mitigation**: Use expand-and-contract pattern, test migrations thoroughly

### Performance Risks  
- **Risk**: Following queries are slow at scale
- **Mitigation**: Proper indexing, performance testing, monitoring

### Data Integrity Risks
- **Risk**: Orphaned following records
- **Mitigation**: Cascade deletes, validation in service layer

### API Consistency Risks
- **Risk**: APIs don't match existing patterns
- **Mitigation**: Review existing API patterns, use consistent service layer

## Success Metrics

### Technical Metrics
- All database migrations complete without errors
- API response times under 200ms for following operations
- Zero data integrity issues
- 100% test coverage on service layer

### User Experience Metrics
- Follow/unfollow operations complete in under 1 second
- Activity feed loads in under 2 seconds
- No user-reported bugs in following functionality

## Rollback Plan

### Phase-Level Rollback
- Each phase commits working functionality
- Can rollback to previous phase if issues arise
- Database migrations can be reversed if needed

### Emergency Rollback
- Feature flag to disable following UI if needed
- Database rollback scripts for each migration
- Service layer can be disabled without affecting core platform

## Next Steps

This plan will be reviewed by the user and refined based on feedback. Once approved, implementation will begin with Phase 1.