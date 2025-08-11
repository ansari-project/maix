// Mock the MCP SDK before any imports
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn()
}))
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: jest.fn()
}))

import { officialMcpClientService, OfficialMcpClientService } from '../official-mcp-client.service'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { tool, jsonSchema } from 'ai'

// Mock the AI SDK tool and jsonSchema functions
jest.mock('ai', () => ({
  tool: jest.fn((config) => config), // Just return the config for testing
  jsonSchema: jest.fn((schema) => schema) // Pass through the schema unchanged
}))

describe('OfficialMcpClientService', () => {
  let service: OfficialMcpClientService
  let mockClient: jest.Mocked<Client>

  beforeEach(() => {
    jest.clearAllMocks()
    service = new OfficialMcpClientService()
    
    // Create mock client
    mockClient = {
      connect: jest.fn(),
      close: jest.fn(),
      listTools: jest.fn(),
      callTool: jest.fn(),
    } as any
    
    // Mock Client constructor
    ;(Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient)
  })

  afterEach(async () => {
    await service.clearCache()
  })

  describe('getTools', () => {
    it('should return empty object when no PAT is provided', async () => {
      // Don't set any PAT and don't set MAIX_PAT env var
      const originalEnv = process.env.MAIX_PAT
      delete process.env.MAIX_PAT
      
      const tools = await service.getTools()
      
      expect(tools).toEqual({})
      expect(mockClient.connect).not.toHaveBeenCalled()
      
      // Restore env
      if (originalEnv) {
        process.env.MAIX_PAT = originalEnv
      }
    })

    it('should convert MCP tools to AI SDK format', async () => {
      const mockMcpTools = [
        {
          name: 'test_tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {
              param1: { type: 'string' }
            }
          }
        }
      ]
      
      mockClient.listTools.mockResolvedValue({ tools: mockMcpTools })
      
      const tools = await service.getTools('test-pat-123')
      
      expect(mockClient.connect).toHaveBeenCalled()
      expect(mockClient.listTools).toHaveBeenCalled()
      expect(tool).toHaveBeenCalledWith({
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          }
        },
        execute: expect.any(Function)
      })
      expect(tools).toHaveProperty('test_tool')
    })

    it('should handle tools without inputSchema', async () => {
      const mockMcpTools = [
        {
          name: 'simple_tool',
          description: 'A simple tool without schema'
          // No inputSchema provided
        }
      ]
      
      mockClient.listTools.mockResolvedValue({ tools: mockMcpTools })
      
      const tools = await service.getTools('test-pat-123')
      
      expect(tool).toHaveBeenCalledWith({
        description: 'A simple tool without schema',
        inputSchema: { type: 'object', properties: {} }, // Default schema
        execute: expect.any(Function)
      })
      expect(tools).toHaveProperty('simple_tool')
    })

    it('should skip tools that fail conversion', async () => {
      const mockMcpTools = [
        {
          name: 'good_tool',
          description: 'This tool works',
          inputSchema: { type: 'object' }
        },
        {
          name: 'bad_tool',
          description: 'This tool will fail',
          inputSchema: { type: 'object' }
        }
      ]
      
      mockClient.listTools.mockResolvedValue({ tools: mockMcpTools })
      
      // Make tool() throw an error for the second tool
      const toolMock = tool as jest.MockedFunction<typeof tool>
      toolMock
        .mockImplementationOnce((config) => config as any) // First tool succeeds
        .mockImplementationOnce(() => {
          throw new Error('Conversion failed')
        }) // Second tool fails
      
      const tools = await service.getTools('test-pat-123')
      
      expect(tools).toHaveProperty('good_tool')
      expect(tools).not.toHaveProperty('bad_tool')
    })

    it('should cache tools for the same PAT', async () => {
      const mockMcpTools = [
        {
          name: 'cached_tool',
          description: 'Tool for caching test',
          inputSchema: { type: 'object' }
        }
      ]
      
      mockClient.listTools.mockResolvedValue({ tools: mockMcpTools })
      
      const pat = 'test-pat-456'
      const tools1 = await service.getTools(pat)
      const tools2 = await service.getTools(pat)
      
      expect(tools1).toBe(tools2) // Same object reference
      expect(mockClient.connect).toHaveBeenCalledTimes(1) // Only connected once
      expect(mockClient.listTools).toHaveBeenCalledTimes(1) // Only fetched once
    })

    it('should handle MCP client creation failure gracefully', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'))
      
      const tools = await service.getTools('test-pat-789')
      
      expect(tools).toEqual({})
      expect(mockClient.listTools).not.toHaveBeenCalled()
    })

    it('should handle listTools failure gracefully', async () => {
      mockClient.listTools.mockRejectedValue(new Error('Failed to list tools'))
      
      const tools = await service.getTools('test-pat-101')
      
      expect(tools).toEqual({})
    })
  })

  describe('tool execution', () => {
    it('should execute tools with proper PAT context', async () => {
      const mockMcpTools = [
        {
          name: 'executable_tool',
          description: 'Tool that can be executed',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      ]
      
      mockClient.listTools.mockResolvedValue({ tools: mockMcpTools })
      mockClient.callTool.mockResolvedValue({
        content: [
          { type: 'text', text: 'Tool executed successfully' }
        ]
      })
      
      const pat = 'test-pat-exec'
      const tools = await service.getTools(pat)
      
      // Get the execute function from the tool
      const executeFunc = (tool as jest.MockedFunction<typeof tool>).mock.calls[0][0].execute
      
      // Execute the tool
      const result = await executeFunc({ message: 'Hello' })
      
      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'executable_tool',
        arguments: { message: 'Hello' }
      })
      expect(result).toBe('Tool executed successfully')
    })

    it('should handle tool execution errors', async () => {
      const mockMcpTools = [
        {
          name: 'failing_tool',
          description: 'Tool that fails',
          inputSchema: { type: 'object' }
        }
      ]
      
      mockClient.listTools.mockResolvedValue({ tools: mockMcpTools })
      mockClient.callTool.mockRejectedValue(new Error('Execution failed'))
      
      const tools = await service.getTools('test-pat-fail')
      const executeFunc = (tool as jest.MockedFunction<typeof tool>).mock.calls[0][0].execute
      
      await expect(executeFunc({})).rejects.toThrow('Execution failed')
    })

    it('should handle non-text MCP tool results', async () => {
      const mockMcpTools = [
        {
          name: 'complex_tool',
          description: 'Tool with complex output',
          inputSchema: { type: 'object' }
        }
      ]
      
      mockClient.listTools.mockResolvedValue({ tools: mockMcpTools })
      mockClient.callTool.mockResolvedValue({
        content: [
          { type: 'image', data: 'base64data' },
          { type: 'text', text: 'Some text' }
        ]
      })
      
      const tools = await service.getTools('test-pat-complex')
      const executeFunc = (tool as jest.MockedFunction<typeof tool>).mock.calls[0][0].execute
      
      const result = await executeFunc({})
      
      expect(result).toBe('Some text') // Only text content is returned
    })
  })

  describe('clearCache', () => {
    it('should close all cached clients', async () => {
      // Create multiple clients with different PATs
      const pats = ['pat1', 'pat2', 'pat3']
      
      mockClient.listTools.mockResolvedValue({ tools: [] })
      
      for (const pat of pats) {
        await service.getTools(pat)
      }
      
      await service.clearCache()
      
      // Each client should be closed
      expect(mockClient.close).toHaveBeenCalledTimes(3)
    })

    it('should handle client close errors gracefully', async () => {
      mockClient.listTools.mockResolvedValue({ tools: [] })
      mockClient.close.mockRejectedValue(new Error('Close failed'))
      
      await service.getTools('test-pat-close')
      
      // Should not throw
      await expect(service.clearCache()).resolves.not.toThrow()
    })
  })

  describe('base URL configuration', () => {
    it('should fix maix.io redirect to www.maix.io', () => {
      const originalEnv = process.env.NEXT_PUBLIC_URL
      process.env.NEXT_PUBLIC_URL = 'https://maix.io'
      
      const newService = new OfficialMcpClientService()
      
      // Check that the service uses www.maix.io
      expect((newService as any).baseUrl).toBe('https://www.maix.io')
      
      // Restore original env
      process.env.NEXT_PUBLIC_URL = originalEnv
    })

    it('should use localhost in development', () => {
      const originalEnv = process.env.NEXT_PUBLIC_URL
      delete process.env.NEXT_PUBLIC_URL
      
      const newService = new OfficialMcpClientService()
      
      expect((newService as any).baseUrl).toBe('http://localhost:3000')
      
      // Restore original env
      if (originalEnv) {
        process.env.NEXT_PUBLIC_URL = originalEnv
      }
    })
  })
})