# Invitation System Design

## Overview
Design for a hierarchical invitation system that allows users to invite others to organizations, products, or projects with automatic hierarchical membership propagation.

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

## Final Design (After DRS Process)

### Database Schema

```typescript
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

### Phase 1: Basic Organization Invitations
- Create invitations table with core fields
- Implement token generation and validation
- Build invitation API for organizations only
- Simple email sending with invitation link
- Basic UI for creating and accepting org invitations
- **Goal**: Prove the invitation system works at one level

### Phase 2: Hierarchical Invitations
- Extend invitations to Products and Projects
- Implement hierarchical membership propagation
- Add transactional acceptance with role assignment
- Handle role conflict resolution (highest wins)
- **Goal**: Full hierarchical invitation system

### Phase 3: Production Readiness
- Implement cascade deletion for membership revocation
- Create invitation management dashboard
- Add metrics and monitoring
- Performance optimization only if needed
- **Goal**: Scalable, maintainable system

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

## Summary of Simplified Design

After the DRS process, the design has been significantly simplified:

1. **Unified Roles**: One consistent role model (OWNER, ADMIN, MEMBER, VIEWER) across all entities
2. **Clean Migration**: One-time migration instead of long backward compatibility period
3. **Simple Permission Checks**: Direct database queries with inheritance, no caching complexity
4. **Clear Inheritance**: Explicit rules for permission inheritance with overrides
5. **Revised Phases**: Start with RBAC foundation before building invitations

The key insight is that we need a solid RBAC system first (Phase 0) before we can properly implement invitations. This ensures we have the right permission infrastructure in place.

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