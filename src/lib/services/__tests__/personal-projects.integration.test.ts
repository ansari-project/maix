// TypeScript test fixes applied
import { TodoStatus } from '@prisma/client'
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { cleanupTestDatabase, createTestUser, createTestOrganization } from '@/lib/test/db-test-utils'

const prisma = new PrismaClient()

describe('Personal Projects Integration Tests', () => {
  let testUser: any
  let testOrg: any

  beforeEach(async () => {
    await cleanupTestDatabase()
    testUser = await createTestUser()
    testOrg = await createTestOrganization(testUser.id)
  })

  afterEach(async () => {
    await cleanupTestDatabase()
  })

  describe('Schema Changes', () => {
    it('should support new TodoStatus values', async () => {
      const todo = await prisma.todo.create({
        data: {
          title: 'Test Todo',
          status: TodoStatus.NOT_STARTED,
          creatorId: testUser.id,
        }
      })

      expect(todo.status).toBe('NOT_STARTED')

      // Test all new statuses
      const statuses = ['NOT_STARTED', 'WAITING_FOR', 'COMPLETED', 'IN_PROGRESS']
      for (const status of statuses) {
        const updated = await prisma.todo.update({
          where: { id: todo.id },
          data: { status: status as any }
        })
        expect(updated.status).toBe(status)
      }
    })

    it('should support startDate field on todos', async () => {
      const startDate = new Date('2025-02-01')
      const todo = await prisma.todo.create({
        data: {
          title: 'Future Task',
          status: TodoStatus.NOT_STARTED,
          startDate: startDate,
          creatorId: testUser.id,
        }
      })

      expect(todo.startDate).toEqual(startDate)
    })

    it('should support personal projects with nullable org fields', async () => {
      const personalProject = await prisma.project.create({
        data: {
          name: 'Home Renovation',
          description: 'Fix up the house',
          isPersonal: true,
          personalCategory: 'home',
          ownerId: testUser.id,
          // These fields are now nullable for personal projects
          goal: null,
          contactEmail: null,
          helpType: null,
        }
      })

      expect(personalProject.isPersonal).toBe(true)
      expect(personalProject.personalCategory).toBe('home')
      expect(personalProject.goal).toBeNull()
      expect(personalProject.contactEmail).toBeNull()
      expect(personalProject.helpType).toBeNull()
    })

    it('should support standalone tasks without projectId', async () => {
      const standaloneTask = await prisma.todo.create({
        data: {
          title: 'Buy groceries',
          status: TodoStatus.NOT_STARTED,
          creatorId: testUser.id,
          assigneeId: testUser.id,
          // No projectId - this is a standalone task
        }
      })

      expect(standaloneTask.projectId).toBeNull()
      expect(standaloneTask.assigneeId).toBe(testUser.id)
    })

    it('should maintain backward compatibility for org projects', async () => {
      const orgProject = await prisma.project.create({
        data: {
          name: 'AI Assistant',
          description: 'Build an AI helper',
          goal: 'Help people with tasks',
          contactEmail: 'test@example.com',
          helpType: 'PROTOTYPE',
          isPersonal: false,
          organizationId: testOrg.id,
          ownerId: testUser.id,
        }
      })

      expect(orgProject.isPersonal).toBe(false)
      expect(orgProject.goal).toBe('Help people with tasks')
      expect(orgProject.helpType).toBe('PROTOTYPE')
    })

    it('should support the new index on personal projects', async () => {
      // Create multiple personal projects
      await prisma.project.createMany({
        data: [
          {
            name: 'Personal 1',
            description: 'Test',
            isPersonal: true,
            ownerId: testUser.id,
          },
          {
            name: 'Personal 2',
            description: 'Test',
            isPersonal: true,
            ownerId: testUser.id,
          }
        ]
      })

      // Query using the indexed fields
      const personalProjects = await prisma.project.findMany({
        where: {
          isPersonal: true,
          ownerId: testUser.id
        }
      })

      expect(personalProjects).toHaveLength(2)
    })
  })

  describe('Data Migration Verification', () => {
    it('should have correct defaults for existing projects', async () => {
      // Create a project without specifying isPersonal (simulating existing data)
      const project = await prisma.project.create({
        data: {
          name: 'Existing Project',
          description: 'Pre-migration project',
          goal: 'Test goal',
          contactEmail: 'old@example.com',
          helpType: 'MVP',
          ownerId: testUser.id,
        }
      })

      // Should default to false (not personal)
      expect(project.isPersonal).toBe(false)
    })

    it('should handle todos with new default status', async () => {
      const todo = await prisma.todo.create({
        data: {
          title: 'Default Status Todo',
          creatorId: testUser.id,
          // Not specifying status to test default
        }
      })

      // Should use NOT_STARTED as default
      expect(todo.status).toBe('NOT_STARTED')
    })
  })
})