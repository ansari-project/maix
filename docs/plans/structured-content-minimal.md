# Structured Content: Minimal Implementation Plan

**Status**: Ready for Implementation  
**Approach**: Single-table polymorphic design for maximum simplicity  

## Overview

Replace generic posts with 4 structured content types using the simplest possible approach:
- **QUESTION**: Community questions  
- **ANSWER**: Responses to questions
- **PROJECT_UPDATE**: Project progress reports
- **PRODUCT_UPDATE**: Product milestone announcements

**Key Constraint**: No data migration needed (clean slate implementation)

## Implementation Steps

### Step 1: Database Schema

Add to `prisma/schema.prisma`:

```prisma
enum PostType {
  QUESTION
  ANSWER
  PROJECT_UPDATE
  PRODUCT_UPDATE
  PROJECT_DISCUSSION
  PRODUCT_DISCUSSION
}

model Post {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  type    PostType
  content String   @db.Text

  // Author relationship (optional to handle deleted users)
  authorId String?
  author   User?   @relation(fields: [authorId], references: [id], onDelete: SetNull)

  // Optional relationships for specific post types
  // A post can be an update FOR a project
  projectId String?
  project   Project? @relation("ProjectUpdates", fields: [projectId], references: [id], onDelete: Cascade)

  // A post can be the discussion thread FOR a project (holds FK to project)
  projectDiscussionThreadId String? @unique
  projectDiscussionThread   Project? @relation("ProjectDiscussionThread", fields: [projectDiscussionThreadId], references: [id], onDelete: Cascade)

  // A post can be an update FOR a product
  productId String?
  product   Product? @relation("ProductUpdates", fields: [productId], references: [id], onDelete: Cascade)

  // A post can be the discussion thread FOR a product (holds FK to product)
  productDiscussionThreadId String? @unique
  productDiscussionThread   Product? @relation("ProductDiscussionThread", fields: [productDiscussionThreadId], references: [id], onDelete: Cascade)

  // Self-referencing for Questions/Answers
  parentId String?
  parent   Post?   @relation("PostReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies  Post[]  @relation("PostReplies")

  // Q&A Resolution fields
  isResolved   Boolean @default(false) // For questions - marks if question has been resolved
  bestAnswerId String? @unique         // Reference to the best answer for this question
  bestAnswer   Post?   @relation("BestAnswer", fields: [bestAnswerId], references: [id], onDelete: NoAction)
  
  // Back-relation: this answer is marked as best for which question
  questionForBestAnswer Post? @relation("BestAnswer")

  // Comments relationship
  comments Comment[]

  @@index([authorId])
  @@index([projectId])
  @@index([productId])
  @@index([parentId])
  @@index([projectDiscussionThreadId])
  @@index([productDiscussionThreadId])
  @@index([bestAnswerId])
  @@index([type, createdAt])
  @@map("posts")
}

model Comment {
  id        String   @id @default(cuid())
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Author relationship (optional to handle deleted users)
  authorId  String?
  author    User?     @relation(fields: [authorId], references: [id], onDelete: SetNull)

  // Post relationship (comments attach to posts only)
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  // Self-referencing for future threading (MVP: flat comments only)
  parentId  String?
  parent    Comment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: NoAction)
  replies   Comment[] @relation("CommentReplies")

  @@index([postId])
  @@index([authorId])
  @@index([parentId])
  @@map("comments")
}
```

**Update User model** to include the relations:
```prisma
model User {
  // ... existing fields
  posts Post[]
  comments Comment[]
  // ... rest of model
}
```

**Update Project model** to include the relations:
```prisma
model Project {
  // ... existing fields
  
  // Relation for all PROJECT_UPDATE posts (one-to-many)
  updates Post[] @relation("ProjectUpdates")

  // Back-relation to the single discussion post for this project (one-to-one)
  discussionPost Post? @relation("ProjectDiscussionThread")
  
  // ... rest of model
}
```

**Update Product model** to include the relations:
```prisma
model Product {
  // ... existing fields
  
  // Relation for all PRODUCT_UPDATE posts (one-to-many)
  updates Post[] @relation("ProductUpdates")

  // Back-relation to the single discussion post for this product (one-to-one)
  discussionPost Post? @relation("ProductDiscussionThread")
  
  // ... rest of model
}
```

### Step 2: Database Migration

```bash
npx prisma migrate dev --name add_structured_content
```

### Step 3: API Endpoints

#### Create Post API (`app/api/posts/route.ts`)

```typescript
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const postCreateSchema = z.object({
  type: z.enum(['QUESTION', 'ANSWER', 'PROJECT_UPDATE', 'PRODUCT_UPDATE']),
  content: z.string().min(1),
  authorId: z.string().cuid().optional(), // Optional since author can be deleted
  projectId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional(),
})
.refine(data => !(data.type === 'PROJECT_UPDATE' && !data.projectId), {
  message: "projectId is required for PROJECT_UPDATE",
  path: ["projectId"],
})
.refine(data => !(data.type === 'PRODUCT_UPDATE' && !data.productId), {
  message: "productId is required for PRODUCT_UPDATE", 
  path: ["productId"],
})
.refine(data => !(data.type === 'ANSWER' && !data.parentId), {
  message: "parentId is required for ANSWER",
  path: ["parentId"],
})
.refine(data => data.authorId, {
  message: "authorId is required when creating posts",
  path: ["authorId"],
})

// Note: PROJECT_DISCUSSION and PRODUCT_DISCUSSION posts are created automatically
// when projects/products are created, not through this endpoint

// Authorization helper function
async function checkPostCreatePermission(type: string, userId: string, projectId?: string, productId?: string) {
  switch (type) {
    case 'PROJECT_UPDATE':
      if (!projectId) return false
      // Check if user is project owner or accepted volunteer
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: userId },
            { applications: { some: { userId, status: 'ACCEPTED' } } }
          ]
        }
      })
      return !!project
    
    case 'PRODUCT_UPDATE':
      if (!productId) return false
      // Check if user is product owner
      const product = await prisma.product.findFirst({
        where: { id: productId, ownerId: userId }
      })
      return !!product
    
    case 'QUESTION':
    case 'ANSWER':
      return true // Anyone can ask questions or answer
    
    default:
      return false
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = postCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { type, content, authorId, projectId, productId, parentId } = validation.data

    // Check authorization
    const hasPermission = await checkPostCreatePermission(type, authorId!, projectId, productId)
    if (!hasPermission) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    const post = await prisma.post.create({
      data: {
        type,
        content,
        authorId,
        projectId,
        productId,
        parentId,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error("Error creating post:", error)
    return NextResponse.json({ message: 'Error creating post' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const take = parseInt(searchParams.get('take') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')

    const posts = await prisma.post.findMany({
      take,
      skip,
      where: {
        // Only show top-level posts in main feed (not answers or discussion threads)
        type: {
          in: ['QUESTION', 'PROJECT_UPDATE', 'PRODUCT_UPDATE'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        project: {
          select: { id: true, title: true }
        },
        product: {
          select: { id: true, name: true }
        },
        _count: {
          select: { 
            answers: true,
            comments: true 
          },
        }
      },
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error("Error fetching posts:", error)
    return NextResponse.json({ message: 'Error fetching posts' }, { status: 500 })
  }
}
```

#### Update/Delete Post API (Add to `app/api/posts/[id]/route.ts`)

```typescript
// Delete post endpoint
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from session (implement based on your auth)
    const userId = 'current-user-id' // Replace with actual session

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { answers: true } }
      }
    })

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    // Authorization: only author can delete their posts
    if (post.authorId !== userId) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    // Business rule: Questions can only be deleted if no answers exist
    if (post.type === 'QUESTION' && post._count.answers > 0) {
      return NextResponse.json({ 
        message: 'Cannot delete question with existing answers' 
      }, { status: 400 })
    }

    // Prevent deletion of discussion posts
    if (post.type === 'PROJECT_DISCUSSION' || post.type === 'PRODUCT_DISCUSSION') {
      return NextResponse.json({ 
        message: 'Discussion posts cannot be deleted' 
      }, { status: 400 })
    }

    await prisma.post.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json({ message: 'Error deleting post' }, { status: 500 })
  }
}
```

#### Get Question with Answers (`app/api/posts/[id]/route.ts`)

```typescript
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        },
        project: {
          select: { id: true, title: true }
        },
        product: {
          select: { id: true, name: true }
        },
        answers: {
          include: {
            author: {
              select: { id: true, name: true, image: true }
            },
            _count: {
              select: { comments: true }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        comments: {
          where: {
            parentId: null // Only top-level comments for MVP
          },
          include: {
            author: {
              select: { id: true, name: true, image: true }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: { comments: true }
        }
      }
    })

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error("Error fetching post:", error)
    return NextResponse.json({ message: 'Error fetching post' }, { status: 500 })
  }
}
```

#### Comment API (`app/api/posts/[id]/comments/route.ts`)

```typescript
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const commentCreateSchema = z.object({
  content: z.string().min(1),
  authorId: z.string().cuid().optional(), // Optional since author can be deleted
})
.refine(data => data.authorId, {
  message: "authorId is required when creating comments",
  path: ["authorId"],
})

// Create comment on post
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validation = commentCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { content, authorId } = validation.data

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: params.id }
    })

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId,
        postId: params.id,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json({ message: 'Error creating comment' }, { status: 500 })
  }
}

// Get comments for post
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        postId: params.id,
        parentId: null // Only top-level comments for MVP
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ message: 'Error fetching comments' }, { status: 500 })
  }
}
```

#### Q&A Resolution API (`app/api/questions/[id]/resolve/route.ts`)

```typescript
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const resolveQuestionSchema = z.object({
  bestAnswerId: z.string().cuid(),
})

// Mark question as resolved with a best answer
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validation = resolveQuestionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { bestAnswerId } = validation.data
    const questionId = params.id

    // Get user from session (implement based on your auth)
    const userId = 'current-user-id' // Replace with actual session

    // Verify question exists and user is the author
    const question = await prisma.post.findUnique({
      where: { id: questionId },
      include: {
        replies: {
          where: { id: bestAnswerId }
        }
      }
    })

    if (!question) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 })
    }

    if (question.type !== 'QUESTION') {
      return NextResponse.json({ message: 'Post is not a question' }, { status: 400 })
    }

    if (question.authorId !== userId) {
      return NextResponse.json({ message: 'Only question author can mark best answer' }, { status: 403 })
    }

    // Verify the best answer is actually an answer to this question
    if (question.replies.length === 0) {
      return NextResponse.json({ message: 'Answer not found or not an answer to this question' }, { status: 400 })
    }

    // Update question with best answer
    const updatedQuestion = await prisma.post.update({
      where: { id: questionId },
      data: {
        isResolved: true,
        bestAnswerId: bestAnswerId,
      },
      include: {
        bestAnswer: {
          include: {
            author: {
              select: { id: true, name: true, image: true }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedQuestion)
  } catch (error) {
    console.error("Error resolving question:", error)
    return NextResponse.json({ message: 'Error resolving question' }, { status: 500 })
  }
}

// Unmark question as resolved (remove best answer)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = params.id

    // Get user from session (implement based on your auth)
    const userId = 'current-user-id' // Replace with actual session

    // Verify question exists and user is the author
    const question = await prisma.post.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 })
    }

    if (question.type !== 'QUESTION') {
      return NextResponse.json({ message: 'Post is not a question' }, { status: 400 })
    }

    if (question.authorId !== userId) {
      return NextResponse.json({ message: 'Only question author can unmark best answer' }, { status: 403 })
    }

    // Remove best answer marking
    const updatedQuestion = await prisma.post.update({
      where: { id: questionId },
      data: {
        isResolved: false,
        bestAnswerId: null,
      }
    })

    return NextResponse.json(updatedQuestion)
  } catch (error) {
    console.error("Error unresolving question:", error)
    return NextResponse.json({ message: 'Error unresolving question' }, { status: 500 })
  }
}
```

#### Project/Product Creation with Discussion Posts

When creating projects or products, automatically create discussion posts:

```typescript
/**
 * Creates a project with an associated discussion post.
 * This implements the "Discussion Anchor Pattern" where every project
 * gets a dedicated Post of type PROJECT_DISCUSSION to serve as an anchor
 * for comments, ensuring users can always comment on projects.
 * 
 * UPDATED: Post now holds FK to Project (inverted relationship to prevent orphaning)
 */
async function createProject(data: ProjectCreateInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Create the project first
    const project = await tx.project.create({
      data: data,
    });

    // 2. Create the discussion post and link it to the project
    const discussionPost = await tx.post.create({
      data: {
        type: 'PROJECT_DISCUSSION',
        authorId: data.ownerId,
        content: `Discussion thread for ${project.title}`,
        projectDiscussionThreadId: project.id, // Post holds FK to Project
      },
    });

    return project;
  });
}

/**
 * Creates a product with an associated discussion post.
 * Implements the same Discussion Anchor Pattern as projects.
 * 
 * UPDATED: Post now holds FK to Product (inverted relationship to prevent orphaning)
 */
async function createProduct(data: ProductCreateInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Create the product first
    const product = await tx.product.create({
      data: data,
    });

    // 2. Create the discussion post and link it to the product
    const discussionPost = await tx.post.create({
      data: {
        type: 'PRODUCT_DISCUSSION',
        authorId: data.ownerId,
        content: `Discussion thread for ${product.name}`,
        productDiscussionThreadId: product.id, // Post holds FK to Product
      },
    });

    return product;
  });
}
```

### Step 4: Basic UI Components

#### Post Type Renderer (`components/PostCard.tsx`)

```typescript
import { useState } from 'react'
import { Post, User, Project, Product, Comment } from '@prisma/client'

interface PostWithRelations extends Post {
  author: Pick<User, 'id' | 'name' | 'image'>
  project?: Pick<Project, 'id' | 'title'> | null
  product?: Pick<Product, 'id' | 'name'> | null
  comments?: Comment[]
  bestAnswer?: Pick<Post, 'id' | 'content'> & { author: Pick<User, 'id' | 'name' | 'image'> } | null
  _count?: { replies: number; comments: number }
}

export function PostCard({ post }: { post: PostWithRelations }) {
  switch (post.type) {
    case 'QUESTION':
      return <QuestionCard post={post} />
    case 'PROJECT_UPDATE':
      return <ProjectUpdateCard post={post} />
    case 'PRODUCT_UPDATE':
      return <ProductUpdateCard post={post} />
    default:
      return null
  }
}

function QuestionCard({ post }: { post: PostWithRelations }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
          Question
        </span>
        {post.isResolved && (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
            ✓ Resolved
          </span>
        )}
        <span className="text-gray-500 text-sm">
          by {post.author.name}
        </span>
      </div>
      <p className="mb-2">{post.content}</p>
      
      {/* Show best answer if resolved */}
      {post.isResolved && post.bestAnswer && (
        <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-3">
          <div className="text-sm font-medium text-green-800 mb-1">
            Best Answer by {post.bestAnswer.author.name}
          </div>
          <p className="text-sm text-green-700">{post.bestAnswer.content}</p>
        </div>
      )}
      
      {post._count && (
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{post._count.replies} answers</span>
          <span>{post._count.comments} comments</span>
        </div>
      )}
      <CommentSection post={post} />
    </div>
  )
}

function ProjectUpdateCard({ post }: { post: PostWithRelations }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
          Project Update
        </span>
        <span className="text-gray-500 text-sm">
          {post.project?.title} by {post.author.name}
        </span>
      </div>
      <p className="mb-2">{post.content}</p>
      {post._count && (
        <div className="text-sm text-gray-500 mb-2">
          {post._count.comments} comments
        </div>
      )}
      <CommentSection post={post} />
    </div>
  )
}

function ProductUpdateCard({ post }: { post: PostWithRelations }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
          Product Update
        </span>
        <span className="text-gray-500 text-sm">
          {post.product?.name} by {post.author.name}
        </span>
      </div>
      <p className="mb-2">{post.content}</p>
      {post._count && (
        <div className="text-sm text-gray-500 mb-2">
          {post._count.comments} comments
        </div>
      )}
      <CommentSection post={post} />
    </div>
  )
}

function CommentSection({ post }: { post: PostWithRelations }) {
  const [comments, setComments] = useState(post.comments || [])
  const [newComment, setNewComment] = useState('')
  const [showComments, setShowComments] = useState(false)

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          authorId: 'current-user-id' // Replace with session user
        })
      })

      if (response.ok) {
        const comment = await response.json()
        setComments([...comments, comment])
        setNewComment('')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  return (
    <div className="mt-4 border-t pt-4">
      <button 
        onClick={() => setShowComments(!showComments)}
        className="text-sm text-blue-600 hover:underline mb-2"
      >
        {showComments ? 'Hide' : 'Show'} Comments ({comments.length})
      </button>
      
      {showComments && (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600 mb-1">
                {comment.author.name}
              </div>
              <p className="text-sm">{comment.content}</p>
            </div>
          ))}
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 border rounded text-sm"
            />
            <button 
              onClick={handleAddComment}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
            >
              Comment
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

#### Feed Page (`app/feed/page.tsx`)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { PostCard } from '@/components/PostCard'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Community Feed</h1>
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
```

## Key Design Decisions

### Single-Table Approach
- **Pro**: Extremely simple queries for unified feed
- **Pro**: Easy to add new content types  
- **Con**: Some null columns (acceptable for MVP)

### Feed Filtering
- Main feed shows only top-level content (QUESTION, PROJECT_UPDATE, PRODUCT_UPDATE)
- ANSWER posts are shown only in question detail view
- This prevents feed clutter and follows Q&A best practices

### Comment System Integration
- **Post-Only Comments**: Comments attach only to Post entities for referential integrity
- **Direct Project/Product Comments**: Auto-created PROJECT_DISCUSSION and PRODUCT_DISCUSSION posts enable direct commenting
- **Discussion Anchor Pattern**: Post model serves as unified anchor for all discussions
- **Threading-Ready Schema**: parentId field supports future nested comments
- **MVP Flat Comments**: Only top-level comments displayed initially
- **Answers vs Comments**: ANSWER posts remain separate from Comment entities

### Data Integrity & User Management
- **User Deletion**: Uses SetNull to preserve content when users are deleted (anonymizes rather than destroys)
- **Question Deletion**: Only allowed if no answers exist to preserve discussion integrity
- **Discussion Post Protection**: PROJECT_DISCUSSION and PRODUCT_DISCUSSION posts cannot be deleted
- **Authorization**: Role-based permissions for PROJECT_UPDATE and PRODUCT_UPDATE creation

### Validation Strategy
- Zod schemas enforce business rules (e.g., PROJECT_UPDATE requires projectId)
- Database constraints handle referential integrity
- Application logic handles content type requirements

### Authentication Integration
- Schema ready for session-based auth
- `authorId` will come from NextAuth session in production
- For MVP, can be passed in request body

## Next Steps

1. **Update Project/Product Creation**: Modify existing creation logic to auto-create discussion posts
2. **Create Content Forms**: Build forms for each content type
3. **Project/Product Pages**: Add comment sections using discussion posts
4. **Question Detail View**: Page showing question + all answers
5. **Authentication Integration**: Replace hardcoded authorId with session
6. **Basic Styling**: Apply Islamic design system
7. **Testing**: Add basic API and component tests

## Success Criteria

- [ ] Users can create questions, project updates, product updates
- [ ] Users can answer questions  
- [ ] Users can comment on all post types (questions, answers, updates)
- [ ] Users can comment directly on projects and products (via discussion posts)
- [ ] Projects and products automatically get discussion threads when created
- [ ] Unified feed shows all content types appropriately (excludes discussion posts)
- [ ] Question detail pages show all answers and comments
- [ ] Project/product pages show comment sections
- [ ] Comments display with proper author attribution
- [ ] Content is properly categorized and validated
- [ ] Comment counts show accurately on post cards

This minimal implementation provides a solid foundation that can be extended with features like search, notifications, and advanced filtering without architectural changes.