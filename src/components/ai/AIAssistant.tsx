'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLayout } from '@/contexts/LayoutContext'
import { cn } from '@/lib/utils'
import { Markdown } from '@/components/ui/markdown'
import { 
  Bot, 
  X, 
  Minimize2, 
  Send,
  Loader2,
  GripHorizontal,
  History,
  MessageSquare
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ConversationSummary {
  id: string
  title: string | null
  lastActiveAt: Date
  messageCount: number
}

export function AIAssistant() {
  const { isAIExpanded, toggleAI, currentPath, aiHeight, setAIHeight } = useLayout()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ y: 0, height: 0 })
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when expanded
  useEffect(() => {
    if (isAIExpanded) {
      inputRef.current?.focus()
    }
  }, [isAIExpanded])

  // Drag and resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      y: e.clientY,
      height: aiHeight
    })
  }, [aiHeight])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    const deltaY = dragStart.y - e.clientY // Inverted because we're dragging from bottom
    const newHeight = Math.max(200, Math.min(window.innerHeight * 0.8, dragStart.height + deltaY))
    setAIHeight(newHeight)
  }, [isDragging, dragStart, setAIHeight])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Listen for Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleAI()
      }
      if (e.key === 'Escape' && isAIExpanded) {
        toggleAI()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAIExpanded, toggleAI])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call the real AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          conversationId: conversationId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          // Include context about current page  
          context: {
            currentPath: currentPath || '/'
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      // Extract conversation ID from headers for future requests
      const newConversationId = response.headers.get('X-Conversation-ID')
      if (newConversationId && !conversationId) {
        setConversationId(newConversationId)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          assistantContent += chunk
        }
      }
      
      // Check response for todo-related keywords that indicate MCP tool was used
      // This is a simple heuristic approach
      const todoIndicators = [
        'Todo created successfully',
        'Todo updated successfully',
        'Todo deleted successfully',
        'Personal project created',
        'Task added to',
        'created with ID'
      ]
      
      const shouldInvalidateTodos = todoIndicators.some(indicator => 
        assistantContent.includes(indicator)
      )
      
      if (shouldInvalidateTodos) {
        // Small delay to ensure the database write has completed
        setTimeout(() => {
          console.log('Todo operation detected, dispatching refresh event')
          window.dispatchEvent(new CustomEvent('app:todos:invalidate', {
            detail: { 
              reason: 'mcp-tool-response',
              timestamp: Date.now()
            }
          }))
        }, 500)
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent || 'I apologize, but I couldn\'t generate a response. Please try again.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error getting AI response:', error)
      
      // Fallback message on error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again later.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const loadConversationHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations.map((conv: any) => ({
          id: conv.id,
          title: conv.title || 'Untitled Conversation',
          lastActiveAt: new Date(conv.lastActiveAt),
          messageCount: Array.isArray(conv.messages) ? conv.messages.length : 0
        })))
      }
    } catch (error) {
      console.error('Error loading conversation history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const loadConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/ai/chat?conversationId=${convId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const conversation = data.conversation
        
        if (conversation && Array.isArray(conversation.messages)) {
          setMessages(conversation.messages.map((msg: any, index: number) => ({
            id: `${convId}-${index}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp || conversation.lastActiveAt)
          })))
          setConversationId(convId)
          setShowHistory(false)
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  const startNewConversation = () => {
    setMessages([])
    setConversationId(null)
    setShowHistory(false)
  }

  // Context-aware placeholder based on current page
  const getPlaceholder = () => {
    if (!currentPath) {
      return 'Ask me anything or describe what you need...'
    }
    if (currentPath.includes('projects')) {
      return 'Ask about projects, find tasks, or create new...'
    }
    if (currentPath.includes('todos')) {
      return 'Show my tasks, add todos, or check progress...'
    }
    if (currentPath === '/') {
      return 'How can I help you today? Try "Show my priorities"...'
    }
    return 'Ask me anything or describe what you need...'
  }


  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-background border-t border-border transition-all duration-300 z-40',
        isAIExpanded ? '' : 'h-12',
        isDragging && 'transition-none' // Disable transitions while dragging
      )}
      style={isAIExpanded ? { height: `${aiHeight}px` } : undefined}
    >
      {/* Collapsed State */}
      {!isAIExpanded && (
        <button
          onClick={toggleAI}
          className="w-full h-full flex items-center gap-3 px-6 hover:bg-muted/50 transition-colors group"
        >
          <Bot className="w-5 h-5 text-muted-foreground group-hover:text-blue-600" />
          <span className="text-muted-foreground group-hover:text-foreground">
            {getPlaceholder()}
          </span>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            Cmd+K
          </span>
        </button>
      )}

      {/* Expanded State */}
      {isAIExpanded && (
        <div className="flex flex-col h-full">
          {/* Drag Handle */}
          <div 
            className={cn(
              "h-1 bg-muted/30 hover:bg-muted cursor-row-resize flex items-center justify-center group",
              isDragging && "bg-blue-500"
            )}
            onMouseDown={handleMouseDown}
          >
            <GripHorizontal className="w-4 h-4 text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              <span className="font-medium">AI Assistant</span>
              <span className="text-sm text-muted-foreground">- {currentPath === '/' ? 'Home' : currentPath.slice(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!showHistory) {
                    loadConversationHistory()
                  }
                  setShowHistory(!showHistory)
                }}
                className="p-1 hover:bg-muted/50 rounded transition-colors"
                aria-label="Conversation History"
                title="Conversation History"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={startNewConversation}
                className="p-1 hover:bg-muted/50 rounded transition-colors"
                aria-label="New Conversation"
                title="New Conversation"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={toggleAI}
                className="p-1 hover:bg-muted/50 rounded transition-colors"
                aria-label="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleAI}
                className="p-1 hover:bg-muted/50 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages or History */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {showHistory ? (
              /* Conversation History Panel */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">Recent Conversations</h3>
                  {loadingHistory && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                
                {conversations.length === 0 && !loadingHistory ? (
                  <p className="text-muted-foreground text-sm">No previous conversations found.</p>
                ) : (
                  conversations.map(conversation => (
                    <div
                      key={conversation.id}
                      onClick={() => loadConversation(conversation.id)}
                      className="p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {conversation.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''} • {' '}
                            {conversation.lastActiveAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                <p>👋 Hi! I&apos;m your AI assistant. I can help you:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Find and create projects</li>
                  <li>• Manage your tasks and todos</li>
                  <li>• Navigate the platform</li>
                  <li>• Answer questions about features</li>
                </ul>
                <p className="mt-3">What would you like to do?</p>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg px-4 py-2',
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted'
                    )}
                  >
                    <Markdown 
                      content={message.content} 
                      className={cn(
                        "text-sm leading-relaxed [&>*]:mb-0 [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>*:last-child]:mb-0",
                        message.role === 'user' ? "text-white" : "text-foreground"
                      )}
                    />
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-border px-6 py-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={getPlaceholder()}
                className="flex-1 px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  'px-4 py-2 rounded-lg transition-colors',
                  input.trim() && !isLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}