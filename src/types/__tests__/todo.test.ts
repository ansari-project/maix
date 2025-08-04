import { TodoStatus } from '../todo'

describe('Todo Types', () => {
  describe('TodoStatus Enum', () => {
    it('should have correct status values', () => {
      expect(TodoStatus.OPEN).toBe('OPEN')
      expect(TodoStatus.IN_PROGRESS).toBe('IN_PROGRESS')
      expect(TodoStatus.COMPLETED).toBe('COMPLETED')
    })

    it('should have exactly 3 status values', () => {
      const statusValues = Object.values(TodoStatus)
      expect(statusValues).toHaveLength(3)
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