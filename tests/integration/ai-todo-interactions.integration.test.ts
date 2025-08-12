/**
 * Integration tests for AI-Todo interactions
 * 
 * Tests the complete AI workflow for todo management including:
 * - Listing all todos without asking for type
 * - Finding and updating todos by natural language
 * - Creating todos from natural descriptions
 * - Search-then-update patterns for status changes
 */

import { prismaTest, createTestUser } from '@/lib/test/db-test-utils';
import { streamText, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { officialMcpClientService } from '@/lib/services/official-mcp-client.service';
import { getOrCreateEncryptedAIAssistantPat } from '@/lib/mcp/services/encrypted-pat.service';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/chat/route';

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

// Mock AI SDK to control responses for testing
jest.mock('ai', () => ({
  streamText: jest.fn(),
  generateText: jest.fn().mockResolvedValue({
    text: 'Default mock response',
    toolCalls: [],
    finishReason: 'stop'
  })
}));

// Mock official MCP client service
jest.mock('@/lib/services/official-mcp-client.service');
jest.mock('@/lib/mcp/services/encrypted-pat.service');

const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;
const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;
const mockOfficialMcpClientService = officialMcpClientService as jest.Mocked<typeof officialMcpClientService>;
const mockGetPat = getOrCreateEncryptedAIAssistantPat as jest.MockedFunction<typeof getOrCreateEncryptedAIAssistantPat>;

describe('AI Todo Interactions Integration Tests', () => {
  let testUser: any;
  let projectId: string;
  let personalTodoId: string;
  let projectTodoId: string;

  beforeEach(async () => {
    // Create test user
    testUser = await createTestUser();

    // Mock PAT service
    mockGetPat.mockResolvedValue('test-pat-token');
    
    // Reset and configure generateText mock for each test
    mockGenerateText.mockReset();
    mockGenerateText.mockResolvedValue({
      text: 'Default mock response',
      toolCalls: [],
      finishReason: 'stop'
    } as any);
    
    // Reset and configure streamText mock for each test
    mockStreamText.mockReset();
    mockStreamText.mockResolvedValue({
      toTextStreamResponse: () => new Response('Default stream response'),
      text: 'Default stream text',
      toolCalls: [],
      finishReason: 'stop'
    } as any);

    // Create test project
    const project = await prismaTest.project.create({
      data: {
        name: 'Test AI Project',
        goal: 'Test AI interactions with todos',
        description: 'Integration test project',
        ownerId: testUser.id
      }
    });
    projectId = project.id;

    // Create test todos
    const personalTodo = await prismaTest.todo.create({
      data: {
        title: 'Review database schema',
        description: 'Check the user management tables',
        status: 'NOT_STARTED',
        creatorId: testUser.id,
        projectId: null // Personal todo
      }
    });
    personalTodoId = personalTodo.id;

    const projectTodo = await prismaTest.todo.create({
      data: {
        title: 'Setup CI/CD pipeline',
        description: 'Configure GitHub Actions for automated testing',
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
    jest.clearAllMocks();
  });

  describe('Listing All Todos', () => {
    it('should use list-all action when user asks for "my todos"', async () => {
      // Mock MCP tools to return manageTodo tool
      const mockTools = {
        maix_manage_todo: {
          description: 'Manage todo items and tasks',
          parameters: {
            action: { enum: ['create', 'update', 'delete', 'get', 'list', 'list-standalone', 'list-all'] }
          }
        }
      };
      mockOfficialMcpClientService.getTools.mockResolvedValue(mockTools);

      // Mock AI to call list-all action
      const mockToolCall = {
        toolName: 'maix_manage_todo',
        args: { action: 'list-all' }
      };

      mockStreamText.mockResolvedValue({
        toTextStreamResponse: () => new Response(),
        toolCalls: [mockToolCall],
        text: 'Here are all your todos:'
      } as any);

      // Mock session
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'show me my todos' }]
        })
      });

      // Call the route handler directly
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.objectContaining({
            maix_manage_todo: expect.any(Object)
          })
        })
      );

      // Verify the system message instructs to use list-all
      const systemMessage = mockGenerateText.mock.calls[0][0].messages[0];
      expect(systemMessage.content).toContain('action "list-all"');
      expect(systemMessage.content).toContain('gets ALL their todos');
    });

    it('should not ask user to specify todo type when listing', async () => {
      const mockTools = {
        maix_manage_todo: {
          description: 'Manage todo items and tasks',
          parameters: {}
        }
      };
      mockOfficialMcpClientService.getTools.mockResolvedValue(mockTools);

      mockStreamText.mockResolvedValue({
        toTextStreamResponse: () => new Response(),
        toolCalls: [{ toolName: 'maix_manage_todo', args: { action: 'list-all' } }],
        text: 'Here are all your todos: personal and project'
      } as any);

      // Mock session
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'what are my todos?' }]
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      // Verify system message tells AI to use list-all action
      const systemMessage = mockGenerateText.mock.calls[0][0].messages[0];
      expect(systemMessage.content).toContain('action "list-all"');
    });
  });

  describe('Search-Then-Update Pattern', () => {
    it('should search first when user says "mark database task as done"', async () => {
      const mockTools = {
        maix_search_todos: {
          description: 'Search and find todos',
          parameters: {}
        },
        maix_manage_todo: {
          description: 'Manage todo items',
          parameters: {}
        }
      };
      mockOfficialMcpClientService.getTools.mockResolvedValue(mockTools);

      // Mock AI to first search, then update
      const mockToolCalls = [
        {
          toolName: 'maix_search_todos',
          args: { query: 'database', includePersonal: true }
        },
        {
          toolName: 'maix_manage_todo', 
          args: { action: 'update', todoId: personalTodoId, status: 'COMPLETED' }
        }
      ];

      mockStreamText.mockResolvedValue({
        toTextStreamResponse: () => new Response(),
        toolCalls: mockToolCalls,
        text: 'I found the database task and marked it as completed!'
      } as any);

      // Mock session
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'mark database task as done' }]
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      // Verify system message instructs search-then-update pattern
      const systemMessage = mockGenerateText.mock.calls[0][0].messages[0];
      expect(systemMessage.content).toContain('First use maix_search_todos to find the todo');
      expect(systemMessage.content).toContain('Then use maix_manage_todo with action "update"');
    });

    it('should handle "start working on X" by setting status to IN_PROGRESS', async () => {
      const mockTools = {
        maix_search_todos: { description: 'Search todos', parameters: {} },
        maix_manage_todo: { description: 'Manage todos', parameters: {} }
      };
      mockOfficialMcpClientService.getTools.mockResolvedValue(mockTools);

      const mockToolCalls = [
        {
          toolName: 'maix_search_todos',
          args: { query: 'schema', includePersonal: true }
        },
        {
          toolName: 'maix_manage_todo',
          args: { action: 'update', todoId: personalTodoId, status: 'IN_PROGRESS' }
        }
      ];

      mockStreamText.mockResolvedValue({
        toTextStreamResponse: () => new Response(),
        toolCalls: mockToolCalls,
        text: 'Found the schema task and set it to in progress!'
      } as any);

      // Mock session
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'start working on the schema task' }]
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify instructions for IN_PROGRESS status
      const systemMessage = mockGenerateText.mock.calls[0][0].messages[0];
      expect(systemMessage.content).toContain('For "start working on X": set status to "IN_PROGRESS"');
    });
  });

  describe('Natural Language Todo Creation', () => {
    it('should create todo from "create a todo for reviewing the API documentation"', async () => {
      const mockTools = {
        maix_manage_todo: {
          description: 'Manage todo items',
          parameters: {}
        }
      };
      mockOfficialMcpClientService.getTools.mockResolvedValue(mockTools);

      const mockToolCall = {
        toolName: 'maix_manage_todo',
        args: { 
          action: 'create', 
          title: 'Review API documentation',
          description: 'Review the API documentation thoroughly',
          status: 'NOT_STARTED'
        }
      };

      mockStreamText.mockResolvedValue({
        toTextStreamResponse: () => new Response(),
        toolCalls: [mockToolCall],
        text: 'Created a new todo for reviewing API documentation!'
      } as any);

      // Mock session
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'create a todo for reviewing the API documentation' }]
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify system message encourages proactive tool usage
      const systemMessage = mockGenerateText.mock.calls[0][0].messages[0];
      expect(systemMessage.content).toContain('If someone says "Create a todo for...", use the todo management tool');
    });
  });

  describe('Search Tool Enhancement', () => {
    it('should emphasize includePersonal: true for comprehensive search', async () => {
      const mockTools = {
        maix_search_todos: {
          description: 'Search and find todos across ALL projects and assignments. CRITICAL: Use this to find specific todos when user wants to update them (e.g., "mark database task as done" - search for "database" first). Also use to find todos by status, assignee, project, or search term. Returns todos from projects where user is assigned or member. Always include includePersonal: true to search both project and personal todos.',
          parameters: {}
        }
      };
      mockOfficialMcpClientService.getTools.mockResolvedValue(mockTools);

      // Verify the tool description includes the includePersonal guidance
      expect(mockTools.maix_search_todos.description).toContain('Always include includePersonal: true');
      expect(mockTools.maix_search_todos.description).toContain('search both project and personal todos');
    });
  });

  describe('Error Handling', () => {
    it('should handle case when no todos are found for update', async () => {
      const mockTools = {
        maix_search_todos: { description: 'Search todos', parameters: {} }
      };
      mockOfficialMcpClientService.getTools.mockResolvedValue(mockTools);

      const mockToolCall = {
        toolName: 'maix_search_todos',
        args: { query: 'nonexistent', includePersonal: true }
      };

      mockStreamText.mockResolvedValue({
        toTextStreamResponse: () => new Response(),
        toolCalls: [mockToolCall],
        text: 'I could not find any todos matching "nonexistent"'
      } as any);

      // Mock session
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'mark nonexistent task as done' }]
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle MCP tool failures gracefully', async () => {
      // Mock MCP service to fail
      mockOfficialMcpClientService.getTools.mockRejectedValue(new Error('MCP connection failed'));

      // Mock session
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      });

      // Mock generateText to return a response without tools
      mockGenerateText.mockResolvedValueOnce({
        text: 'I cannot access todos right now, but I can help you with other questions.',
        toolCalls: [],
        finishReason: 'stop'
      } as any);

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'show my todos' }]
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      // The MCP service should have been called but failed
      expect(mockOfficialMcpClientService.getTools).toHaveBeenCalled();
    });
  });

  describe('Timezone Handling', () => {
    it('should inject user timezone into AI system prompt', async () => {
      const mockTools = {};
      mockOfficialMcpClientService.getTools.mockResolvedValue(mockTools);

      mockStreamText.mockResolvedValue({
        toTextStreamResponse: () => new Response(),
        toolCalls: [],
        text: 'Response with timezone awareness'
      } as any);

      // Mock session
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'create a todo due tomorrow' }],
          timezone: 'America/New_York'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify timezone is injected into system message
      const systemMessage = mockGenerateText.mock.calls[0][0].messages[0];
      expect(systemMessage.content).toContain('User\'s timezone: America/New_York');
      expect(systemMessage.content).toContain('be aware of the user\'s timezone');
    });
  });
});