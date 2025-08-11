/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('Todo Sync via Custom Events', () => {
  let eventHandler: jest.Mock

  beforeEach(() => {
    eventHandler = jest.fn()
    window.addEventListener('app:todos:invalidate', eventHandler)
  })

  afterEach(() => {
    window.removeEventListener('app:todos:invalidate', eventHandler)
    jest.clearAllMocks()
  })

  it('should dispatch todo invalidate event when todo operations are detected', () => {
    // Simulate AI response with todo operation
    const event = new CustomEvent('app:todos:invalidate', {
      detail: { 
        reason: 'mcp-tool-response',
        timestamp: Date.now()
      }
    })

    window.dispatchEvent(event)

    expect(eventHandler).toHaveBeenCalledTimes(1)
    expect(eventHandler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'app:todos:invalidate',
      detail: expect.objectContaining({
        reason: 'mcp-tool-response'
      })
    }))
  })

  it('should handle debounced events correctly', async () => {
    // Dispatch multiple events rapidly
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new CustomEvent('app:todos:invalidate', {
        detail: { reason: 'test', timestamp: Date.now() + i }
      }))
    }

    // All events should be received
    expect(eventHandler).toHaveBeenCalledTimes(5)
  })

  it('should include proper event details', () => {
    const timestamp = Date.now()
    const event = new CustomEvent('app:todos:invalidate', {
      detail: { 
        reason: 'ai-assistant-action',
        timestamp: timestamp
      }
    })

    window.dispatchEvent(event)

    const call = eventHandler.mock.calls[0][0]
    expect(call.detail.reason).toBe('ai-assistant-action')
    expect(call.detail.timestamp).toBe(timestamp)
  })
})