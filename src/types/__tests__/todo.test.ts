import { TodoStatus } from '../todo'

describe('Todo Types', () => {
  describe('TodoStatus Enum', () => {
    it('should have correct status values', () => {
      expect(TodoStatus.NOT_STARTED).toBe('NOT_STARTED')
      expect(TodoStatus.OPEN).toBe('OPEN')
      expect(TodoStatus.IN_PROGRESS).toBe('IN_PROGRESS')
      expect(TodoStatus.WAITING_FOR).toBe('WAITING_FOR')
      expect(TodoStatus.COMPLETED).toBe('COMPLETED')
      expect(TodoStatus.DONE).toBe('DONE')
    })

    it('should have exactly 6 status values', () => {
      const statusValues = Object.values(TodoStatus)
      expect(statusValues).toHaveLength(6)
      expect(statusValues).toContain('NOT_STARTED')
      expect(statusValues).toContain('OPEN')
      expect(statusValues).toContain('IN_PROGRESS')
      expect(statusValues).toContain('WAITING_FOR')
      expect(statusValues).toContain('COMPLETED')
      expect(statusValues).toContain('DONE')
    })
  })

  describe('Type Definitions', () => {
    it('should export all required types', () => {
      // This test ensures that the types are properly exported
      // The actual type checking is done by TypeScript at compile time
      const moduleExports = require('../todo')
      
      expect(moduleExports).toHaveProperty('TodoStatus')
      // Note: Interfaces are not available at runtime, only enums
    })
  })
})