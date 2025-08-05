# Invitation System Implementation Plan

## Overview
This document provides a concrete, phased implementation plan for the unified invitation and visibility system. Each phase delivers working functionality with clear deliverables and testable outcomes.

## 📊 Implementation Status (Updated August 4, 2025)

| Phase | Status | Key Achievements |
|-------|--------|------------------|
| **Phase 0: RBAC Foundation** | ✅ **COMPLETED** | Unified role system, membership tables, 24 RBAC tests |
| **Phase 1: Visibility Layer** | ✅ **COMPLETED** | Visibility controls, performance optimization, 22 integration tests |
| **Phase 2: Organization Invitations** | 🔄 **NEXT** | Email invitations, token system, basic UI |
| **Phase 3: Hierarchical Invitations** | ⏳ **PLANNED** | Multi-entity invitations, role propagation |
| **Phase 4: Production Readiness** | ⏳ **PLANNED** | Management features, MCP integration |

**Total Progress: 2/5 phases completed (40%)**

## ✅ Phase 0: RBAC Foundation (Prerequisites) - COMPLETED
**(Completed August 4, 2025)**  
**Goal**: Establish a solid role-based access control foundation

### Deliverables
1. **Database Schema Updates**
   - Create `ProductMember` and `ProjectMember` tables
   - Add `UnifiedRole` enum (OWNER, ADMIN, MEMBER, VIEWER)
   - Update `OrganizationMember` to use unified roles
   - Create migration scripts with data preservation

2. **Core Authorization System**
   - Implement `getEffectiveRole()` function (no caching needed)
   - Build `requirePermission()` middleware
   - Create `hasPermission()` helper functions
   - Add role hierarchy constants

3. **Data Migration (One-time, No Backward Compatibility)**
   - Create Prisma migration to add membership tables
   - Migrate existing product/project owners to membership tables
   - Convert organization roles to unified system
   - Remove ownerId columns in same migration

4. **Update Existing Code**
   - Replace all ownership checks with membership queries
   - Update API routes to use new permission system
   - Modify UI components to handle role-based access
   - Update MCP tools for new permission model

### ✅ Completed Test Scenarios
- ✅ Verify existing owners retain access after migration
- ✅ Test permission inheritance from organization to products/projects
- ✅ Ensure API routes properly enforce role requirements
- ✅ Validate that UI shows/hides features based on roles
- ✅ Comprehensive RBAC test suite (24 tests)

### Implementation Notes
- **Migration**: One-time migration successfully moved all ownerId data to membership tables
- **Performance**: Role hierarchy implemented with efficient database queries
- **Testing**: Full RBAC test coverage with real database scenarios
- **Compatibility**: All existing MCP tools updated for new permission model

## ✅ Phase 1: Visibility Layer - COMPLETED
**(Completed August 4, 2025)**  
**Goal**: Implement visibility controls with unified URLs

### Deliverables
1. **Database Updates**
   - Add `visibility` field to Product model
   - Add `visibility` field to Post model
   - Create necessary indexes for performance
   - Default all existing content to PUBLIC

2. **Authorization Functions**
   - Implement `can()` function for visibility-aware permissions
   - Build `canViewEntity()` for safe entity fetching
   - Create visibility-aware query builders
   - Add 404 handling for unauthorized access

3. **Page Updates**
   - Update all entity pages to handle both auth/unauth users
   - Implement progressive enhancement based on permissions
   - Remove any separate public URL patterns
   - Ensure consistent 404 behavior for private content

4. **API Route Updates**
   - Add visibility checks to all GET endpoints
   - Update list endpoints to filter by visibility
   - Ensure mutations check both visibility and permissions
   - Standardize error responses

### ✅ Completed Test Scenarios
- ✅ Public content accessible without authentication
- ✅ Private content returns 404 to unauthorized users (via NotFoundError)
- ✅ Authenticated users see appropriate content based on membership
- ✅ List views correctly filter based on visibility and permissions
- ✅ Comprehensive visibility integration tests (22 tests)
- ✅ Performance optimization tests (role caching eliminated)

### Implementation Notes
- **Database**: Post model updated with visibility field and migration
- **Authorization**: `can()` and `canViewEntity()` functions handle all visibility logic
- **Performance**: Eliminated redundant database queries by returning role from `canViewEntity()`
- **Testing**: 22 integration tests covering all visibility scenarios
- **Server-side**: Project pages properly handle authenticated/unauthenticated users
- **Security**: Private content returns consistent 404 responses

### Remaining Tasks (Phase 1.4)
- 🔲 Update API routes to return 404 for unauthorized private content (deferred)

## Phase 2: Basic Organization Invitations
  
**Goal**: Prove invitation system with single entity type

### Deliverables
1. **Database Schema**
   - Create `Invitation` table with all required fields
   - Add indexes for token lookup and status queries
   - Create invitation status enum
   - Add foreign key relationships

2. **Core Invitation Logic**
   - Token generation with crypto.randomBytes(32)
   - Invitation creation API endpoint
   - Token validation and expiry checking
   - Basic acceptance flow with membership creation

3. **Email Integration**
   - Design invitation email template
   - Implement email sending with Resend
   - Add invitation link generation
   - Include personal message support

4. **Basic UI**
   - Organization settings invitation page
   - Invitation creation form with role selection
   - Invitation acceptance page
   - Pending invitations list

### Test Scenarios
- Create and send organization invitation
- Accept invitation as new user (signup flow)
- Accept invitation as existing user (login flow)
- Handle expired invitation gracefully
- Prevent duplicate invitations to same email

## Phase 3: Hierarchical Invitations
  
**Goal**: Full hierarchical invitation system with propagation

### Deliverables
1. **Extended Invitation Support**
   - Add product invitation endpoints
   - Add project invitation endpoints
   - Implement invitation type routing
   - Update UI for all entity types

2. **Hierarchical Propagation**
   - Implement upward membership propagation
   - Add transactional acceptance logic
   - Handle role conflict resolution (highest wins)
   - Prevent permission downgrades

3. **Enhanced UI**
   - Entity-specific invitation interfaces
   - Role explanation during invitation
   - Membership visualization showing inherited access
   - Bulk invitation support

4. **Permission Matrix**
   - Enforce who can invite at each level
   - Implement role-based invitation limits
   - Add invitation audit logging
   - Create permission documentation

### Test Scenarios
- Project invitation creates product and org memberships
- Product invitation creates org membership
- Role conflicts resolve to highest privilege
- Cascade membership updates work correctly
- UI correctly shows inherited permissions

## Phase 4: Production Readiness
  
**Goal**: Management features and MCP integration

### Deliverables
1. **Management Features**
   - Invitation management dashboard
   - Bulk invitation cancellation
   - Invitation analytics
   - Member removal with cascade deletion

2. **Performance Optimization**
   - Database query optimization
   - Batch invitation processing
   - Efficient permission checking queries

3. **MCP Integration**
   - Implement `maix_manage_invitation` tool
   - Extend `maix_manage_membership` for all entities
   - Add `maix_check_permission` tool
   - Create tool documentation

### Test Scenarios
- Load test invitation creation/acceptance
- Verify cascade deletion removes all memberships
- Validate MCP tools work correctly
- Test batch operations performance

## End-to-End Test Scenarios for Humans

### Scenario 1: New Organization with Team Setup
**Actor**: Sarah (Organization Owner)
1. Sarah creates "Tech for Good Foundation" organization
2. She navigates to Organization Settings > Members
3. She invites john@example.com as ADMIN
4. She invites alice@example.com as MEMBER
5. Email sent to both users with invitation links
6. John clicks link, signs up, becomes ADMIN
7. Alice clicks link, logs in, becomes MEMBER
8. Sarah sees both members in the member list
9. John can invite more members, Alice cannot

### Scenario 2: Project Collaboration Flow
**Actor**: John (Project Admin)
1. John creates "AI Tutor" project under the organization
2. He invites dev@example.com to the project as MEMBER
3. Dev receives email, clicks invitation link
4. Dev signs up and is redirected to project page
5. Dev automatically gains VIEWER access to the organization
6. Dev can edit project content but not invite others
7. Organization member list shows Dev as VIEWER
8. Project member list shows Dev as MEMBER

### Scenario 3: Private Product Launch
**Actor**: Alice (Product Creator)
1. Alice creates "Customer Portal" product, sets visibility to PRIVATE
2. Unauthenticated users get 404 when accessing the product URL
3. Alice invites beta@example.com as VIEWER
4. Beta user can now view the product but not edit
5. Alice changes visibility to PUBLIC
6. Now everyone can view, but only members can edit
7. Public users see "Request Access" instead of edit buttons

### Scenario 4: Hierarchical Access Verification
**Actor**: Test User
1. User is invited to a specific project as MEMBER
2. User can see and edit the project
3. User can view (but not edit) the parent product
4. User can view (but not edit) the parent organization
5. User appears in member lists at all three levels
6. Removing user from organization cascades to all levels

### Scenario 5: Role Conflict Resolution
**Actor**: Admin User
1. User is ADMIN of an organization
2. User is invited to a project as VIEWER
3. System preserves ADMIN access (highest wins)
4. UI shows effective role as ADMIN
5. User retains all ADMIN capabilities

### Scenario 6: MCP AI Assistant Usage
**Actor**: Organization Owner using AI
1. "List all pending invitations for my organization"
2. "Invite sarah@example.com to the AI Research project"
3. "What permissions does john@example.com have?"
4. "Remove expired invitations"
5. "Make alice@example.com an admin of Customer Portal"

## Success Metrics

### ✅ Phase 0 Success (ACHIEVED)
- ✅ All existing users retain appropriate access
- ✅ No permission-related errors in logs
- ✅ API endpoints use new permission system
- ✅ Performance improved with optimized queries (eliminated redundant role lookups)

### ✅ Phase 1 Success (ACHIEVED)
- ✅ Public content accessible without auth
- ✅ Private content properly protected
- ✅ No information leakage via error messages (consistent 404 responses)
- ✅ Consistent user experience across authenticated/unauthenticated states

### Phase 2 Success
- Invitations created and delivered successfully
- New users can sign up via invitation
- Existing users can accept invitations
- No security vulnerabilities in token handling

### Phase 3 Success
- Hierarchical memberships work correctly
- Role conflicts resolve predictably
- UI clearly shows permission sources
- All entity types support invitations

### Phase 4 Success
- System handles 100+ concurrent invitations
- Management dashboard fully functional
- MCP tools used successfully by AI
- Batch operations perform efficiently

## Implementation Notes

### Critical Paths
1. **Transaction Safety**: All membership operations must be atomic
2. **Email Delivery**: Use queue for reliable delivery
3. **Security**: Never expose internal IDs in invitation tokens
4. **Migration**: One-time migration with no backward compatibility

### Migration Strategy
1. Create comprehensive Prisma migration
2. Test migration thoroughly in development
3. Backup production database before migration
4. Run migration in single transaction
5. No feature flags or gradual rollout needed

### Dependencies
- Resend for email delivery (Phase 2)
- Testing framework updates (All phases)

## Next Steps (August 4, 2025)
1. ✅ ~~Review plan with team~~
2. ✅ ~~Begin Phase 0 implementation on main branch~~
3. ✅ ~~Complete Phase 1 visibility layer~~
4. 🔄 **Begin Phase 2: Basic Organization Invitations**
   - Create Invitation database schema
   - Implement token generation and validation
   - Build email integration with Resend
   - Create invitation UI components
5. ⏳ Continue with Phases 3-4 after Phase 2 completion