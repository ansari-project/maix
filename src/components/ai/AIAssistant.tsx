'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useLayout } from '@/contexts/LayoutContext'
import { cn } from '@/lib/utils'
import { 
  Bot, 
  X, 
  Minimize2, 
  Send,
  Loader2
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIAssistant() {
  const { isAIExpanded, toggleAI, currentPath } = useLayout()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getContextualResponse(input, currentPath),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000)
  }

  // Context-aware placeholder based on current page
  const getPlaceholder = () => {
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

  // Mock contextual responses based on page
  const getContextualResponse = (query: string, path: string): string => {
    const lowerQuery = query.toLowerCase()
    
    if (path.includes('projects')) {
      if (lowerQuery.includes('create') || lowerQuery.includes('new')) {
        return "I can help you create a new project. What type of project are you planning? I can guide you through setting up the details."
      }
      if (lowerQuery.includes('find') || lowerQuery.includes('search')) {
        return "I'll help you find relevant projects. You can search by skills, technology stack, or impact area. What are you looking for?"
      }
    }
    
    if (path.includes('todos')) {
      if (lowerQuery.includes('priority') || lowerQuery.includes('urgent')) {
        return "Here are your highest priority tasks:\n1. Review PR feedback (Due today)\n2. Update documentation (Due tomorrow)\n3. Team meeting prep (Due this week)"
      }
      if (lowerQuery.includes('add') || lowerQuery.includes('create')) {
        return "I'll help you add a new task. What would you like to add to your todo list?"
      }
    }
    
    // Default response
    return "I understand you're asking about: " + query + ". I'm here to help with projects, tasks, and navigation. What specific information do you need?"
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-background border-t border-border transition-all duration-300 z-40',
        isAIExpanded ? 'h-[25vh] min-h-[200px]' : 'h-12'
      )}
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
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              <span className="font-medium">AI Assistant</span>
              <span className="text-sm text-muted-foreground">- {currentPath === '/' ? 'Home' : currentPath.slice(1)}</span>
            </div>
            <div className="flex items-center gap-2">
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 ? (
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
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
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