import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { TodoStatus } from '@prisma/client'
import { cleanupTestDatabase, createTestUser } from '@/lib/test/db-test-utils'
import {
  createTodo,
  createStandaloneTask,
  updateTodoStatus,
  getMyTasks,
  getMyTasksGrouped,
  moveTaskToProject,
} from '../todo.service'
import {
  createPersonalProject,
  getPersonalProjects,
  sharePersonalProject,
  deleteProject,
  getUserProjects,
} from '../project.service'

describe('Todo and Project Services Integration', () => {
  let testUser1: any
  let testUser2: any

  beforeEach(async () => {
    await cleanupTestDatabase()
    testUser1 = await createTestUser({ 
      email: 'user1@test.com',
      username: 'testuser1' 
    })
    testUser2 = await createTestUser({ 
      email: 'user2@test.com',
      username: 'testuser2' 
    })
  })

  afterEach(async () => {
    await cleanupTestDatabase()
  })

  describe('Personal Projects', () => {
    it('should create a personal project', async () => {
      const project = await createPersonalProject(testUser1.id, {
        name: 'Home Tasks',
        description: 'Tasks for home',
        personalCategory: 'home',
      })

      expect(project.isPersonal).toBe(true)
      expect(project.personalCategory).toBe('home')
      expect(project.goal).toBeNull()
      expect(project.helpType).toBeNull()
    })

    it('should get user personal projects', async () => {
      await createPersonalProject(testUser1.id, {
        name: 'Home',
        description: 'Home tasks',
        personalCategory: 'home',
      })

      await createPersonalProject(testUser1.id, {
        name: 'Work',
        description: 'Work tasks',
        personalCategory: 'work',
      })

      const projects = await getPersonalProjects(testUser1.id)
      expect(projects).toHaveLength(2)
      expect(projects.every(p => p.isPersonal)).toBe(true)
    })

    it('should share personal project with another user', async () => {
      const project = await createPersonalProject(testUser1.id, {
        name: 'Shared Project',
        description: 'To be shared',
      })

      const shared = await sharePersonalProject(
        project.id,
        testUser1.id,
        testUser2.id
      )

      expect(shared.members).toHaveLength(1)
      expect(shared.members[0].userId).toBe(testUser2.id)

      // User 2 should see the project when includeShared is true
      const user2Projects = await getPersonalProjects(testUser2.id, {
        includeShared: true,
      })
      expect(user2Projects).toHaveLength(1)
      expect(user2Projects[0].id).toBe(project.id)
    })
  })

  describe('Standalone Tasks', () => {
    it('should create standalone task without project', async () => {
      const task = await createStandaloneTask(testUser1.id, {
        title: 'Buy groceries',
        description: 'Milk, bread, eggs',
        status: TodoStatus.NOT_STARTED,
      })

      expect(task.projectId).toBeNull()
      expect(task.creatorId).toBe(testUser1.id)
    })

    it('should include standalone tasks in My Tasks', async () => {
      await createStandaloneTask(testUser1.id, {
        title: 'Standalone 1',
      })

      await createStandaloneTask(testUser1.id, {
        title: 'Standalone 2',
        assigneeId: testUser1.id,
      })

      const myTasks = await getMyTasks(testUser1.id)
      expect(myTasks).toHaveLength(2)
      expect(myTasks.every(t => t.projectId === null)).toBe(true)
    })
  })

  describe('Task Management', () => {
    it('should update task status', async () => {
      const task = await createStandaloneTask(testUser1.id, {
        title: 'Update me',
        status: TodoStatus.NOT_STARTED,
      })

      const updated = await updateTodoStatus(
        task.id,
        TodoStatus.IN_PROGRESS,
        testUser1.id
      )

      expect(updated.status).toBe(TodoStatus.IN_PROGRESS)
    })

    it('should move task between projects', async () => {
      const project1 = await createPersonalProject(testUser1.id, {
        name: 'Project 1',
        description: 'First project',
      })

      const project2 = await createPersonalProject(testUser1.id, {
        name: 'Project 2',
        description: 'Second project',
      })

      const task = await createTodo(testUser1.id, {
        title: 'Mobile task',
        projectId: project1.id,
      })

      // Move to project 2
      const moved = await moveTaskToProject(task.id, project2.id, testUser1.id)
      expect(moved.projectId).toBe(project2.id)

      // Move to standalone
      const standalone = await moveTaskToProject(task.id, null, testUser1.id)
      expect(standalone.projectId).toBeNull()
    })

    it('should support new task states', async () => {
      const states = [
        TodoStatus.NOT_STARTED,
        TodoStatus.IN_PROGRESS,
        TodoStatus.WAITING_FOR,
        TodoStatus.DONE,
      ]

      const task = await createStandaloneTask(testUser1.id, {
        title: 'State test',
        status: TodoStatus.NOT_STARTED,
      })

      for (const status of states) {
        const updated = await updateTodoStatus(task.id, status, testUser1.id)
        expect(updated.status).toBe(status)
      }
    })
  })

  describe('My Tasks Grouping', () => {
    it('should group tasks by project', async () => {
      const project = await createPersonalProject(testUser1.id, {
        name: 'Test Project',
        description: 'For grouping',
      })

      // Create standalone tasks
      await createStandaloneTask(testUser1.id, {
        title: 'Standalone 1',
      })

      await createStandaloneTask(testUser1.id, {
        title: 'Standalone 2',
      })

      // Create project tasks
      await createTodo(testUser1.id, {
        title: 'Project task 1',
        projectId: project.id,
      })

      await createTodo(testUser1.id, {
        title: 'Project task 2',
        projectId: project.id,
      })

      const grouped = await getMyTasksGrouped(testUser1.id)

      expect(grouped).toHaveLength(2)
      expect(grouped[0].projectName).toBe('Standalone Tasks')
      expect(grouped[0].tasks).toHaveLength(2)
      expect(grouped[1].projectName).toBe('Test Project')
      expect(grouped[1].tasks).toHaveLength(2)
      expect(grouped[1].isPersonal).toBe(true)
    })
  })

  describe('Project Deletion', () => {
    it('should orphan tasks when project is deleted', async () => {
      const project = await createPersonalProject(testUser1.id, {
        name: 'To Delete',
        description: 'Will be deleted',
      })

      const task1 = await createTodo(testUser1.id, {
        title: 'Task 1',
        projectId: project.id,
        status: TodoStatus.NOT_STARTED,
      })

      const task2 = await createTodo(testUser1.id, {
        title: 'Task 2',
        projectId: project.id,
        status: TodoStatus.NOT_STARTED,
      })

      // Delete project
      await deleteProject(project.id, testUser1.id)

      // Tasks should now be standalone
      const myTasks = await getMyTasks(testUser1.id)
      const orphanedTasks = myTasks.filter(
        t => t.id === task1.id || t.id === task2.id
      )

      expect(orphanedTasks).toHaveLength(2)
      expect(orphanedTasks.every(t => t.projectId === null)).toBe(true)
    })
  })

  describe('Start Date Functionality', () => {
    it('should support start date on tasks', async () => {
      const futureDate = new Date('2025-03-01')
      
      const task = await createStandaloneTask(testUser1.id, {
        title: 'Future task',
        startDate: futureDate,
        status: TodoStatus.NOT_STARTED,
      })

      expect(task.startDate).toEqual(futureDate)
    })

    it('should order tasks by start date in My Tasks', async () => {
      const date1 = new Date('2025-02-01')
      const date2 = new Date('2025-02-15')
      const date3 = new Date('2025-03-01')

      await createStandaloneTask(testUser1.id, {
        title: 'Task 3',
        startDate: date3,
        status: TodoStatus.NOT_STARTED,
      })

      await createStandaloneTask(testUser1.id, {
        title: 'Task 1',
        startDate: date1,
        status: TodoStatus.NOT_STARTED,
      })

      await createStandaloneTask(testUser1.id, {
        title: 'Task 2',
        startDate: date2,
        status: TodoStatus.NOT_STARTED,
      })

      const myTasks = await getMyTasks(testUser1.id)
      
      // Tasks should be ordered by start date
      expect(myTasks[0].title).toBe('Task 1')
      expect(myTasks[1].title).toBe('Task 2')
      expect(myTasks[2].title).toBe('Task 3')
    })
  })
})