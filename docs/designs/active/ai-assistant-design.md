# AI Assistant with MCP Integration - Final Design

## Status: ALIGN PHASE COMPLETE
**Date**: January 10, 2025
**Author**: Claude Code + MWK
**Decisions**: Aligned and Reconciled

---

## Executive Summary

Build a fully-featured AI Assistant using:
- **Gemini-2.5-Flash** as the single model
- **Streaming responses** via Vercel AI SDK
- **All MCP tools** available from day one
- **Persistent conversations** stored in database
- **No rate limiting or caching** for MVP
- **Proper error handling** with graceful failures

Skip phased approach - go directly to full implementation (former Phase 3).

---

## 1. DESIGN - Final Architecture

### 1.1 Core Decisions (Aligned)

**Architecture**: 
- Follow Event Assistant pattern at `/api/chat/events`
- Use Vercel AI SDK's `streamText` for streaming (per GPT-5 recommendation)
- All MCP tools available immediately (no phased rollout)
- Merge AIConversation stack with Event Assistant

**Model**: 
- [DECIDED] Single model: **Gemini-2.5-Flash** (not 1.5)
- No model selection UI needed
- Configure via environment variable for future updates

**Conversations**:
- [DECIDED] **Always persist** - All conversations saved to database
- No session-only mode
- After 20 turns, summarize older context to manage tokens

### 1.2 Architecture Flow (Simplified)

```
User Input → AI Assistant UI → /api/ai/chat endpoint
                                        ↓
                    Vercel AI SDK streamText with MCP tools
                                        ↓
                          Automatic tool selection & execution
                                        ↓
                        Stream response with tool explanations
                                        ↓
                                  Store in database
                                        ↓
                                Return to UI (streaming)
```

### 1.3 Implementation Approach

**Based on GPT-5 recommendations + MWK decisions:**

```typescript
// /api/ai/chat/route.ts
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

// ALL MCP tools available
const tools = {
  maix_manage_project: { /* ... */ },
  maix_search_projects: { /* ... */ },
  maix_manage_product: { /* ... */ },
  maix_search_products: { /* ... */ },
  maix_manage_post: { /* ... */ },
  maix_search_posts: { /* ... */ },
  maix_manage_comment: { /* ... */ },
  maix_search_comments: { /* ... */ },
  maix_manage_todo: { /* ... */ },
  maix_search_todos: { /* ... */ },
  maix_manage_organization: { /* ... */ },
  maix_manage_organization_member: { /* ... */ },
  maix_update_profile: { /* ... */ },
  maix_manage_personal_project: { /* ... */ },
  // ALL other MCP tools...
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return unauthorized()
  
  const { messages, conversationId } = await request.json()
  
  // Load or create conversation
  const conversation = await loadOrCreateConversation(
    conversationId, 
    session.user.id
  )
  
  // After 20 turns, summarize older messages
  const contextMessages = await prepareContext(conversation.messages)
  
  // Stream response with all tools available
  const result = await streamText({
    model: google('gemini-2.5-flash'), // Using 2.5 as decided
    messages: contextMessages,
    tools,
    system: `You are the Maix AI Assistant. 
            You have access to all MCP tools for managing projects, products, posts, etc.
            Always explain which tools you're using and why.`,
    maxTokens: 2048,
    temperature: 0.7,
    onFinish: async ({ usage, finishReason, text }) => {
      // Save to database (always persist)
      await saveConversationTurn(conversation.id, {
        userMessage: messages[messages.length - 1],
        assistantResponse: text,
        toolsUsed: extractToolsUsed(text),
        usage
      })
    }
  })
  
  return result.toTextStreamResponse()
}
```

### 1.4 Conversation Persistence

[DECIDED: Always persist - Option C]

```typescript
// Database schema for conversations
model AIConversation {
  id          String   @id @default(cuid())
  userId      String
  title       String?  // Auto-generated from first message
  messages    Json     // Array of messages with roles
  summary     String?  // After 20 turns, older context summarized
  metadata    Json?    // Tool usage stats, etc.
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastActiveAt DateTime
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, lastActiveAt])
}
```

### 1.5 Context Management

[DECIDED: After 20 turns, summarize]

```typescript
async function prepareContext(messages: Message[]): Promise<Message[]> {
  const TURN_LIMIT = 20
  
  if (messages.length <= TURN_LIMIT * 2) {
    return messages // No summarization needed
  }
  
  // Keep system message
  const systemMessage = messages[0]
  
  // Summarize older messages
  const olderMessages = messages.slice(1, -TURN_LIMIT * 2)
  const summary = await summarizeMessages(olderMessages)
  
  // Recent messages stay as-is
  const recentMessages = messages.slice(-TURN_LIMIT * 2)
  
  return [
    systemMessage,
    { role: 'system', content: `Previous context summary: ${summary}` },
    ...recentMessages
  ]
}
```

### 1.6 Error Handling

[DECIDED: Option A - Fail gracefully with user-friendly message]

```typescript
async function handleToolError(error: any, toolName: string): Promise<ToolResult> {
  console.error(`MCP tool error in ${toolName}:`, error)
  
  // User-friendly error messages
  const userMessage = getUserFriendlyError(error, toolName)
  
  return {
    success: false,
    error: userMessage,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  }
}

function getUserFriendlyError(error: any, toolName: string): string {
  if (error.code === 'PERMISSION_DENIED') {
    return "You don't have permission to perform this action."
  }
  if (error.code === 'NOT_FOUND') {
    return "I couldn't find what you're looking for."
  }
  if (error.code === 'NETWORK_ERROR') {
    return "There was a connection issue. Please try again."
  }
  
  // Generic but friendly
  return `I encountered an issue while ${getActionDescription(toolName)}. Please try again or contact support if this persists.`
}
```

### 1.7 Simplifications Accepted

Per MWK's decisions:

| Simplification | Status | Implementation |
|---------------|---------|---------------|
| Single Model (Gemini-2.5-Flash) | ✅ ACCEPTED | Use env var: `GEMINI_MODEL=gemini-2.5-flash` |
| No Caching | ✅ ACCEPTED | Direct MCP calls every time |
| No Rate Limiting | ✅ ACCEPTED | No quotas or limits for MVP |

### 1.8 Features Rejected as Simplifications

These will be implemented:

| Feature | Status | Implementation |
|---------|---------|---------------|
| Streaming | ✅ REQUIRED | Use Vercel AI SDK's streamText |
| Conversation Persistence | ✅ REQUIRED | Always save to database |
| Full Context | ✅ REQUIRED | Smart summarization after 20 turns |
| Tool Explanations | ✅ REQUIRED | AI explains its actions |
| Error Recovery | ✅ REQUIRED | Graceful failures with clear messages |

### 1.9 Removed from MVP

Per MWK's feedback - these are overkill:

- ❌ Prompt injection prevention
- ❌ Rate limiting
- ❌ Context enrichment (fetching user's recent activity)
- ❌ Complex security considerations
- ❌ Risk mitigation planning
- ❌ Success metrics tracking
- ❌ Budget monitoring

### 1.10 Technical Integration Points

**PAT Management**: 
- Follow GPT-5's advice: Use in-process tools with session auth
- No PAT complexity needed if tools run in-process
- If external MCP needed later, implement proper encryption (not hashing)

**Event Assistant Merge**:
- Both assistants should use same conversation infrastructure
- Share UI components
- Unified streaming approach

**MCP Direct Connection**:
- Research needed: Can MCP connect directly to Gemini?
- Alternative: Investigate Anthropic's MCP support
- For now: Use Vercel AI SDK as intermediary

---

## 2. ALIGNMENT OUTCOMES

### Decisions Summary

**Tier 1 Critical Decisions:**
1. ✅ **Write Access**: Full MCP write access from day one
2. ✅ **Error Handling**: Fail gracefully with user-friendly messages
3. ✅ **Persistence**: Always persist conversations
4. ✅ **Budget**: No budget constraints for MVP

**Tier 2 Important Decisions:**
1. ✅ **Tool Explanations**: Yes, AI explains tool usage
2. ✅ **Context Management**: Summarize after 20 turns
3. ✅ **Caching**: No caching needed

**Tier 3 Decisions:**
1. ✅ **Multi-language**: No
2. ✅ **Voice**: No
3. ✅ **Export**: No

### Key Technical Decisions

1. **Use Vercel AI SDK** (not direct Gemini SDK) - Better streaming and tool integration
2. **In-process MCP tools** - Avoid PAT complexity for MVP
3. **Single model configuration** - Gemini-2.5-Flash via env var
4. **Database-backed conversations** - Full persistence from start
5. **No phases** - Jump directly to full implementation

### Implementation Priority

1. Clone Event Assistant structure to `/api/ai/chat`
2. Implement all MCP tools with proper schemas
3. Add conversation persistence with database
4. Implement context summarization after 20 turns
5. Add graceful error handling
6. Ensure streaming works properly
7. Test with all MCP tools

---

## 3. NEXT STEPS

### Immediate Actions

1. **Create `/api/ai/chat` route** based on Event Assistant pattern
2. **Define all MCP tool schemas** using Zod
3. **Create database migration** for AIConversation table
4. **Implement context summarization** function
5. **Update AI Assistant UI** to support streaming

### Questions for Plan Phase

1. Should Event Assistant and AI Assistant share the same endpoint?
2. How to handle tool authorization (some tools need special permissions)?
3. Should we log all tool usage for debugging?
4. How to handle long-running MCP operations with streaming?

### Success Criteria

- AI Assistant can use all MCP tools
- Streaming responses work smoothly
- Conversations persist and can be resumed
- Errors are handled gracefully
- Context stays coherent even in long conversations

---

## Appendix: Implementation Notes

### Model Configuration
```env
# .env.local
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your-key-here
```

### Tool Definition Example
```typescript
const tools = {
  maix_manage_project: {
    description: 'Create or update a project',
    parameters: z.object({
      id: z.string().optional(),
      name: z.string(),
      description: z.string(),
      status: z.enum(['AWAITING_VOLUNTEERS', 'IN_PROGRESS', 'COMPLETED']).optional(),
      visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC')
    }),
    execute: async (params, { userId }) => {
      // Direct Prisma call - no PAT needed
      if (params.id) {
        return await prisma.project.update({
          where: { id: params.id },
          data: params
        })
      }
      return await prisma.project.create({
        data: { ...params, ownerId: userId }
      })
    }
  }
}
```

This design is now aligned with all decisions and ready for the Plan phase.