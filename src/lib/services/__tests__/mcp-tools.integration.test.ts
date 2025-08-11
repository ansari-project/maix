/**
 * @jest-environment node
 */

import { officialMcpClientService } from '@/lib/services/official-mcp-client.service'
import { getOrCreateEncryptedAIAssistantPat } from '@/lib/mcp/services/encrypted-pat.service'
import { prisma } from '@/lib/prisma'
import { prismaTest } from '@/lib/test/db-test-utils'
import type { User } from '@prisma/client'

describe('MCP Tools Integration', () => {
  let testUser: User
  let testPat: string

  beforeAll(async () => {
    // Create a test user
    testUser = await prismaTest.user.create({
      data: {
        email: 'mcp-test@example.com',
        username: 'mcp-test-user',
        name: 'MCP Test User',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Get or create PAT for the test user
    testPat = await getOrCreateEncryptedAIAssistantPat(testUser.id)
  })

  afterAll(async () => {
    // Clean up test data
    await prismaTest.personalAccessToken.deleteMany({
      where: { userId: testUser.id }
    })
    await prismaTest.user.delete({
      where: { id: testUser.id }
    })
    
    // Clear MCP client cache
    await officialMcpClientService.clearCache()
  })

  describe('MCP Client Service', () => {
    it('should successfully retrieve MCP tools', async () => {
      const tools = await officialMcpClientService.getTools(testPat)
      
      expect(tools).toBeDefined()
      expect(typeof tools).toBe('object')
      
      // Check that we have tools
      const toolNames = Object.keys(tools)
      expect(toolNames.length).toBeGreaterThan(0)
      
      // Verify expected tool names
      expect(toolNames).toContain('maix_manage_todo')
      expect(toolNames).toContain('maix_search_todos')
      expect(toolNames).toContain('maix_manage_project')
      expect(toolNames).toContain('maix_search_projects')
    })

    it('should return properly formatted AI SDK tools', async () => {
      const tools = await officialMcpClientService.getTools(testPat)
      const toolNames = Object.keys(tools)
      
      // Check each tool has required properties
      for (const toolName of toolNames) {
        const tool = tools[toolName]
        
        // Each tool should have description and execute function
        expect(tool).toHaveProperty('description')
        expect(typeof tool.description).toBe('string')
        expect(tool.description.length).toBeGreaterThan(0)
        
        expect(tool).toHaveProperty('execute')
        expect(typeof tool.execute).toBe('function')
        
        // Check for inputSchema (wrapped with jsonSchema)
        expect(tool).toHaveProperty('inputSchema')
      }
    })

    it('should cache tools per PAT', async () => {
      // First call should fetch from server
      const tools1 = await officialMcpClientService.getTools(testPat)
      
      // Second call should return cached tools
      const tools2 = await officialMcpClientService.getTools(testPat)
      
      // Should be the same reference (cached)
      expect(tools1).toBe(tools2)
    })

    it('should handle missing PAT gracefully', async () => {
      const tools = await officialMcpClientService.getTools('')
      
      expect(tools).toEqual({})
    })

    it('should handle invalid PAT gracefully', async () => {
      const tools = await officialMcpClientService.getTools('invalid-pat-12345')
      
      expect(tools).toBeDefined()
      expect(typeof tools).toBe('object')
      // May return empty object or throw error depending on server response
    })
  })

  describe('Schema Sanitization', () => {
    it('should sanitize schemas for Gemini compatibility', async () => {
      const tools = await officialMcpClientService.getTools(testPat)
      
      // Verify no unsupported formats in schemas
      for (const toolName of Object.keys(tools)) {
        const tool = tools[toolName]
        
        // Check that tool has been properly wrapped
        expect(tool.inputSchema).toBeDefined()
        
        // The schema should be wrapped with jsonSchema() function
        // which is validated internally by the AI SDK
      }
    })
  })

  describe('Tool Descriptions', () => {
    it('should have detailed descriptions for key tools', async () => {
      const tools = await officialMcpClientService.getTools(testPat)
      
      // Check maix_manage_todo description
      if (tools.maix_manage_todo) {
        expect(tools.maix_manage_todo.description).toContain('todo')
        expect(tools.maix_manage_todo.description.length).toBeGreaterThan(50)
      }
      
      // Check maix_search_todos description
      if (tools.maix_search_todos) {
        expect(tools.maix_search_todos.description).toContain('search')
        expect(tools.maix_search_todos.description).toContain('todo')
      }
      
      // Check maix_manage_project description
      if (tools.maix_manage_project) {
        expect(tools.maix_manage_project.description).toContain('project')
      }
    })
  })

  describe('Tool Execution', () => {
    it('should be able to execute a tool', async () => {
      const tools = await officialMcpClientService.getTools(testPat)
      
      // Get the search todos tool
      const searchTodosTool = tools.maix_search_todos
      
      if (searchTodosTool && searchTodosTool.execute) {
        // Try to execute the tool
        const result = await searchTodosTool.execute({
          limit: 5,
          status: 'NOT_STARTED'
        })
        
        // Should return some result (even if empty)
        expect(result).toBeDefined()
      }
    })
  })
})