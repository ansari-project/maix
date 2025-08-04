# Maix RBAC with Organizations

## Overview

This document outlines a comprehensive Role-Based Access Control (RBAC) system for Maix that introduces organizations as a first-class entity. Organizations provide a way to group users, manage permissions, control access to different apps, and maintain privacy for products and projects.

**Core Principles:**
- Keep it simple - start with essential features only
- Public by default - maintain the open community spirit
- Progressive enhancement - add complexity only when needed
- Respect cultural values around privacy and collaboration

## Key Concepts

### 1. Organizations
Organizations are groups of users working together on projects and products. They provide:
- A namespace for products and projects
- Member management with role-based permissions
- Access control to different Maix apps
- Billing and usage tracking (future)

### 2. Organization Roles
Simple role hierarchy within organizations:
- **Owner**: Full control, cannot be removed
- **Admin**: Can manage members, projects, and products
- **Member**: Can create and contribute to projects/products
- **Viewer**: Read-only access to private content

### 3. Visibility Levels
Both projects and products can have:
- **Public**: Visible to everyone (default)
- **Organization**: Visible only to organization members
- **Private**: Visible only to specific collaborators

### 4. Apps
Apps are platform-level features/modules that are part of Maix itself. Organizations can be granted access to different apps:
- **Core**: Basic Maix functionality (always available to all organizations)
- **CauseMon**: Cause monitoring and impact tracking app
- Future apps can be added to the platform as new features are developed

The `OrganizationApp` model tracks which organizations have been granted access to which Maix apps.

## Database Schema

### New Prisma Models

```prisma
// Organization model - groups of users working together
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique // URL-friendly identifier
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  isActive    Boolean  @default(true)
  
  // Relations
  createdBy   User     @relation("OrganizationCreator", fields: [createdById], references: [id])
  createdById String
  
  members     OrganizationMember[]
  projects    Project[]
  products    Product[]
  apps        OrganizationApp[]
  
  // Users who have this as their personal organization
  personalOrgUsers User[] @relation("PersonalOrganization")
  
  @@map("organizations")
}

// Organization membership with roles
model OrganizationMember {
  id             String       @id @default(cuid())
  role           OrgRole      @default(MEMBER)
  joinedAt       DateTime     @default(now())
  
  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  organizationId String
  
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId         String
  
  invitedBy      User?        @relation("MemberInvitations", fields: [invitedById], references: [id])
  invitedById    String?
  
  @@unique([organizationId, userId])
  @@map("organization_members")
}

// Tracks which Maix apps an organization has access to
model OrganizationApp {
  id          String   @id @default(cuid())
  appName     String   // Name of the Maix app: 'core', 'causemon', etc.
  enabled     Boolean  @default(true)
  enabledAt   DateTime @default(now())
  
  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  organizationId String
  
  enabledBy      User?        @relation(fields: [enabledById], references: [id])
  enabledById    String?
  
  @@unique([organizationId, appName])
  @@map("organization_apps")
}

// Collaborators for private projects/products
model Collaborator {
  id           String              @id @default(cuid())
  resourceType CollaboratorResource
  resourceId   String              // project_id or product_id
  permission   CollaboratorPermission @default(VIEW)
  invitedAt    DateTime            @default(now())
  
  // Relations
  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  
  invitedBy    User?               @relation("CollaboratorInvitations", fields: [invitedById], references: [id])
  invitedById  String?
  
  @@unique([resourceType, resourceId, userId])
  @@map("collaborators")
}

// New Enums
enum OrgRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

enum Visibility {
  PUBLIC
  ORGANIZATION
  PRIVATE
}

enum CollaboratorResource {
  PROJECT
  PRODUCT
}

enum CollaboratorPermission {
  VIEW
  EDIT
}
```

### Updates to Existing Models

```prisma
// Update User model
model User {
  // ... existing fields ...
  
  // New organization relations
  personalOrganization    Organization? @relation("PersonalOrganization", fields: [personalOrganizationId], references: [id])
  personalOrganizationId  String?       @unique
  
  organizationMemberships OrganizationMember[]
  createdOrganizations    Organization[] @relation("OrganizationCreator")
  enabledApps            OrganizationApp[]
  collaborations         Collaborator[]
  invitedMembers         OrganizationMember[] @relation("MemberInvitations")
  invitedCollaborators   Collaborator[] @relation("CollaboratorInvitations")
  
  // ... existing relations ...
}

// Update Project model
model Project {
  // ... existing fields ...
  
  // New organization fields
  organization    Organization? @relation(fields: [organizationId], references: [id])
  organizationId  String?
  visibility      Visibility    @default(PUBLIC)
  
  // ... existing relations ...
}

// Update Product model  
model Product {
  // ... existing fields ...
  
  // New organization fields
  organization    Organization? @relation(fields: [organizationId], references: [id])
  organizationId  String?
  visibility      Visibility    @default(PUBLIC)
  
  // ... existing relations ...
}
```

## Implementation Phases

Following DRSITR (Design, Review, Simplify, Implement, Test, Review), we'll implement in phases:

### Phase 1: Personal Organizations (MVP)
**Goal**: Every user gets a personal organization automatically

1. **Database Changes**:
   - Create organization tables
   - Add organization_id to projects/products
   - Add visibility field (public only for now)

2. **Auto-creation Logic**:
   - When a user signs up, create their personal organization
   - Name: User's display name
   - Slug: Based on email or unique identifier
   - User is automatically the owner

3. **Migration**:
   - Create personal organizations for all existing users
   - Assign existing projects/products to personal organizations

4. **UI Changes**:
   - None initially - personal orgs are invisible to users
   - Projects/products continue to work as before

### Phase 2: Organization UI & Management
**Goal**: Let users see and manage their organization

1. **Organization Profile**:
   - Settings page to edit organization name/description
   - View organization members (just the owner initially)
   - Organization dashboard showing projects/products

2. **Project/Product Creation**:
   - Projects/products automatically belong to personal org
   - No organization picker yet (keep it simple)

### Phase 3: Visibility Controls
**Goal**: Implement private/organization visibility

1. **Add Visibility Toggle**:
   - During project/product creation
   - In project/product settings
   - Default remains public

2. **Access Control**:
   - Middleware to check visibility permissions
   - API route protection
   - 404 for unauthorized access (don't leak existence)

3. **UI Indicators**:
   - Lock icon for private content
   - Organization badge for org-only content
   - Clear visibility status in lists

### Phase 4: Multiple Organizations
**Goal**: Allow users to create/join additional organizations

1. **Organization CRUD**:
   - Create new organization
   - Invite members via email
   - Accept/decline invitations
   - Leave organization

2. **Organization Switcher**:
   - Dropdown in header to switch context
   - Remember last selected organization
   - Clear indication of current context

3. **Permissions Enforcement**:
   - Check user's role for each action
   - Proper error messages
   - Audit logging for sensitive actions

### Phase 5: App Access Control
**Goal**: Control which organizations can access different Maix platform apps

1. **App Registry**:
   - Define available Maix apps (core, causemon, etc.)
   - App metadata and access requirements
   - Default app access rules (e.g., core is always available)

2. **Access Management**:
   - Platform admins grant/revoke app access to organizations
   - Organizations can view which apps they have access to
   - App-specific settings and configuration per organization
   - Usage tracking and analytics per app/organization

3. **App Routing**:
   - Apps accessed via /org/[slug]/apps/[app-name]
   - App-specific layouts and navigation
   - Proper access checks before loading app
   - Cross-app data sharing policies

## UI/UX Considerations

### Organization Context
- Clear indication of current organization in header
- Organization switcher for users in multiple orgs
- Personal org can be styled differently (e.g., "Personal Workspace")

### Visibility Indicators
- **Public**: Globe icon, "Public" badge
- **Organization**: Building icon, org name badge  
- **Private**: Lock icon, "Private" badge

### Permission Feedback
- Clear error messages when access is denied
- Explanatory text about why something is not accessible
- Contact organization admin for access

### Progressive Disclosure
- Start with personal organizations (invisible complexity)
- Introduce organization UI only when needed
- Hide advanced features until user demonstrates need

## Security Considerations

### Access Control
- Always check visibility before displaying content
- Use database-level RLS (Row Level Security) where possible
- Audit log for permission changes and sensitive actions

### Data Isolation
- Organization data should be properly isolated
- No data leakage between organizations
- Careful with search - respect visibility boundaries

### Invitation Security
- Time-limited invitation tokens
- Verify email ownership before granting access
- Rate limit invitation sending

## Migration Strategy

### Phase 1 Migration (Personal Orgs)

Create a Prisma migration that will:

1. **Add new tables and fields**
   ```bash
   npx prisma migrate dev --name add-organizations
   ```

2. **Data migration script** (in a separate migration file):
   ```typescript
   // migrations/[timestamp]_create_personal_orgs.ts
   import { PrismaClient } from '@prisma/client'
   
   const prisma = new PrismaClient()
   
   async function main() {
     // Create personal organization for each user
     const users = await prisma.user.findMany()
     
     for (const user of users) {
       // Create slug from email or username
       const slug = user.username || 
         user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
       
       // Create personal organization
       const org = await prisma.organization.create({
         data: {
           name: user.name || user.username || 'Personal',
           slug: `${slug}-${user.id.slice(0, 8)}`, // Ensure uniqueness
           createdById: user.id,
           members: {
             create: {
               userId: user.id,
               role: 'OWNER'
             }
           }
         }
       })
       
       // Update user with personal org reference
       await prisma.user.update({
         where: { id: user.id },
         data: { personalOrganizationId: org.id }
       })
       
       // Assign existing projects to personal org
       await prisma.project.updateMany({
         where: { ownerId: user.id },
         data: { organizationId: org.id }
       })
       
       // Assign existing products to personal org
       await prisma.product.updateMany({
         where: { ownerId: user.id },
         data: { organizationId: org.id }
       })
     }
   }
   
   main()
     .catch(console.error)
     .finally(() => prisma.$disconnect())
   ```

## API Changes

### New Endpoints
- `/api/organizations` - List user's organizations
- `/api/organizations/[slug]` - Get/update organization
- `/api/organizations/[slug]/members` - Manage members
- `/api/organizations/[slug]/apps` - Manage app access

### Modified Endpoints
- `/api/projects` - Filter by organization, check visibility
- `/api/products` - Filter by organization, check visibility  
- `/api/search` - Respect visibility boundaries

### Authorization Middleware
```typescript
// Example middleware
export async function checkResourceAccess(
  userId: string,
  resourceType: 'project' | 'product',
  resourceId: string
): Promise<boolean> {
  const resource = await getResource(resourceType, resourceId);
  
  // Public resources are always accessible
  if (resource.visibility === 'public') return true;
  
  // Check organization membership
  if (resource.visibility === 'organization') {
    return isOrganizationMember(userId, resource.organizationId);
  }
  
  // Check specific collaborator access
  if (resource.visibility === 'private') {
    return isCollaborator(userId, resourceType, resourceId);
  }
  
  return false;
}
```

## Future Considerations

### Billing & Limits
- Organization-level billing
- Member limits based on plan
- Storage/usage quotas

### Advanced Permissions
- Custom roles beyond the basic four
- Granular permissions (e.g., can create projects but not products)
- Permission templates

### Federation
- Cross-organization collaboration
- Shared projects between organizations
- Guest access with limited permissions

## Success Metrics

### Adoption
- Percentage of users creating non-personal organizations
- Average members per organization
- Projects/products marked as private/organization

### Engagement  
- Collaboration rate on private projects
- App usage per organization
- Member activity within organizations

### Security
- Zero unauthorized access incidents
- Successful permission checks percentage
- Time to revoke access when needed

## Conclusion

This RBAC system provides a flexible foundation for Maix to grow from individual users to collaborative organizations while maintaining simplicity and cultural sensitivity. By starting with personal organizations and progressively adding features, we can ensure each addition provides real value without unnecessary complexity.

The phased approach allows us to:
1. Start simple with invisible personal organizations
2. Add visibility controls for privacy needs
3. Enable true multi-user collaboration
4. Support specialized apps for different use cases

This design respects the DRSITR principle by keeping initial implementation simple while providing a clear path for future enhancements based on actual user needs.