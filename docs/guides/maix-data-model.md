# MAIX Data Model & Project Lifecycle Guide

This comprehensive guide explains the data model architecture of the MAIX platform, including relationships, patterns, design decisions, and detailed project lifecycle management.

## Overview

MAIX uses a PostgreSQL database with Prisma ORM to manage data relationships. The platform is built around connecting Muslim volunteers with technology projects through a structured workflow that includes project management, community discussion, and skill matching.

## Project Lifecycle Management

MAIX projects follow a structured lifecycle with clear states and transitions to help coordinate volunteer efforts effectively.

### Project Status Overview

MAIX projects have two complementary status systems:

1. **Project Status** (`status`): Tracks the project's lifecycle phase
2. **Recruitment Status** (`isActive`): Controls whether the project is actively seeking volunteers

### Project Lifecycle States

#### 1. AWAITING_VOLUNTEERS
- **Purpose**: Project is defined and ready, waiting for volunteers to join
- **Typical Duration**: Until sufficient volunteers apply and are accepted
- **Recruitment**: Usually `isActive: true` to attract volunteers
- **Next States**: PLANNING (when volunteers are onboarded)

**Example**: "AI-powered Islamic prayer time app" has clear requirements but needs developers

#### 2. PLANNING  
- **Purpose**: Team is assembled and working on detailed planning, architecture, and task breakdown
- **Typical Duration**: 1-4 weeks depending on project complexity
- **Recruitment**: May be `isActive: false` if team is complete, or `true` if specific skills are still needed
- **Next States**: IN_PROGRESS (when planning is complete and implementation begins)

**Example**: Team is designing the app architecture, creating wireframes, and defining the technical stack

#### 3. IN_PROGRESS
- **Purpose**: Active development work is happening
- **Typical Duration**: Most of the project timeline
- **Recruitment**: Usually `isActive: false`, but may be `true` if additional skills are needed mid-project
- **Next States**: COMPLETED (when project goals are met), ON_HOLD (if work needs to pause), CANCELLED (if project cannot continue)

**Example**: Developers are building features, designers are creating UI components, testing is ongoing

#### 4. ON_HOLD
- **Purpose**: Work has temporarily stopped due to external factors (volunteer availability, dependency issues, etc.)
- **Typical Duration**: Varies widely - could be weeks to months
- **Recruitment**: Often `isActive: true` to find replacement volunteers or additional help
- **Next States**: IN_PROGRESS (when work resumes), CANCELLED (if project cannot continue)

**Example**: Lead developer became unavailable, waiting for new volunteer to take over technical leadership

#### 5. COMPLETED
- **Purpose**: Project has successfully delivered its goals
- **Typical Duration**: Final state
- **Recruitment**: Always `isActive: false`
- **Next States**: None (terminal state)

**Example**: Prayer time app is published on app stores and functioning as intended

#### 6. CANCELLED
- **Purpose**: Project has been permanently discontinued
- **Typical Duration**: Final state  
- **Recruitment**: Always `isActive: false`
- **Next States**: None (terminal state)

**Example**: Technical challenges proved insurmountable, or requirements changed fundamentally

### Status Transitions

#### Valid Transitions

```
AWAITING_VOLUNTEERS → PLANNING → IN_PROGRESS → COMPLETED
                                     ↓
                                  ON_HOLD ←→ IN_PROGRESS
                                     ↓
                                 CANCELLED

Any state → CANCELLED (projects can be cancelled at any time)
```

#### Important Guidelines

1. **COMPLETED projects should never transition to other states** - if more work is needed, create a new related project
2. **CANCELLED projects should never transition to other states** - if the project is revived, create a new project
3. **Projects can move back and forth between IN_PROGRESS and ON_HOLD** as needed
4. **PLANNING can transition back to AWAITING_VOLUNTEERS** if the initial team doesn't work out

### Best Practices

#### For Project Owners

1. **Update status regularly** to keep volunteers and the community informed
2. **Use meaningful status updates** when changing states - explain why the transition happened
3. **Consider recruitment needs** when changing status - does the new phase require different skills?
4. **Communicate with your team** before changing status, especially to ON_HOLD or CANCELLED

#### For Volunteers

1. **Check both status and isActive** when browsing projects
2. **Understand the commitment level** - AWAITING_VOLUNTEERS projects need initial commitment, IN_PROGRESS projects need ongoing work
3. **Consider joining ON_HOLD projects** - they often need fresh perspective and energy

#### For Platform Users

1. **Filter by status** to find projects matching your availability:
   - Looking to start something new? Filter for AWAITING_VOLUNTEERS
   - Want to join active work? Filter for IN_PROGRESS  
   - Can help restart stalled projects? Filter for ON_HOLD
2. **Use status for realistic expectations** about project timeline and commitment

### Lifecycle FAQ

**Q: What's the difference between status and isActive?**
A: `status` tracks where the project is in its lifecycle, while `isActive` controls recruitment. A project can be IN_PROGRESS but still `isActive: true` if they need additional volunteers.

**Q: Can a COMPLETED project be reopened?**  
A: No. If more work is needed, create a new related project. This keeps project history clean and clear.

**Q: Should I set isActive to false when moving to PLANNING?**
A: It depends. If your team is complete and you're focused on planning, set it to false. If you still need specific skills for planning (like a designer or product manager), keep it true.

**Q: What if a project needs to go back to planning from IN_PROGRESS?**
A: This might indicate the planning phase wasn't complete. Consider if the project should transition to ON_HOLD while re-planning occurs, or create a new project with the revised scope.

### Technical Implementation

#### Database Schema
```sql
enum ProjectStatus {
  AWAITING_VOLUNTEERS
  PLANNING
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CANCELLED
}

-- Project model includes:
status ProjectStatus @default(AWAITING_VOLUNTEERS)
isActive Boolean @default(true)
```

#### API Usage
```typescript
// Create project (defaults to AWAITING_VOLUNTEERS)
await prisma.project.create({
  data: { /* project data */ }
});

// Update project status
await prisma.project.update({
  where: { id: projectId },
  data: { 
    status: 'IN_PROGRESS',
    isActive: false // Stop recruiting since work has started
  }
});

// Query projects by status
const activeProjects = await prisma.project.findMany({
  where: { 
    status: { in: ['AWAITING_VOLUNTEERS', 'PLANNING', 'IN_PROGRESS'] },
    isActive: true 
  }
});
```

## Core Entities

### Users

The `User` model represents all platform participants - both project owners and volunteers.

```prisma
model User {
  id              String            @id @default(cuid())
  email           String            @unique
  username        String            @unique
  name            String?
  image           String?
  password        String?           // For local auth (optional with OAuth)
  specialty       Specialty?        // AI, FULL_STACK, PROGRAM_MANAGER
  experienceLevel ExperienceLevel?  // HOBBYIST, INTERN, NEW_GRAD, SENIOR
  bio             String?
  linkedinUrl     String?
  githubUrl       String?
  portfolioUrl    String?
  skills          String[]          // Array of skill names
  availability    String?           // e.g., "10 hours/week"
  timezone        String?
  isActive        Boolean           @default(true)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}
```

**Key Design Decisions:**
- **Skills as String Array**: Simple, flexible approach for MVP vs. normalized skill table
- **Optional OAuth Fields**: Supports both OAuth (Google) and local authentication
- **Timezone & Availability**: Text fields for flexibility in MVP
- **Username + Email**: Separate fields for different use cases (display vs. contact)

### Projects

The `Project` model is the central entity representing work opportunities for volunteers.

```prisma
model Project {
  id                   String        @id @default(cuid())
  name                 String        // Project name
  goal                 String        // One-line project goal
  description          String        @db.Text // Detailed description
  contactEmail         String        // Contact for inquiries
  helpType             HelpType      // ADVICE, PROTOTYPE, MVP, FULL_PRODUCT
  status               ProjectStatus @default(AWAITING_VOLUNTEERS)
  targetCompletionDate DateTime?     // Optional target date
  isActive             Boolean       @default(true) // Recruitment status
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
  
  // Relationships
  ownerId              String
  owner                User          @relation(fields: [ownerId], references: [id])
  productId            String?
  product              Product?      @relation(fields: [productId], references: [id])
  applications         Application[]
  updates              Post[]        @relation("ProjectUpdates")
  discussionPost       Post?         @relation("ProjectDiscussionThread")
}
```

**Dual Status System:**
- **`status`**: Lifecycle phase (AWAITING_VOLUNTEERS → PLANNING → IN_PROGRESS → COMPLETED)
- **`isActive`**: Recruitment control (can be recruiting even while IN_PROGRESS)

**Project Lifecycle States:**
1. `AWAITING_VOLUNTEERS`: Ready, seeking initial team
2. `PLANNING`: Team assembled, working on architecture/planning
3. `IN_PROGRESS`: Active development happening
4. `ON_HOLD`: Temporarily paused
5. `COMPLETED`: Successfully delivered (terminal)
6. `CANCELLED`: Permanently discontinued (terminal)

### Products

The `Product` model groups related projects under a common product umbrella.

```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  description String
  url         String?  // Product website/demo URL
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relationships
  ownerId     String
  owner       User      @relation(fields: [ownerId], references: [id])
  projects    Project[]
  updates     Post[]    @relation("ProductUpdates")
  discussionPost Post?  @relation("ProductDiscussionThread")
}
```

**Product-Project Relationship:**
- **One-to-Many**: A product can have multiple projects (e.g., "Islamic Prayer App" product with "iOS App", "Android App", "Web Dashboard" projects)
- **Optional**: Projects can exist without being part of a product
- **Organizational**: Helps group related work and provides context

### Applications

The `Application` model manages volunteer applications to projects.

```prisma
model Application {
  id          String            @id @default(cuid())
  message     String            // Application message from volunteer
  status      ApplicationStatus @default(PENDING)
  appliedAt   DateTime          @default(now())
  respondedAt DateTime?         // When owner responded
  
  // Relationships
  userId      String
  user        User    @relation(fields: [userId], references: [id])
  projectId   String
  project     Project @relation(fields: [projectId], references: [id])
  
  @@unique([userId, projectId]) // One application per user per project
}
```

**Application Status Flow:**
1. `PENDING`: Initial state when volunteer applies
2. `ACCEPTED`: Project owner accepts the volunteer
3. `REJECTED`: Project owner declines the application
4. `WITHDRAWN`: Volunteer withdraws their application

## Content System

### Posts (Discussion Anchor Pattern)

The `Post` model implements a flexible content system that serves multiple purposes through the "Discussion Anchor Pattern."

```prisma
model Post {
  id        String   @id @default(cuid())
  type      PostType // QUESTION, ANSWER, PROJECT_UPDATE, etc.
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Author (optional to handle deleted users)
  authorId  String?
  author    User?    @relation(fields: [authorId], references: [id])
  
  // Context relationships (where this post belongs)
  projectId                 String?
  project                   Project? @relation("ProjectUpdates")
  projectDiscussionThreadId String?  @unique
  projectDiscussionThread   Project? @relation("ProjectDiscussionThread")
  
  productId                 String?
  product                   Product? @relation("ProductUpdates")
  productDiscussionThreadId String?  @unique
  productDiscussionThread   Product? @relation("ProductDiscussionThread")
  
  // Q&A relationships
  parentId     String?
  parent       Post?   @relation("PostReplies")
  replies      Post[]  @relation("PostReplies")
  isResolved   Boolean @default(false)
  bestAnswerId String? @unique
  bestAnswer   Post?   @relation("BestAnswer")
  
  // Comments
  comments Comment[]
}
```

**Post Types and Usage:**

1. **QUESTION/ANSWER**: Q&A system with resolution and best answer marking
2. **PROJECT_UPDATE**: Progress updates from project owners
3. **PRODUCT_UPDATE**: Product-level announcements
4. **PROJECT_DISCUSSION**: Anchor post for project discussions (enables commenting on projects)
5. **PRODUCT_DISCUSSION**: Anchor post for product discussions

**Discussion Anchor Pattern:**

This pattern allows commenting on entities that don't naturally have discussions:

```typescript
// To enable comments on a project, create an anchor post
const discussionPost = await prisma.post.create({
  data: {
    type: 'PROJECT_DISCUSSION',
    content: `Discussion thread for ${project.name}`,
    authorId: project.ownerId,
    projectDiscussionThreadId: project.id
  }
});

// Comments attach to the post, which is linked to the project
// This creates: Project → Discussion Post → Comments
```

### Comments

The `Comment` model provides threaded discussions on posts.

```prisma
model Comment {
  id        String   @id @default(cuid())
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Author (optional to handle deleted users)
  authorId  String?
  author    User?     @relation(fields: [authorId], references: [id])
  
  // Post relationship (comments attach to posts only)
  postId    String
  post      Post     @relation(fields: [postId], references: [id])
  
  // Self-referencing for threading (future: nested comments)
  parentId  String?
  parent    Comment? @relation("CommentReplies")
  replies   Comment[] @relation("CommentReplies")
}
```

**Comment Design:**
- **Flat Structure (MVP)**: Currently uses flat comments under posts
- **Threading Ready**: Structure supports nested comments for future enhancement
- **Post-Centric**: All comments attach to posts, not directly to projects/products

## Authentication & Security

### Personal Access Tokens

The `PersonalAccessToken` model enables MCP (Model Context Protocol) API authentication.

```prisma
model PersonalAccessToken {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  tokenHash  String   @unique  // CRITICAL: Store hash, not raw token
  name       String   // User-friendly name like "Claude Code on MacBook"
  createdAt  DateTime @default(now())
  lastUsedAt DateTime?
  expiresAt  DateTime? // Optional expiration
}
```

**Security Design:**
- **Hash Storage**: Only token hashes are stored, not raw tokens
- **Named Tokens**: Users can identify and manage multiple tokens
- **Usage Tracking**: `lastUsedAt` for monitoring and cleanup
- **Optional Expiration**: Supports token lifecycle management

### Messages

The `Message` model provides basic user-to-user communication.

```prisma
model Message {
  id          String   @id @default(cuid())
  content     String
  isRead      Boolean  @default(false)
  sentAt      DateTime @default(now())
  senderId    String
  sender      User     @relation(fields: [senderId], references: [id])
  recipientId String
}
```

**Simple Design**: Basic messaging system for MVP - can be enhanced with threading, attachments, etc.

## Enums and Constants

### Specialty
```prisma
enum Specialty {
  AI                // AI/ML specialists
  FULL_STACK        // Full-stack developers
  PROGRAM_MANAGER   // Project/program managers
}
```

### ExperienceLevel
```prisma
enum ExperienceLevel {
  HOBBYIST    // Learning/side projects
  INTERN      // Student/internship level
  NEW_GRAD    // Recent graduate
  SENIOR      // Experienced professional
}
```

### HelpType
```prisma
enum HelpType {
  ADVICE        // Consultation/guidance only
  PROTOTYPE     // Quick proof of concept
  MVP           // Minimum viable product
  FULL_PRODUCT  // Complete production system
}
```

### ProjectStatus
```prisma
enum ProjectStatus {
  AWAITING_VOLUNTEERS  // Seeking initial team
  PLANNING            // Team planning/architecture
  IN_PROGRESS         // Active development
  ON_HOLD             // Temporarily paused
  COMPLETED           // Successfully delivered
  CANCELLED           // Permanently discontinued
}
```

### ApplicationStatus
```prisma
enum ApplicationStatus {
  PENDING    // Waiting for project owner response
  ACCEPTED   // Volunteer accepted to project
  REJECTED   // Application declined
  WITHDRAWN  // Volunteer withdrew application
}
```

### PostType
```prisma
enum PostType {
  QUESTION            // Community Q&A questions
  ANSWER              // Responses to questions
  PROJECT_UPDATE      // Project progress updates
  PRODUCT_UPDATE      // Product announcements
  PROJECT_DISCUSSION  // Discussion anchor for projects
  PRODUCT_DISCUSSION  // Discussion anchor for products
}
```

## Key Relationships & Patterns

### User-Centric Design

All major entities connect to users:
- **Projects**: Users own projects and apply to them
- **Products**: Users own products
- **Posts**: Users author content and ask/answer questions
- **Applications**: Users apply to projects
- **Messages**: Users communicate directly

### Content Hierarchy

```
Product (optional)
├── Projects (multiple)
│   ├── Applications (multiple volunteers)
│   ├── Updates (PROJECT_UPDATE posts)
│   └── Discussion (PROJECT_DISCUSSION post + comments)
└── Updates (PRODUCT_UPDATE posts)
└── Discussion (PRODUCT_DISCUSSION post + comments)

Separate Q&A System:
Questions (QUESTION posts)
└── Answers (ANSWER posts, linked via parentId)
    └── Comments (attached to posts)
```

### Discussion Architecture

The discussion system uses a three-tier approach:

1. **Direct Posts**: Q&A, updates that are posts themselves
2. **Anchor Posts**: Special posts that enable discussions on non-post entities
3. **Comments**: Threaded discussions on any post

This allows flexible commenting while maintaining clean data relationships.

### Status Management

Projects use a dual-status system for nuanced lifecycle management:

```typescript
// Example: Project in development but needs more help
{
  status: 'IN_PROGRESS',    // Lifecycle: work is happening
  isActive: true            // Recruitment: still seeking volunteers
}

// Example: Completed project
{
  status: 'COMPLETED',      // Lifecycle: work is finished
  isActive: false           // Recruitment: not seeking volunteers
}
```

## Database Indexing Strategy

### Performance Indexes

```sql
-- User lookups
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_username_idx ON users(username);
CREATE INDEX users_skills_idx ON users USING GIN(skills);

-- Project discovery
CREATE INDEX projects_isActive_createdAt_idx ON projects(isActive, createdAt);
CREATE INDEX projects_status_idx ON projects(status);

-- Application management
CREATE INDEX applications_userId_idx ON applications(userId);
CREATE INDEX applications_projectId_idx ON applications(projectId);

-- Content system
CREATE INDEX posts_type_createdAt_idx ON posts(type, createdAt);
CREATE INDEX posts_authorId_idx ON posts(authorId);
CREATE INDEX posts_projectId_idx ON posts(projectId);
CREATE INDEX comments_postId_idx ON comments(postId);
```

### Unique Constraints

```sql
-- Prevent duplicate applications
ALTER TABLE applications ADD CONSTRAINT applications_userId_projectId_key UNIQUE (userId, projectId);

-- Ensure single discussion thread per project/product
ALTER TABLE posts ADD CONSTRAINT posts_projectDiscussionThreadId_key UNIQUE (projectDiscussionThreadId);
ALTER TABLE posts ADD CONSTRAINT posts_productDiscussionThreadId_key UNIQUE (productDiscussionThreadId);
```

## Design Philosophy

### Simplicity First

The data model prioritizes simplicity for the MVP:
- **String arrays** over normalized tables (skills)
- **Text fields** over structured data (availability, timezone)
- **Flat comments** over complex threading
- **Optional relationships** over complex constraints

### Flexibility

Key design decisions support future growth:
- **Nullable foreign keys** allow graceful user deletion
- **Enum types** provide structure with extensibility
- **Threaded comment structure** ready for nested discussions
- **Product grouping** supports complex project organization

### Performance

Strategic indexing and constraints:
- **Compound indexes** for common query patterns
- **GIN indexes** for array searches
- **Unique constraints** prevent data integrity issues
- **Efficient relationships** minimize join complexity

## Common Query Patterns

### Project Discovery

```sql
-- Active projects seeking volunteers
SELECT * FROM projects 
WHERE isActive = true 
  AND status IN ('AWAITING_VOLUNTEERS', 'PLANNING', 'IN_PROGRESS')
ORDER BY createdAt DESC;

-- Projects by status
SELECT * FROM projects WHERE status = 'AWAITING_VOLUNTEERS';

-- Projects with specific skills (future: when skill matching is implemented)
SELECT * FROM projects p
JOIN users u ON p.ownerId = u.id
WHERE 'React' = ANY(u.skills);
```

### User Activity

```sql
-- User's projects
SELECT * FROM projects WHERE ownerId = $userId;

-- User's applications
SELECT p.name, a.status, a.appliedAt 
FROM applications a
JOIN projects p ON a.projectId = p.id
WHERE a.userId = $userId;

-- User's posts and comments
SELECT 'post' as type, content, createdAt FROM posts WHERE authorId = $userId
UNION ALL
SELECT 'comment' as type, content, createdAt FROM comments WHERE authorId = $userId
ORDER BY createdAt DESC;
```

### Content Retrieval

```sql
-- Project with discussion
SELECT p.*, dp.id as discussion_post_id
FROM projects p
LEFT JOIN posts dp ON dp.projectDiscussionThreadId = p.id
WHERE p.id = $projectId;

-- Q&A with answers
SELECT q.*, 
       (SELECT COUNT(*) FROM posts WHERE parentId = q.id) as answer_count,
       ba.content as best_answer_content
FROM posts q
LEFT JOIN posts ba ON q.bestAnswerId = ba.id
WHERE q.type = 'QUESTION'
ORDER BY q.createdAt DESC;
```

This data model provides a solid foundation for the MAIX platform while maintaining flexibility for future enhancements and optimizations.