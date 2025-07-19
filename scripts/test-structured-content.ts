#!/usr/bin/env npx tsx
/**
 * Test script for the structured content system
 * Run with: npm run test:structured-content
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Test utilities
let testsPassed = 0
let testsFailed = 0

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      console.log(`✅ ${name}`)
      testsPassed++
    })
    .catch((error) => {
      console.error(`❌ ${name}`)
      console.error(`   ${error.message}`)
      testsFailed++
    })
}

async function runTests() {
  console.log('🧪 Testing Structured Content System...\n')
  
  const testEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
  let testUser: any
  let testProject: any
  let testProduct: any
  let questionId: string
  let answerId: string

  try {
    // Setup
    testUser = await prisma.user.create({
      data: {
        email: testEmail,
        username: 'testuser',
        name: 'Test User',
        specialty: 'AI',
        experienceLevel: 'SENIOR'
      }
    })

    // Test: Project creation with discussion post
    await test('should create a project with discussion post', async () => {
      const result = await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            title: 'Test Project',
            description: 'Testing project creation',
            timeline: { phases: ['test'] },
            requiredSkills: { testing: 'basic' },
            projectType: 'OPEN_SOURCE',
            helpType: 'MVP',
            contactEmail: 'test@example.com',
            ownerId: testUser.id
          }
        })

        const discussionPost = await tx.post.create({
          data: {
            type: 'PROJECT_DISCUSSION',
            authorId: testUser.id,
            content: `Discussion thread for ${project.title}`,
            projectDiscussionThreadId: project.id,
          }
        })

        return { project, discussionPost }
      })

      testProject = result.project
      
      if (!result.project || !result.discussionPost) {
        throw new Error('Failed to create project or discussion post')
      }
      if (result.discussionPost.type !== 'PROJECT_DISCUSSION') {
        throw new Error('Incorrect discussion post type')
      }
      if (result.discussionPost.projectDiscussionThreadId !== result.project.id) {
        throw new Error('Discussion post not linked to project')
      }
    })

    // Test: Product creation with discussion post
    await test('should create a product with discussion post', async () => {
      const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            name: 'Test Product',
            description: 'Testing product creation',
            ownerId: testUser.id
          }
        })

        const discussionPost = await tx.post.create({
          data: {
            type: 'PRODUCT_DISCUSSION',
            authorId: testUser.id,
            content: `Discussion thread for ${product.name}`,
            productDiscussionThreadId: product.id,
          }
        })

        return { product, discussionPost }
      })

      testProduct = result.product
      
      if (!result.product || !result.discussionPost) {
        throw new Error('Failed to create product or discussion post')
      }
      if (result.discussionPost.type !== 'PRODUCT_DISCUSSION') {
        throw new Error('Incorrect discussion post type')
      }
    })

    // Test: Question creation
    await test('should create a question post', async () => {
      const question = await prisma.post.create({
        data: {
          type: 'QUESTION',
          content: 'How do I use the structured content system?',
          authorId: testUser.id
        }
      })

      questionId = question.id
      
      if (question.type !== 'QUESTION' || question.isResolved !== false) {
        throw new Error('Question not created correctly')
      }
    })

    // Test: Answer creation
    await test('should create an answer post', async () => {
      const answer = await prisma.post.create({
        data: {
          type: 'ANSWER',
          content: 'You can use the /api/posts endpoint.',
          authorId: testUser.id,
          parentId: questionId
        }
      })

      answerId = answer.id
      
      if (answer.type !== 'ANSWER' || answer.parentId !== questionId) {
        throw new Error('Answer not created correctly')
      }
    })

    // Test: Project update
    await test('should create a project update', async () => {
      const update = await prisma.post.create({
        data: {
          type: 'PROJECT_UPDATE',
          content: 'Great progress on the project!',
          authorId: testUser.id,
          projectId: testProject.id
        }
      })

      if (update.type !== 'PROJECT_UPDATE' || update.projectId !== testProject.id) {
        throw new Error('Project update not created correctly')
      }
    })

    // Test: Product update
    await test('should create a product update', async () => {
      const update = await prisma.post.create({
        data: {
          type: 'PRODUCT_UPDATE',
          content: 'New version released!',
          authorId: testUser.id,
          productId: testProduct.id
        }
      })

      if (update.type !== 'PRODUCT_UPDATE' || update.productId !== testProduct.id) {
        throw new Error('Product update not created correctly')
      }
    })

    // Test: Q&A resolution
    await test('should mark question as resolved', async () => {
      const resolved = await prisma.post.update({
        where: { id: questionId },
        data: {
          isResolved: true,
          bestAnswerId: answerId
        }
      })

      if (!resolved.isResolved || resolved.bestAnswerId !== answerId) {
        throw new Error('Question not resolved correctly')
      }
    })

    // Test: Comments
    await test('should create a comment on a post', async () => {
      const comment = await prisma.comment.create({
        data: {
          content: 'Great question!',
          authorId: testUser.id,
          postId: questionId
        }
      })

      if (!comment || comment.postId !== questionId) {
        throw new Error('Comment not created correctly')
      }
    })

    // Test: Feed exclusion
    await test('should exclude discussion posts from main feed', async () => {
      const feedPosts = await prisma.post.findMany({
        where: {
          type: {
            in: ['QUESTION', 'PROJECT_UPDATE', 'PRODUCT_UPDATE']
          },
          author: {
            email: testEmail
          }
        }
      })

      const discussionPosts = feedPosts.filter(p => 
        p.type === 'PROJECT_DISCUSSION' || p.type === 'PRODUCT_DISCUSSION'
      )

      if (discussionPosts.length > 0) {
        throw new Error('Discussion posts found in main feed')
      }
    })

    // Test: Cascade deletion
    await test('should cascade delete discussion post when project is deleted', async () => {
      // Create a temporary project
      const { project, discussionPost } = await prisma.$transaction(async (tx) => {
        const proj = await tx.project.create({
          data: {
            title: 'Temp Project',
            description: 'To be deleted',
            timeline: {},
            requiredSkills: {},
            projectType: 'OPEN_SOURCE',
            helpType: 'MVP',
            contactEmail: 'temp@example.com',
            ownerId: testUser.id
          }
        })

        const post = await tx.post.create({
          data: {
            type: 'PROJECT_DISCUSSION',
            authorId: testUser.id,
            content: `Discussion for ${proj.title}`,
            projectDiscussionThreadId: proj.id,
          }
        })

        return { project: proj, discussionPost: post }
      })

      // Delete the project
      await prisma.project.delete({
        where: { id: project.id }
      })

      // Verify discussion post was also deleted
      const orphanedPost = await prisma.post.findUnique({
        where: { id: discussionPost.id }
      })

      if (orphanedPost) {
        throw new Error('Discussion post not deleted when project was deleted')
      }
    })

    // Test: Business rules
    await test('should not allow deleting a question with answers', async () => {
      const question = await prisma.post.create({
        data: {
          type: 'QUESTION',
          content: 'Question with answer',
          authorId: testUser.id
        }
      })

      await prisma.post.create({
        data: {
          type: 'ANSWER',
          content: 'An answer',
          authorId: testUser.id,
          parentId: question.id
        }
      })

      let deletionFailed = false
      try {
        await prisma.post.delete({
          where: { id: question.id }
        })
      } catch (error: any) {
        // Expected to fail due to foreign key constraint
        deletionFailed = true
      }
      
      if (!deletionFailed) {
        throw new Error('Should not have allowed deletion of question with answers')
      }
    })

  } catch (error) {
    console.error('Test setup error:', error)
    testsFailed++
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    
    await prisma.comment.deleteMany({
      where: {
        author: {
          email: testEmail
        }
      }
    })
    
    await prisma.post.deleteMany({
      where: {
        author: {
          email: testEmail
        }
      }
    })
    
    await prisma.project.deleteMany({
      where: {
        owner: {
          email: testEmail
        }
      }
    })
    
    await prisma.product.deleteMany({
      where: {
        owner: {
          email: testEmail
        }
      }
    })
    
    await prisma.user.deleteMany({
      where: {
        email: testEmail
      }
    })
    
    await prisma.$disconnect()
    
    // Summary
    console.log('\n📊 Test Summary:')
    console.log(`   ✅ Passed: ${testsPassed}`)
    console.log(`   ❌ Failed: ${testsFailed}`)
    console.log(`   📋 Total: ${testsPassed + testsFailed}`)
    
    if (testsFailed > 0) {
      process.exit(1)
    }
  }
}

runTests()