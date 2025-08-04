# Invitation System Design with Visibility Controls

## Overview
Design for a unified invitation and visibility system that combines hierarchical invitation capabilities with content visibility controls. This system allows users to invite others to organizations, products, or projects while managing public/private visibility of content.

## Key Features
1. **Unified Access Control**: Single system for both invitations and visibility
2. **Content Visibility**: Projects, products, and posts can be PUBLIC, PRIVATE, or DRAFT
3. **Same URLs**: No separate public URLs - same URLs work for all users based on permissions
4. **Security**: Private content returns 404 for unauthorized users (not 403)
5. **Progressive Enhancement**: Show appropriate content based on authentication and permissions

## Core Requirements

### Invitation Targets
- **Organization**: Invite users to join an organization
- **Product**: Invite users to work on a specific product
- **Project**: Invite users to contribute to a specific project

### Hierarchical Membership Rules
1. **Upward Propagation**: When invited to a lower level, automatically gain membership to higher levels
   - Project invitation → Auto-add to associated Product(s) and Organization (as VIEWER)
   - Product invitation → Auto-add to parent Organization (as VIEWER)
   
2. **No Downward Propagation**: Higher level membership doesn't grant lower level access
   - Organization membership ≠ Access to all products/projects
   - Product membership ≠ Access to all projects

## Visibility Controls Integration

### Visibility Levels
- **PUBLIC**: Visible to all users (including unauthenticated)
- **PRIVATE**: Only visible to members with appropriate roles
- **DRAFT**: Only visible to the author (for posts)

### Access Control Flow
1. **Check Visibility First**: Determine if content is public
2. **Check Authentication**: For private content, require authentication
3. **Check Permissions**: Use RBAC to determine access level
4. **Return 404 for Unauthorized**: Hide existence of private content

### Unified Permission System

```typescript
// Core authorization function
export async function can(
  user: User | null, 
  action: 'read' | 'update' | 'delete' | 'invite' | 'manage_members',
  entity: { id: string, type: EntityType, visibility?: Visibility }
): Promise<boolean> {
  // Public read access
  if (action === 'read' && entity.visibility === 'PUBLIC') {
    return true
  }
  
  // All other actions require auth
  if (!user) return false
  
  // Get effective role from RBAC
  const role = await getEffectiveRole(user.id, entity.type, entity.id)
  
  // Check permission based on role and action
  return hasPermission(role, action)
}
```

### Page Implementation Pattern

```typescript
// Same URL works for all users
// app/projects/[id]/page.tsx
export default async function ProjectPage({ params }) {
  const session = await getServerSession(authOptions)
  
  try {
    const { entity: project, user } = await canViewEntity(
      'project', 
      params.id, 
      session?.user?.id
    )
    
    // Progressive enhancement based on permissions
    const userRole = user 
      ? await getEffectiveRole(user.id, 'project', params.id) 
      : null
    
    return <ProjectView project={project} currentUser={user} userRole={userRole} />
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound() // 404 for private content
    }
    throw error
  }
}
```

## Final Design (After DRS Process)

### Database Schema

```typescript
// Visibility enum
enum Visibility {
  PUBLIC
  PRIVATE
  DRAFT    // Only for posts
}

// Add visibility to entities
model Product {
  // ... existing fields
  visibility Visibility @default(PUBLIC)
}

model Post {
  // ... existing fields  
  visibility Visibility @default(PUBLIC)
  isDraft    Boolean    @default(false)
}

// Note: Project already has visibility field

// Invitations table
{
  id: string
  token: string (unique, crypto.randomBytes(32).toString('hex'))
  type: enum (ORG | PRODUCT | PROJECT)
  targetId: string
  inviterId: string
  inviteeEmail: string
  role: enum (ADMIN | MEMBER | VIEWER)
  status: enum (PENDING | ACCEPTED | EXPIRED | REVOKED)
  message?: string
  expiresAt: DateTime
  createdAt: DateTime
}

// Update membership tables to add:
invitationId?: string  // Track invitation source
privilegeLevel: number // For role comparison (ADMIN=100, MEMBER=50, VIEWER=10)
```

### Role Conflict Resolution
**"Highest Privilege Wins" Rule**: When propagating memberships or when conflicts arise:
1. Check if user already has membership at that level
2. Compare privilege levels using numeric values
3. Keep the higher privilege role
4. Never downgrade existing permissions

### Security Enhancements
1. **Token Security**: 
   - Use crypto.randomBytes(32) for high entropy
   - Implement rate limiting on all invitation endpoints
   - Add exponential backoff for failed attempts

2. **Permission Validation**:
   - Verify inviter has appropriate role in target entity
   - Minimal information exposure before acceptance
   - Log all invitation attempts for security auditing

3. **Additional Protections**:
   - Domain allowlists for organizations
   - CAPTCHA for public invitation pages
   - Invitation attempt logging with anomaly detection

### Hierarchical Propagation Algorithm

```typescript
async function acceptInvitation(token: string, user: User) {
  // Start transaction
  await db.$transaction(async (tx) => {
    // 1. Validate invitation
    const invitation = await validateInvitation(token)
    
    // 2. Add to primary entity with invited role
    await addMembership(user, invitation.targetId, invitation.role)
    
    // 3. Propagate upward with VIEWER role
    if (invitation.type === 'PROJECT') {
      const project = await getProject(invitation.targetId)
      await addOrUpdateMembership(user, project.productId, 'VIEWER')
      await addOrUpdateMembership(user, project.organizationId, 'VIEWER')
    } else if (invitation.type === 'PRODUCT') {
      const product = await getProduct(invitation.targetId)
      await addOrUpdateMembership(user, product.organizationId, 'VIEWER')
    }
    
    // 4. Mark invitation as accepted
    await updateInvitation(invitation.id, { status: 'ACCEPTED' })
  })
}

async function addOrUpdateMembership(user, entityId, newRole) {
  const existing = await getMembership(user.id, entityId)
  if (existing) {
    // Compare privilege levels, keep higher
    if (getPrivilegeLevel(newRole) > getPrivilegeLevel(existing.role)) {
      await updateMembership(existing.id, { role: newRole })
    }
  } else {
    await createMembership(user.id, entityId, newRole)
  }
}
```

## RBAC System Extensions

### Current State Analysis

1. **Organization Level**: 
   - ✅ Has membership table (`OrganizationMember`)
   - ✅ Two roles: `OWNER` and `MEMBER`
   - ✅ Permission checks in API routes

2. **Product/Project Level**:
   - ❌ No membership tables - only direct ownership
   - ❌ No role granularity
   - ❌ Binary access control

### Required RBAC Changes (Simplified)

#### 1. Unified Role Model

**Standardized Roles Across All Levels:**
- **OWNER**: Full control (only at Organization level for now)
- **ADMIN**: Can manage members and settings
- **MEMBER**: Can contribute/edit content
- **VIEWER**: Read-only access

#### 2. New Membership Tables

```prisma
// Update Organization to use unified roles
enum UnifiedRole {
  OWNER    // Full control (organizations only initially)
  ADMIN    // Can manage members and settings
  MEMBER   // Can contribute/edit
  VIEWER   // Read-only access
}

model ProductMember {
  id           String       @id @default(cuid())
  role         UnifiedRole  @default(MEMBER)
  joinedAt     DateTime     @default(now())
  productId    String
  userId       String
  invitationId String?      // Track invitation source
  
  product      Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([productId, userId])
  @@index([userId])
  @@index([role])         // For permission queries
}

model ProjectMember {
  id           String       @id @default(cuid())
  role         UnifiedRole  @default(MEMBER)
  joinedAt     DateTime     @default(now())
  projectId    String
  userId       String
  invitationId String?      // Track invitation source
  
  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])
  @@index([userId])
  @@index([role])         // For permission queries
}
```

#### 3. Simplified Auth Middleware

```typescript
// lib/auth-utils.ts additions
const ROLE_HIERARCHY = { VIEWER: 1, MEMBER: 2, ADMIN: 3, OWNER: 4 }

// Get effective role with inheritance
export async function getEffectiveRole(
  userId: string,
  entityType: 'organization' | 'product' | 'project',
  entityId: string
): Promise<UnifiedRole | null> {
  // Check direct membership first
  switch (entityType) {
    case 'project':
      const projectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: entityId, userId } }
      })
      if (projectMember) {
        return projectMember.role
      }
      
      // Check parent product/org membership
      const project = await prisma.project.findUnique({
        where: { id: entityId },
        select: { productId: true, organizationId: true }
      })
      
      if (project?.productId) {
        return await getEffectiveRole(userId, 'product', project.productId)
      } else if (project?.organizationId) {
        return await getEffectiveRole(userId, 'organization', project.organizationId)
      }
      break
      
    case 'product':
      const productMember = await prisma.productMember.findUnique({
        where: { productId_userId: { productId: entityId, userId } }
      })
      if (productMember) {
        return productMember.role
      }
      
      // Check parent organization membership
      const product = await prisma.product.findUnique({
        where: { id: entityId },
        select: { organizationId: true }
      })
      
      if (product?.organizationId) {
        const orgRole = await getEffectiveRole(userId, 'organization', product.organizationId)
        // Organization OWNER gets ADMIN access, others get VIEWER
        return orgRole ? (orgRole === 'OWNER' ? 'ADMIN' : 'VIEWER') : null
      }
      break
      
    case 'organization':
      const orgMember = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: entityId, userId } }
      })
      return orgMember?.role as UnifiedRole | null
  }
  
  return null
}

// Simplified permission check
export async function requirePermission(
  entityType: 'organization' | 'product' | 'project',
  entityId: string,
  requiredRole: UnifiedRole = 'VIEWER'
) {
  const user = await requireAuth()
  const effectiveRole = await getEffectiveRole(user.id, entityType, entityId)
  
  if (!effectiveRole) {
    throw new AuthError('Access denied')
  }
  
  const userLevel = ROLE_HIERARCHY[effectiveRole]
  const requiredLevel = ROLE_HIERARCHY[requiredRole]
  
  if (userLevel < requiredLevel) {
    throw new AuthError(`Insufficient permissions. Required: ${requiredRole}, Current: ${effectiveRole}`)
  }
  
  return { user, role: effectiveRole }
}
```

#### 4. Permission Inheritance Rules

**Clear, Predictable Rules:**
1. **Explicit permissions override inherited ones**
2. **Organization OWNER → ADMIN access to all child entities**
3. **Organization MEMBER → VIEWER access to all child entities**
4. **No automatic downward propagation** (being in org doesn't auto-add to all projects)

#### 5. Invitation Permission Matrix

| Entity Type | Who Can Invite | Default Role for Invitee |
|-------------|----------------|-------------------------|
| Organization | OWNER only | MEMBER |
| Product | ADMIN or OWNER | MEMBER |
| Project | ADMIN or OWNER | MEMBER |

#### 6. Clean Migration Strategy

**One-Time Migration (No Long Backward Compatibility):**

```typescript
// Migration script
async function migrateToMembershipTables() {
  await prisma.$transaction(async (tx) => {
    // 1. Migrate product owners
    const products = await tx.product.findMany({
      where: { ownerId: { not: null } }
    })
    
    for (const product of products) {
      await tx.productMember.create({
        data: {
          productId: product.id,
          userId: product.ownerId!,
          role: 'ADMIN'
        }
      })
    }
    
    // 2. Migrate project owners
    const projects = await tx.project.findMany({
      where: { ownerId: { not: null } }
    })
    
    for (const project of projects) {
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: project.ownerId!,
          role: 'ADMIN'
        }
      })
    }
    
    // 3. Grant organization members VIEWER access to all products/projects
    const orgMembers = await tx.organizationMember.findMany({
      include: {
        organization: {
          include: {
            products: true,
            projects: true
          }
        }
      }
    })
    
    for (const member of orgMembers) {
      // Add as viewer to all products (unless already member)
      for (const product of member.organization.products) {
        await tx.productMember.upsert({
          where: {
            productId_userId: {
              productId: product.id,
              userId: member.userId
            }
          },
          create: {
            productId: product.id,
            userId: member.userId,
            role: 'VIEWER'
          },
          update: {} // Don't override existing roles
        })
      }
    }
  })
  
  // 4. Update all code to use membership tables
  // 5. Remove ownerId columns in next migration
}
```

#### 7. Membership Revocation

**Hard Delete with Cascade:**
When removing from organization, cascade delete all child memberships:

```typescript
async function removeFromOrganization(userId: string, organizationId: string) {
  await prisma.$transaction(async (tx) => {
    // Get all products and projects in org
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      include: { products: true, projects: true }
    })
    
    if (!org) throw new Error('Organization not found')
    
    // Delete all product memberships
    await tx.productMember.deleteMany({
      where: {
        userId,
        productId: { in: org.products.map(p => p.id) }
      }
    })
    
    // Delete all project memberships
    await tx.projectMember.deleteMany({
      where: {
        userId,
        projectId: { in: org.projects.map(p => p.id) }
      }
    })
    
    // Delete org membership
    await tx.organizationMember.delete({
      where: {
        organizationId_userId: { organizationId, userId }
      }
    })
  })
}

## Implementation Plan (Revised Order)

### Phase 0: RBAC Foundation (Prerequisite)
- Create membership tables for Products and Projects
- Implement unified role model (OWNER, ADMIN, MEMBER, VIEWER)
- Build `getEffectiveRole()` with caching
- Migrate existing owners to membership tables
- Update all permission checks to use new system
- **Goal**: Solid RBAC foundation before adding invitations

### Phase 1: Visibility Layer
- Add visibility field to Product and Post models
- Implement `can()` authorization function
- Implement `canViewEntity()` for visibility-aware fetching
- Update all pages to handle both authenticated and unauthenticated users
- Update API routes to return 404 for unauthorized private content
- Remove any separate public URL patterns
- **Goal**: Unified URLs with visibility-based access control

### Phase 2: Basic Organization Invitations
- Create invitations table with core fields
- Implement token generation and validation
- Build invitation API for organizations only
- Simple email sending with invitation link
- Basic UI for creating and accepting org invitations
- **Goal**: Prove the invitation system works at one level

### Phase 3: Hierarchical Invitations
- Extend invitations to Products and Projects
- Implement hierarchical membership propagation
- Add transactional acceptance with role assignment
- Handle role conflict resolution (highest wins)
- **Goal**: Full hierarchical invitation system

### Phase 4: Production Readiness
- Implement cascade deletion for membership revocation
- Create invitation management dashboard
- Add cache invalidation strategy (session versioning)
- Implement timing attack prevention
- Add metrics and monitoring
- **Goal**: Scalable, secure, maintainable system

## User Experience Flows

### New User Flow
1. Click invitation link → Signup page
2. "Create an account to join [Team Name]"
3. Complete signup (invitation token preserved)
4. Auto-accept invitation after email verification
5. Redirect to team/project page

### Existing User Flow
1. Click invitation link → Login page
2. After login → Invitation acceptance page
3. "You've been invited to join [Team Name] as [Role]"
4. [Accept] [Decline] buttons
5. On accept → Add memberships → Redirect to entity

## Critical Implementation Notes

1. **Atomicity**: All membership changes must be in a single transaction
2. **Service Pattern**: Use `InvitationAcceptanceService` to encapsulate logic
3. **Testing**: Focus heavily on edge cases in propagation logic
4. **Performance**: Consider caching for membership checks at scale
5. **Monitoring**: Track invitation metrics for UX improvements

## Summary of Unified Design

After merging visibility controls with the invitation system, we have a comprehensive access control solution:

1. **Unified System**: Single system handles both visibility (PUBLIC/PRIVATE/DRAFT) and permissions (RBAC)
2. **Same URLs**: No separate public URLs - same endpoints serve different content based on auth/permissions
3. **Security by Default**: Private content returns 404 to unauthorized users, preventing information leakage
4. **Progressive Enhancement**: Public users see public content, authenticated users see what they have access to
5. **Clear Architecture**: Visibility checked first, then authentication, then permissions
6. **Simplified Implementation**: Build on RBAC foundation, add visibility layer, then invitations

The key insight is that visibility and permissions are complementary but separate concerns. Visibility determines what can potentially be seen, while permissions determine who can see it. This separation makes the system both secure and user-friendly.

## MCP Integration

### MCP Tools for Invitation Management

The invitation system should be exposed through MCP tools to enable AI assistants to help with member management:

#### 1. Invitation Management Tool

```typescript
// src/lib/mcp/tools/invitations.ts
export const invitationTools = {
  name: 'maix_manage_invitation',
  description: 'Create, list, cancel, or resend invitations to organizations, products, or projects',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'list', 'cancel', 'resend', 'get'],
        description: 'The operation to perform'
      },
      entityType: {
        type: 'string',
        enum: ['organization', 'product', 'project'],
        description: 'Type of entity to invite to'
      },
      entityId: {
        type: 'string',
        description: 'ID of the entity (org/product/project)'
      },
      inviteeEmail: {
        type: 'string',
        format: 'email',
        description: 'Email address to invite (for create action)'
      },
      role: {
        type: 'string',
        enum: ['ADMIN', 'MEMBER', 'VIEWER'],
        description: 'Role to assign (defaults to MEMBER)'
      },
      message: {
        type: 'string',
        description: 'Optional personal message to include'
      },
      invitationId: {
        type: 'string',
        description: 'Invitation ID (for cancel/resend/get actions)'
      }
    },
    required: ['action']
  }
}
```

#### 2. Membership Management Tool

```typescript
// Extend existing organization member tool to support all entity types
export const membershipTools = {
  name: 'maix_manage_membership',
  description: 'Manage members across organizations, products, and projects',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'update_role', 'remove'],
        description: 'The operation to perform'
      },
      entityType: {
        type: 'string',
        enum: ['organization', 'product', 'project'],
        description: 'Type of entity'
      },
      entityId: {
        type: 'string',
        description: 'ID of the entity'
      },
      userId: {
        type: 'string',
        description: 'User ID (for update_role/remove)'
      },
      newRole: {
        type: 'string',
        enum: ['ADMIN', 'MEMBER', 'VIEWER'],
        description: 'New role (for update_role action)'
      }
    },
    required: ['action', 'entityType', 'entityId']
  }
}
```

#### 3. Permission Check Tool

```typescript
// Tool to check effective permissions
export const permissionTools = {
  name: 'maix_check_permission',
  description: 'Check a user\'s effective permissions for an entity',
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'User ID to check (defaults to current user)'
      },
      entityType: {
        type: 'string',
        enum: ['organization', 'product', 'project'],
        description: 'Type of entity'
      },
      entityId: {
        type: 'string',
        description: 'ID of the entity'
      }
    },
    required: ['entityType', 'entityId']
  }
}
```

### MCP Tool Implementation

The MCP tools would integrate with the invitation system by:

1. **Authentication**: Using the existing MCP authentication middleware
2. **Permission Checks**: Calling `requirePermission()` before operations
3. **Transactional Operations**: Using the same transactional patterns for consistency
4. **Error Handling**: Returning structured errors that AI can understand

Example implementation:

```typescript
async function handleInvitationTool(params: InvitationParams, session: Session) {
  const { action, entityType, entityId } = params
  
  switch (action) {
    case 'create':
      // Check permission to invite
      const requiredRole = entityType === 'organization' ? 'OWNER' : 'ADMIN'
      await requirePermission(entityType, entityId, requiredRole)
      
      // Create invitation
      const invitation = await createInvitation({
        type: entityType,
        targetId: entityId,
        inviterId: session.user.id,
        inviteeEmail: params.inviteeEmail,
        role: params.role || 'MEMBER',
        message: params.message
      })
      
      // Send email
      await sendInvitationEmail(invitation)
      
      return {
        success: true,
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt
      }
      
    case 'list':
      // List invitations for an entity
      await requirePermission(entityType, entityId, 'VIEWER')
      const invitations = await prisma.invitation.findMany({
        where: {
          type: entityType,
          targetId: entityId,
          status: 'PENDING'
        }
      })
      return { invitations }
      
    // ... other actions
  }
}
```

### Benefits of MCP Integration

1. **AI-Assisted Management**: Users can ask AI to help manage team members
2. **Bulk Operations**: AI can handle repetitive tasks like inviting multiple users
3. **Permission Queries**: AI can explain who has access to what
4. **Audit Trail**: All MCP operations are logged for compliance

### Usage Examples

```
User: "Invite sarah@example.com to my AI Assistant project as a member"
AI: [Uses maix_manage_invitation tool to create invitation]

User: "Who has access to the Customer Portal product?"
AI: [Uses maix_manage_membership tool to list members]

User: "Make John an admin of the Research Organization"
AI: [Uses maix_manage_membership tool to update role]
```

## Next Steps
1. Implement Phase 0: RBAC Foundation
   - Create Prisma schema for membership tables
   - Build auth middleware
   - Migrate existing data
2. Add MCP tool implementations alongside API endpoints
3. Then proceed with invitation system on solid foundation