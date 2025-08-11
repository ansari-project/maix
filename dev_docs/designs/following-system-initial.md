# Following System Design - Initial

## Problem Statement & Requirements

### Nature of the Problem
We need to implement a "following" concept that creates a new access level hierarchy: **Follower → Member → Admin**, where following provides external interest with limited visibility privileges. This addresses the gap between completely public access and full membership.

### Why This Problem Needs Solving
Currently, users can either:
1. **View public content** (no relationship to the entity)
2. **Apply/Join as full members** (high commitment, immediate internal access)

There's no middle ground for users who want to **stay informed without full commitment**. Following fills this gap by providing:
- **Interest signaling** without membership obligations
- **Curated updates** for interested external users  
- **Discovery pathway** from follower → member → admin

### Functional Requirements
1. **Follow/Unfollow Actions**: Users can follow/unfollow organizations, projects, and products
2. **Follower Visibility**: Followers can see public content + curated updates meant for followers
3. **Activity Feeds**: Followers receive notifications/updates about followed entities
4. **Discovery Features**: Users can discover popular/trending entities to follow
5. **Management Interface**: Users can manage what they follow in one place
6. **Cross-Entity Consistency**: Following works similarly across organizations, projects, products

### Non-Functional Requirements
- **Performance**: Following relationships should scale to 10K+ followers per entity
- **Data Integrity**: No orphaned following relationships
- **Migration Safety**: Existing member/admin relationships must be preserved
- **API Consistency**: Following APIs should match existing member management patterns

### Success Criteria
- Users can follow organizations without becoming members
- Following provides meaningful value (updates, discovery)
- Clear progression path: Follower → Member → Admin
- Consistent experience across all entity types

---

## Current System Analysis

### Database Schema State
- **Organizations**: Use `OrganizationMember` table with `OrgRole` enum (OWNER, MEMBER)
- **Projects**: Use `ProjectMember` table with `UnifiedRole` enum (OWNER, ADMIN, MEMBER, VIEWER)  
- **Products**: Use `ProductMember` table with `UnifiedRole` enum (same as projects)

### Key Issues Identified
1. **Inconsistent Role Systems**: Organizations use 2-level roles while Projects/Products use 4-level roles
2. **No External Interest Tracking**: No way to track users interested in entities without full membership
3. **Application Flow Complexity**: Projects have application system but no lightweight following option

---

## Architecture Proposals

### Approach A: Unified Following Table (Polymorphic)

**Database Schema:**
```sql
model Following {
  id             String   @id @default(cuid())
  userId         String
  followableId   String
  followableType FollowableType // ORGANIZATION, PROJECT, PRODUCT
  followedAt     DateTime @default(now())
  notificationsEnabled Boolean @default(true)
  
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, followableId, followableType])
  @@index([userId])
  @@index([followableId, followableType])
  @@index([followedAt])
}

enum FollowableType {
  ORGANIZATION
  PROJECT  
  PRODUCT
}
```

**Pros:**
- Single table for all following relationships
- Easy cross-entity queries ("what does user X follow?")
- Consistent following behavior across all entity types
- Simple to implement notifications/activity feeds
- Future entity types automatically supported

**Cons:**
- Polymorphic relationships harder to enforce referential integrity
- No type-safe relationships in Prisma
- Potential performance concerns with mixed entity types
- Complex joins for entity-specific data

### Approach B: Separate Following Tables (Type-Safe)

**Database Schema:**
```sql
model OrganizationFollower {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  followedAt     DateTime     @default(now())
  notificationsEnabled Boolean @default(true)
  
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([userId, organizationId])
  @@index([userId])
  @@index([organizationId])
}

model ProjectFollower {
  id             String   @id @default(cuid()) 
  userId         String
  projectId      String
  followedAt     DateTime @default(now())
  notificationsEnabled Boolean @default(true)
  
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([userId, projectId])
  @@index([userId])
  @@index([projectId])
}

model ProductFollower {
  id             String  @id @default(cuid())
  userId         String
  productId      String
  followedAt     DateTime @default(now())
  notificationsEnabled Boolean @default(true)
  
  user           User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product        Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@unique([userId, productId])
  @@index([userId])
  @@index([productId])
}
```

**Pros:**
- Type-safe relationships with proper foreign keys
- Better query performance (indexed relationships)
- Matches existing member table pattern
- Clear separation of concerns per entity type
- Easier to optimize per entity type

**Cons:**
- Three separate tables to maintain
- More complex cross-entity queries
- Code duplication in following logic
- New entity types require new tables

### Approach C: Extend Existing Member Tables

**Database Schema Changes:**
```sql
enum UnifiedRole {
  OWNER
  ADMIN  
  MEMBER
  FOLLOWER  // NEW
}

enum OrgRole {
  OWNER
  MEMBER
  FOLLOWER  // NEW - requires migration
}

// Add to existing member tables:
model OrganizationMember {
  // ... existing fields ...
  role           OrgRole  // Now includes FOLLOWER
  followedAt     DateTime? // Only for followers
  notificationsEnabled Boolean @default(true) // Only for followers
}

model ProjectMember {
  // ... existing fields ...
  role           UnifiedRole // Already supports hierarchy
  followedAt     DateTime? // Only for followers  
  notificationsEnabled Boolean @default(true) // Only for followers
}

model ProductMember {
  // ... existing fields ...
  role           UnifiedRole // Already supports hierarchy
  followedAt     DateTime? // Only for followers
  notificationsEnabled Boolean @default(true) // Only for followers
}
```

**Pros:**
- Leverages existing permission system
- Unified access control logic
- No new tables needed
- Natural role hierarchy: FOLLOWER < MEMBER < ADMIN < OWNER
- Easy role transitions (follower can become member)

**Cons:**
- Requires migrating Organization role system to UnifiedRole
- Mixing membership and following semantics
- More complex role transition logic
- Breaking change to existing OrganizationMember queries

---

## Simplification Options

### Option 1: Organization-Only Initial Implementation ✅ **RECOMMENDED**
**What**: Implement following only for organizations initially, expand to projects/products later
**Why**: Reduces scope, allows learning from user behavior, organizations are most suitable for following
**Tradeoff**: Less consistency initially, but faster time-to-market

### Option 2: Read-Only Following ✅ **RECOMMENDED**
**What**: Followers can only view content, cannot participate (no comments, reactions, etc.)
**Why**: Simpler permission system, clearer distinction from members
**Tradeoff**: Less engagement for followers, but clearer value proposition

### Option 3: No Notification System Initially ✅ **RECOMMENDED**
**What**: Skip activity feeds/notifications in MVP, add later
**Why**: Complex feature that can be added after core following works
**Tradeoff**: Less value for followers initially, but much simpler implementation

### Option 4: Skip Role System Unification
**What**: Keep existing OrgRole/UnifiedRole inconsistency, don't unify
**Why**: Avoids complex migration, less breaking changes
**Tradeoff**: System remains inconsistent, missed opportunity to clean up architecture

### Option 5: Single Following Type
**What**: Don't implement different following types (watching vs interested vs etc.)
**Why**: Simpler user experience and implementation
**Tradeoff**: Less granular control for users, but clearer mental model

---

## Open Questions

### Tier 1: Critical Blockers (MUST answer before Plan)

1. **Architecture Choice**: Which approach should we use - Unified table (A), Separate tables (B), or Extend members (C)?

2. **Role System Unification**: Should we unify OrgRole and UnifiedRole now or keep them separate?

3. **Entity Scope**: Start with organizations only, or implement for all entity types simultaneously?

4. **Follower Permissions**: What exactly can followers see that non-followers cannot?
   - Private organization updates made public to followers?
   - Member directory?
   - Internal discussions marked "followers can see"?

### Tier 2: Important (Should answer before relevant phase)

5. **Notification System**: How should followers receive updates?
   - Email digests?
   - In-app notifications?
   - Activity feed?
   - All of the above?

6. **Discovery Features**: How do users find entities to follow?
   - "Suggested to follow" recommendations?
   - Trending/popular entities?
   - Follow lists from other users?

7. **Management Interface**: Where do users manage their following relationships?
   - Dedicated "Following" page?
   - Settings panel?
   - Profile page?

8. **Transition Flow**: How do followers become members?
   - Direct upgrade button?
   - Must still go through application process?
   - Different flow per entity type?

### Tier 3: Deferrable (Can answer during implementation)

9. **Analytics**: Should we track follower engagement metrics?

10. **Following Limits**: Should there be limits on how many entities a user can follow?

11. **Visibility Controls**: Should entity owners be able to hide follower counts?

---

## Alternative Approaches Considered

### GitHub-Style Following
**What**: Follow individual users rather than organizations/projects
**Why Rejected**: Doesn't fit our organization-centric model, adds complexity

### Subscription-Based Model  
**What**: Paid subscriptions for premium following features
**Why Rejected**: Conflicts with not-for-profit mission, premature monetization

### Activity-Based Auto-Following
**What**: Automatically follow entities user interacts with
**Why Rejected**: Could create unwanted relationships, users should explicitly choose

### Public Following Lists
**What**: Make user's following lists public by default
**Why Rejected**: Privacy concerns, not core to MVP

---

## Expert Review Results

**Note**: Expert analysis encountered a technical issue and provided analysis of an unrelated MCP client issue instead of the following system design. A subsequent expert review should be conducted during the Align phase.

**Next Steps**: The design requires human review and alignment on the critical architectural decisions before proceeding to detailed planning.