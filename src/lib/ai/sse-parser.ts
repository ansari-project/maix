/**
 * SSE (Server-Sent Events) Parser for AI Chat Responses
 * 
 * This module handles parsing of SSE streams from the AI chat endpoint
 * and provides clean, formatted output for the UI.
 */

export interface SSEChunk {
  type: 'text' | 'error' | 'done'
  content?: string
  error?: string
}

/**
 * Parses a raw SSE chunk and extracts the content
 * SSE format from Vercel AI SDK:
 * - "0:content" or "d:content" for data chunks
 * - "8:content" for other data
 * - "e:{"finishReason":"stop"}" for completion
 */
export function parseSSEChunk(chunk: string): SSEChunk[] {
  const results: SSEChunk[] = []
  const lines = chunk.split('\n').filter(line => line.trim())

  for (const line of lines) {
    // Skip empty lines
    if (!line) continue

    // Handle different SSE prefixes
    if (line.startsWith('0:') || line.startsWith('d:') || line.startsWith('8:')) {
      const content = line.substring(2)
      
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(content)
        
        if (typeof parsed === 'string') {
          // Direct string content
          results.push({ type: 'text', content: parsed })
        } else if (parsed && typeof parsed === 'object') {
          // Could be a structured response or error
          if (parsed.error) {
            results.push({ type: 'error', error: parsed.error })
          } else if (parsed.message) {
            results.push({ type: 'text', content: parsed.message })
          }
        }
      } catch (e) {
        // Not JSON, treat as plain text
        if (content && content !== '[DONE]') {
          results.push({ type: 'text', content })
        }
      }
    } else if (line.startsWith('e:')) {
      // End event
      const content = line.substring(2)
      try {
        const parsed = JSON.parse(content)
        if (parsed.finishReason) {
          results.push({ type: 'done' })
        }
      } catch (e) {
        // Ignore parse errors for end events
      }
    }
  }

  return results
}

/**
 * Accumulates SSE chunks into a single response
 */
export class SSEAccumulator {
  private content: string = ''
  private isDone: boolean = false

  addChunk(chunk: string): void {
    const parsed = parseSSEChunk(chunk)
    
    for (const item of parsed) {
      if (item.type === 'text' && item.content) {
        this.content += item.content
      } else if (item.type === 'done') {
        this.isDone = true
      } else if (item.type === 'error' && item.error) {
        console.error('SSE Error:', item.error)
      }
    }
  }

  getContent(): string {
    return this.content
  }

  isComplete(): boolean {
    return this.isDone
  }

  reset(): void {
    this.content = ''
    this.isDone = false
  }
}

/**
 * Formats the accumulated content for display
 * Simply cleans up escape sequences, preserving Markdown
 */
export function formatAIResponse(content: string): string {
  // Just clean up escape sequences that come from JSON encoding
  // Preserve all Markdown formatting
  let formatted = content
    .replace(/\\n/g, '\n')  // Unescape newlines
    .replace(/\\"/g, '"')   // Unescape quotes
    .replace(/\\\\/g, '\\') // Unescape backslashes
    .trim()
  
  return formatted
}

