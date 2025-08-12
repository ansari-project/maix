/**
 * Integration tests for MCP Todo Tools - Less Mocked Version
 * 
 * Tests the actual MCP tool handlers with real database operations
 * to ensure the search-then-update patterns work with real data.
 */

import { prismaTest, createTestUser } from '@/lib/test/db-test-utils';
import { handleManageTodo } from '@/lib/mcp/tools/manageTodo';
import { handleSearchTodos } from '@/lib/mcp/tools/searchTodos';

describe('MCP Todo Tools Integration Tests - Real Data', () => {
  let testUser: any;
  let projectId: string;
  let personalTodoId: string;
  let projectTodoId: string;

  beforeEach(async () => {
    // Create test user
    testUser = await createTestUser();

    // Create test project
    const project = await prismaTest.project.create({
      data: {
        name: 'Database Migration Project',
        goal: 'Migrate to new schema',
        description: 'Migration project for testing',
        ownerId: testUser.id
      }
    });
    projectId = project.id;

    // Create test todos with realistic content
    const personalTodo = await prismaTest.todo.create({
      data: {
        title: 'Review database schema changes',
        description: 'Go through the proposed schema modifications',
        status: 'NOT_STARTED',
        creatorId: testUser.id,
        projectId: null // Personal todo
      }
    });
    personalTodoId = personalTodo.id;

    const projectTodo = await prismaTest.todo.create({
      data: {
        title: 'Setup CI/CD pipeline for testing',
        description: 'Configure automated testing in GitHub Actions',
        status: 'IN_PROGRESS',
        creatorId: testUser.id,
        projectId: projectId
      }
    });
    projectTodoId = projectTodo.id;
  });

  afterEach(async () => {
    await prismaTest.$transaction([
      prismaTest.todo.deleteMany({ where: { creatorId: testUser.id } }),
      prismaTest.project.deleteMany({ where: { ownerId: testUser.id } }),
      prismaTest.user.deleteMany({ where: { id: testUser.id } })
    ]);
  });

  describe('Real Todo Search and Update Workflow', () => {
    it('should find and update todos using the search-then-update pattern', async () => {
      const context = { user: testUser };

      // Step 1: Search for "database" todos (like AI would do)
      const searchResult = await handleSearchTodos({
        query: 'database',
        includePersonal: true
      }, context);

      // Verify we found the personal todo
      expect(searchResult).toContain('Review database schema changes');
      expect(searchResult).toContain(personalTodoId);

      // Step 2: Update the found todo to COMPLETED (like AI would do)
      const updateResult = await handleManageTodo({
        action: 'update',
        todoId: personalTodoId,
        status: 'COMPLETED'
      }, context);

      expect(updateResult).toContain('updated successfully');

      // Verify the todo was actually updated in the database
      const updatedTodo = await prismaTest.todo.findUnique({
        where: { id: personalTodoId }
      });
      expect(updatedTodo?.status).toBe('COMPLETED');
    });

    it('should handle "start working on X" by finding and setting to IN_PROGRESS', async () => {
      const context = { user: testUser };

      // Create a NOT_STARTED todo for this test
      const newTodo = await prismaTest.todo.create({
        data: {
          title: 'Write unit tests for API endpoints',
          description: 'Add comprehensive test coverage',
          status: 'NOT_STARTED',
          creatorId: testUser.id,
          projectId: null
        }
      });

      // Search for "unit tests" (simulating AI search)
      const searchResult = await handleSearchTodos({
        query: 'unit tests',
        includePersonal: true
      }, context);

      expect(searchResult).toContain('Write unit tests for API endpoints');

      // Update to IN_PROGRESS (simulating AI action)
      const updateResult = await handleManageTodo({
        action: 'update',
        todoId: newTodo.id,
        status: 'IN_PROGRESS'
      }, context);

      expect(updateResult).toContain('updated successfully');

      // Verify the status change
      const updatedTodo = await prismaTest.todo.findUnique({
        where: { id: newTodo.id }
      });
      expect(updatedTodo?.status).toBe('IN_PROGRESS');

      // Cleanup
      await prismaTest.todo.delete({ where: { id: newTodo.id } });
    });
  });

  describe('List All Todos Functionality', () => {
    it('should return both personal and project todos with list-all action', async () => {
      const context = { user: testUser };

      const result = await handleManageTodo({
        action: 'list-all'
      }, context);

      // Should contain both todos
      expect(result).toContain('Personal Todos');
      expect(result).toContain('Project Todos');
      expect(result).toContain('Review database schema changes'); // Personal
      expect(result).toContain('Setup CI/CD pipeline'); // Project
      expect(result).toContain('Database Migration Project'); // Project name
    });

    it('should handle empty state gracefully', async () => {
      // Create a user with no todos
      const emptyUser = await createTestUser();
      const context = { user: emptyUser };

      const result = await handleManageTodo({
        action: 'list-all'
      }, context);

      expect(result).toContain('No todos found');
      expect(result).toContain('Create a todo for');

      // Cleanup
      await prismaTest.user.delete({ where: { id: emptyUser.id } });
    });
  });

  describe('Search Edge Cases', () => {
    it('should handle no search results gracefully', async () => {
      const context = { user: testUser };

      const result = await handleSearchTodos({
        query: 'nonexistent-keyword-xyz',
        includePersonal: true
      }, context);

      expect(result).toContain('No todos found matching "nonexistent-keyword-xyz"');
    });

    it('should search both personal and project todos when includePersonal is true', async () => {
      const context = { user: testUser };

      // Search for a term that matches both
      const result = await handleSearchTodos({
        query: 'CI', // Matches "Setup CI/CD pipeline"
        includePersonal: true
      }, context);

      expect(result).toContain('Setup CI/CD pipeline');
      expect(result).toContain('Database Migration Project'); // Project name
    });
  });

  describe('Error Handling in Real Scenarios', () => {
    it('should handle updating non-existent todo', async () => {
      const context = { user: testUser };

      await expect(handleManageTodo({
        action: 'update',
        todoId: 'non-existent-id',
        status: 'COMPLETED'
      }, context)).rejects.toThrow('Todo not found');
    });

    it('should handle unauthorized todo access', async () => {
      // Create another user
      const otherUser = await createTestUser();
      
      // Try to update someone else's todo
      const context = { user: otherUser };

      await expect(handleManageTodo({
        action: 'update',
        todoId: personalTodoId,
        status: 'COMPLETED'
      }, context)).rejects.toThrow('permission');

      // Cleanup
      await prismaTest.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('Complex Search Scenarios', () => {
    it('should find todos with partial matches and handle status updates', async () => {
      const context = { user: testUser };

      // Search with partial keyword
      const searchResult = await handleSearchTodos({
        query: 'schema', // Should match "Review database schema changes"
        includePersonal: true
      }, context);

      expect(searchResult).toContain('Review database schema changes');
      
      // Now update it
      const updateResult = await handleManageTodo({
        action: 'update',
        todoId: personalTodoId,
        status: 'WAITING_FOR'
      }, context);

      expect(updateResult).toContain('updated successfully');

      // Search again to verify the status icon changed
      const newSearchResult = await handleSearchTodos({
        query: 'schema',
        includePersonal: true
      }, context);

      expect(newSearchResult).toContain('⏳'); // Waiting icon
    });
  });
});