# MAIX Data Model Guide

This comprehensive guide explains the data model architecture of the MAIX platform, including relationships, patterns, and design decisions.

## Overview

MAIX uses a PostgreSQL database with Prisma ORM to manage data relationships. The platform is built around connecting Muslim volunteers with technology projects through a structured workflow that includes project management, community discussion, and skill matching.

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