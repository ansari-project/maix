# Simplified RBAC with Organizations (MVP)

## Overview

This document presents a simplified RBAC system for Maix that introduces organizations while following the principle of "bias towards simple solutions." Based on the comprehensive review, we've removed unnecessary complexity to deliver core collaboration features faster.

**MVP Goals:**
- Add visibility controls to projects/products
- Enable basic team collaboration through organizations
- Maintain backward compatibility
- Ship quickly with minimal risk

## Simplified Design

### Phase 1: Visibility Controls Only (2-3 days)
**Goal**: Add privacy controls without organizations

1. **Database Changes**:
   ```prisma
   // Add to Project and Product models
   visibility Visibility @default(PUBLIC)
   
   // New enum
   enum Visibility {
     PUBLIC
     PRIVATE
   }
   ```

2. **Implementation**:
   - Add visibility toggle in create/edit forms
   - Check visibility in API routes (private = owner only)
   - Show lock icon for private items
   - No migration needed - default is public

### Phase 2: Basic Organizations (1 week)
**Goal**: Allow explicit team collaboration

1. **Database Changes**:
   ```prisma
   // New Organization model
   model Organization {
     id          String   @id @default(cuid())
     name        String
     slug        String   @unique
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     
     members     OrganizationMember[]
     projects    Project[]
     products    Product[]
     
     @@map("organizations")
   }
   
   // Simple membership model
   model OrganizationMember {
     id             String       @id @default(cuid())
     role           OrgRole      
     joinedAt       DateTime     @default(now())
     
     organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
     organizationId String
     user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
     userId         String
     
     @@unique([organizationId, userId])
     @@map("organization_members")
   }
   
   // Simplified roles
   enum OrgRole {
     OWNER
     MEMBER
   }
   
   // Update Project/Product models
   model Project {
     // ... existing fields ...
     
     // Dual ownership - either user OR organization owns it
     owner           User?         @relation(fields: [ownerId], references: [id])
     ownerId         String?
     organization    Organization? @relation(fields: [organizationId], references: [id])
     organizationId  String?
     
     visibility      Visibility    @default(PUBLIC)
   }
   ```

2. **Key Simplifications**:
   - No personal organizations - orgs are created explicitly
   - Only two roles: Owner and Member
   - Projects owned by EITHER user OR organization
   - No collaborators table - org members see all org content
   - No app access control

3. **URLs**:
   - User projects: `/projects/[id]` (existing)
   - Org projects: `/orgs/[slug]/projects/[id]`

### Phase 3: Organization UI (3-5 days)
**Goal**: Basic organization management

1. **Features**:
   - Create organization (with unique slug)
   - Invite members by email
   - List organization projects/products
   - Transfer ownership of projects to org (optional)

2. **Simplified Permissions**:
   - Owners: Can do everything
   - Members: Can create/edit projects, view all org content
   - Non-members: Follow project visibility rules

## Migration Strategy

### Phase 1 Migration
```bash
# Add visibility field
npx prisma migrate dev --name add-visibility
# No data migration needed - defaults to PUBLIC
```

### Phase 2 Migration
```bash
# Add organization tables
npx prisma migrate dev --name add-organizations
# No data migration - existing projects stay with users
```

## API Changes

### Phase 1 APIs
```typescript
// Simple visibility check
if (project.visibility === 'PRIVATE' && project.ownerId !== userId) {
  return 404; // Don't reveal existence
}
```

### Phase 2 APIs
```typescript
// New endpoints
POST   /api/organizations          // Create org
GET    /api/organizations          // List user's orgs
POST   /api/organizations/[slug]/members   // Invite member
DELETE /api/organizations/[slug]/members/[userId]  // Remove member

// Updated project creation
POST /api/projects
{
  name: "...",
  organizationId: "..." // Optional - if provided, org owns it
}

// Simple authorization
function canAccessProject(userId: string, project: Project) {
  // Public projects are always accessible
  if (project.visibility === 'PUBLIC') return true;
  
  // Check direct ownership
  if (project.ownerId === userId) return true;
  
  // Check organization membership
  if (project.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId
        }
      }
    });
    return !!membership;
  }
  
  return false;
}
```

## What We're NOT Building (Yet)

1. **Personal Organizations** - Users don't need an org by default
2. **Viewer Role** - Members can do everything except admin tasks
3. **Organization Visibility** - No org-only visibility level
4. **Collaborators** - No fine-grained per-project permissions
5. **App Access Control** - All orgs can use all features
6. **Complex Migration** - No risky data backfills

## Benefits of This Approach

1. **Minimal Risk** - No migration of existing data
2. **Faster Shipping** - Could be live in 1-2 weeks
3. **Easy to Understand** - Projects are owned by users OR orgs
4. **Backward Compatible** - Existing URLs and APIs work
5. **Progressive Enhancement** - Add complexity only when needed

## Future Enhancements

Once this MVP proves valuable, we can add:
- Admin role for organization management
- Transfer projects between users and orgs
- Organization-level visibility option
- Fine-grained collaborator permissions
- App access controls
- Billing and limits

## Success Metrics

- Users creating organizations
- Projects created under organizations
- Active collaboration (multiple members editing)
- User feedback requesting specific features

## Conclusion

This simplified approach delivers the core value of team collaboration while avoiding premature complexity. By starting with just visibility controls and basic organizations, we can ship faster, learn from users, and iterate based on real needs rather than assumptions.