# RBAC Implementation Plan

## Overview

This plan details the step-by-step implementation of the simplified RBAC system for Maix. We'll implement in three phases, each delivering immediate value while building toward full organization support.

**Timeline**: 2-3 weeks total
- Phase 1: 2-3 days (Visibility) ✅ **COMPLETED**
- Phase 2: 1 week (Organizations) ✅ **COMPLETED**
- Phase 3: 3-5 days (UI & Polish) ⏳ **IN PROGRESS**

## Current Status

### Phase 1: Visibility Controls ✅ COMPLETED
- Added visibility enum to Project and Product models
- Updated all API routes to respect visibility
- Added UI controls for setting visibility
- Implemented proper authorization checks (return 404 for unauthorized access)

### Phase 2: Organizations ✅ COMPLETED
- Database schema with Organization and OrganizationMember models
- Dual ownership model (resources owned by EITHER user OR organization)
- Complete CRUD API for organizations and member management
- Basic organization UI (list, create, detail pages)
- Security fixes implemented after code review

### Phase 3: UI & Polish ⏳ IN PROGRESS
- Need to complete organization settings page
- Need to add organization context to navigation
- Need comprehensive testing
- Need user documentation

## Phase 1: Visibility Controls (2-3 days)

### Day 1: Database & Backend

#### Task 1.1: Update Prisma Schema
**File**: `prisma/schema.prisma`
```prisma
// Add new enum
enum Visibility {
  PUBLIC
  PRIVATE
}

// Update Project model
model Project {
  // ... existing fields ...
  visibility Visibility @default(PUBLIC)
}

// Update Product model  
model Product {
  // ... existing fields ...
  visibility Visibility @default(PUBLIC)
}
```

**Commands**:
```bash
npx prisma migrate dev --name add-visibility-controls
npx prisma generate
```

#### Task 1.2: Update API Routes for Projects
**File**: `src/app/api/projects/route.ts`
- GET: Filter out private projects unless owner
- POST: Accept visibility field

**File**: `src/app/api/projects/[id]/route.ts`
- GET: Return 404 if private and not owner
- PUT: Allow visibility updates by owner only

```typescript
// Authorization helper
function canViewProject(project: Project, userId: string | null): boolean {
  if (project.visibility === 'PUBLIC') return true;
  return project.ownerId === userId;
}
```

#### Task 1.3: Update API Routes for Products
**Files**: `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`
- Same pattern as projects

### Day 2: Frontend UI

#### Task 1.4: Update Project/Product Forms
**File**: `src/components/forms/project-form.tsx`
```tsx
// Add visibility toggle
<div className="flex items-center space-x-2">
  <Switch
    id="visibility"
    checked={visibility === 'PRIVATE'}
    onCheckedChange={(checked) => 
      setValue('visibility', checked ? 'PRIVATE' : 'PUBLIC')
    }
  />
  <Label htmlFor="visibility">
    Make this project private
  </Label>
</div>
```

#### Task 1.5: Update Project/Product Cards
**File**: `src/components/project-card.tsx`
```tsx
// Show lock icon for private projects
{project.visibility === 'PRIVATE' && (
  <Lock className="h-4 w-4 text-muted-foreground" />
)}
```

#### Task 1.6: Update List Views
**Files**: `src/app/projects/page.tsx`, `src/app/dashboard/projects/page.tsx`
- Dashboard shows all user's projects
- Public projects page filters out private ones

### Day 3: Testing & Polish

#### Task 1.7: Write Tests
**File**: `tests/api/projects.test.ts`
- Test public projects visible to all
- Test private projects only visible to owner
- Test visibility updates

#### Task 1.8: Update Search
**File**: `src/app/api/search/route.ts`
- Exclude private projects from public search results

## Phase 2: Basic Organizations (1 week) ✅ COMPLETED

### Implementation Summary

#### Database Schema ✅
- Created Organization and OrganizationMember models
- Implemented dual ownership model (resources owned by EITHER user OR organization)
- Added proper indexes and constraints
- Migrated successfully with `prisma db push`

#### Core Features Implemented ✅
1. **Organization CRUD**
   - Create organization with unique slug
   - List user's organizations  
   - Get organization details (members only)
   - Update organization (OWNER only)
   - Delete organization (OWNER only with safeguards)

2. **Member Management**
   - Invite members by userId (OWNER only)
   - Remove members (OWNER only)
   - Leave organization (prevent last owner from leaving)
   - Role-based permissions (OWNER, MEMBER)

3. **Dual Ownership Integration**
   - Projects/Products can be owned by user OR organization
   - Proper authorization checks throughout
   - Visibility controls work with both ownership types
   - Organization members can access private org resources

4. **Security Hardening**
   - Fixed authentication vulnerability (no more session.user.id as cookie)
   - Fixed data leaks in public feed (questions/answers now filtered)
   - Fixed timing attack in organization lookups
   - Optimized queries from 3 to 1 using OR conditions
   - Added proper error handling and user feedback

#### Key Design Decisions
1. **No Personal Organizations** - Keep it simple, orgs are for teams only
2. **Dual Ownership Model** - Resources owned by EITHER user OR org, never both
3. **Return 404 for Unauthorized** - Don't reveal existence of private resources
4. **Fail Fast Philosophy** - No fallback mechanisms, clear error messages
5. **Minimal UI First** - Basic pages to validate concept before polish

### Files Created/Modified in Phase 2

#### API Routes
- `/api/organizations/route.ts` - List and create organizations
- `/api/organizations/[id]/route.ts` - Get, update, delete organization
- `/api/organizations/[id]/members/route.ts` - List and invite members
- `/api/organizations/[id]/members/[userId]/route.ts` - Remove member
- `/api/organizations/[id]/leave/route.ts` - Leave organization

#### UI Components
- `/app/organizations/page.tsx` - List user's organizations
- `/app/organizations/new/page.tsx` - Create new organization
- `/app/organizations/[slug]/page.tsx` - Organization detail with tabs
- `/components/forms/OrganizationSelector.tsx` - Org selector for forms
- `/components/OrganizationMembersList.tsx` - Member management UI
- `/components/OrganizationProjectsList.tsx` - Org projects list
- `/components/LeaveOrganizationButton.tsx` - Client component for leaving

#### Core Services
- `/lib/organization-service.ts` - Centralized org data access (security fix)
- `/lib/ownership-utils.ts` - Ownership validation helpers

#### Updated for Dual Ownership
- `/api/projects/route.ts` - Support organizationId in create
- `/api/products/route.ts` - Support organizationId in create  
- `/api/public/feed/route.ts` - Fixed to filter private content
- All list endpoints - Updated to show org-owned resources

## Phase 3: Organization UI & Polish (3-5 days) ⏳ IN PROGRESS

### Completed in Phase 3
- ✅ Organization creation flow with slug validation
- ✅ Organization list page with create button
- ✅ Organization detail page with tabs (members, projects)
- ✅ OrganizationSelector component for project/product forms
- ✅ Basic member management UI (invite, remove, leave)

### Remaining Tasks

#### Task 3.1: Organization Settings Page
**File**: `src/app/organizations/[slug]/settings/page.tsx`
- Edit organization name/slug (OWNER only)
- Advanced member management
- Danger zone (delete organization with safeguards)
- Transfer ownership functionality

#### Task 3.2: Navigation Context
**File**: `src/components/layout/header.tsx`
- Add organization dropdown to navigation
- Show current organization context
- Quick organization switcher
- Personal vs Organization indicator

#### Task 3.3: Enhanced UI Polish
- Better empty states for organizations
- Loading skeletons for async operations
- Improved member invitation flow (email support)
- Organization profile/avatar support

#### Task 3.4: Comprehensive Testing
- Unit tests for organization services
- Integration tests for member management
- E2E tests for organization workflows
- Authorization boundary testing

#### Task 3.5: Documentation
- User guide for organizations
- API documentation updates
- Migration guide for existing users
- Best practices for team collaboration

## Testing Strategy

### Unit Tests
- Authorization helpers
- API route handlers
- Database operations

### Integration Tests
- Full user flows
- Organization creation and management
- Project creation under orgs
- Member invitation flow

### Manual Testing Checklist
- [ ] Create organization
- [ ] Invite members
- [ ] Create projects under org
- [ ] Verify visibility controls
- [ ] Test authorization boundaries
- [ ] Remove members
- [ ] Delete organization

## Rollout Strategy

### Phase 1 Rollout
1. Deploy visibility controls
2. Announce in changelog
3. Monitor for issues
4. Default all existing to PUBLIC

### Phase 2 Rollout
1. Deploy organization backend
2. Enable for small beta group
3. Gather feedback
4. Fix issues

### Phase 3 Rollout
1. Enable organization UI for all
2. Create help documentation
3. Email announcement
4. Monitor adoption

## Success Metrics

### Phase 1 Metrics
- % of projects marked private
- No degradation in performance
- No increase in errors

### Phase 2 Metrics
- Organizations created
- Members invited
- Projects under orgs

### Phase 3 Metrics
- Active organizations (with activity)
- User feedback scores
- Feature requests for enhancements

## Risk Mitigation

### Database Migrations
- Test on staging first
- Have rollback plan
- Run during low-traffic period

### Authorization Bugs
- Extensive testing
- Fail closed (deny by default)
- Audit logging

### Performance Impact
- Monitor query performance
- Add indexes if needed
- Cache organization memberships

## Implementation Approach (DRSITR)

All features were implemented following our DRSITR workflow:
1. **Design** - Created comprehensive design documents
2. **Review** - Used `mcp__zen__thinkdeep` for design validation
3. **Simplify** - Removed unnecessary complexity (no personal orgs, simple roles)
4. **Implement** - Built features incrementally with working code
5. **Test** - Wrote tests and validated functionality
6. **Review** - Used `mcp__zen__codereview` for security and quality

## Key Implementation Decisions

1. **Dual Ownership Model**: Resources owned by EITHER user OR organization, never both
   - Simplifies authorization logic
   - Clear ownership boundaries
   - No complex permission inheritance

2. **Security First**: Return 404 for unauthorized access to private resources
   - Don't reveal existence of private content
   - Consistent error handling
   - Proper data filtering in public APIs

3. **Performance Optimization**: Single queries with OR conditions
   - Replaced 3 separate queries with 1
   - Efficient member checking
   - Proper database indexes

4. **Minimal Viable UI**: Basic functional pages before polish
   - Validate concepts with users
   - Iterate based on feedback
   - Avoid over-engineering

## Current State Summary

The RBAC system is functionally complete with:
- ✅ Private/public visibility for all resources
- ✅ Organizations with member management
- ✅ Dual ownership model working throughout
- ✅ Security vulnerabilities fixed
- ✅ Basic UI for all organization features

Ready for user testing and feedback before final polish in Phase 3.

## Next Steps After MVP

Based on user feedback and adoption:
1. Admin role for better permission granularity
2. Project transfer between accounts
3. Organization-level visibility option
4. Billing and limits
5. Audit logs and activity feeds