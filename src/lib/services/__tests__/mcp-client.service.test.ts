import { McpClientService } from '../mcp-client.service'

// Only mock the external AI SDK dependency
jest.mock('ai', () => ({
  experimental_createMCPClient: jest.fn()
}))

describe('McpClientService', () => {
  let service: McpClientService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new McpClientService()
  })

  afterEach(async () => {
    await service.clearCache()
  })

  it('should return empty tools when client creation fails', async () => {
    const { experimental_createMCPClient } = require('ai')
    experimental_createMCPClient.mockRejectedValue(new Error('Connection failed'))

    const tools = await service.getTools()

    expect(tools).toEqual({})
  })

  it('should cache tools between calls', async () => {
    const { experimental_createMCPClient } = require('ai')
    const mockClient = { 
      tools: jest.fn().mockResolvedValue({ test_tool: { description: 'test' } }),
      close: jest.fn()
    }
    experimental_createMCPClient.mockClear() // Clear previous calls
    experimental_createMCPClient.mockResolvedValue(mockClient)

    const tools1 = await service.getTools()
    const tools2 = await service.getTools()

    expect(tools1).toEqual(tools2)
    expect(experimental_createMCPClient).toHaveBeenCalledTimes(1)
    expect(mockClient.tools).toHaveBeenCalledTimes(1)
  })

  it('should clear cache and close client', async () => {
    const { experimental_createMCPClient } = require('ai')
    const mockClient = { 
      tools: jest.fn().mockResolvedValue({}),
      close: jest.fn()
    }
    experimental_createMCPClient.mockResolvedValue(mockClient)

    await service.getTools()
    await service.clearCache()

    expect(mockClient.close).toHaveBeenCalled()
  })
})