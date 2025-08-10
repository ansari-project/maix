# AI Assistant Implementation Plan - Final

## Status: PLAN PHASE COMPLETE
**Date**: January 10, 2025  
**Author**: Claude Code + MWK Decisions  
**Based on**: Final aligned design + MWK plan feedback  

---

## Implementation Strategy

Based on the aligned design decisions, we'll implement a full-featured AI Assistant using:
- **Gemini-2.5-Flash** as the single model
- **Vercel AI SDK** for streaming responses  
- **Dynamic MCP tool discovery** - Query tools at runtime, no hardcoded schemas
- **Persistent conversations** (simplified - no summarization for MVP)
- **Minimal complexity** - Skip deployment strategy, monitoring, performance requirements

---

## Phase Structure Overview

The implementation follows DAPPER's ITRC structure. Each phase includes:
- **I (Implement)**: Build the functionality
- **T (Test)**: Write and run comprehensive tests  
- **R (Review)**: Code review using mcp__zen__codereview
- **C (Commit & Push)**: Git commit and push after ITRC complete

---

## Phase 1: Core Infrastructure Setup
**Deliverable**: Database schema, API route foundation

### Phase 1-I: Implement
1. **Database Schema**:
   ```sql
   -- Create AIConversation table
   model AIConversation {
     id          String   @id @default(cuid())
     userId      String
     title       String?  // Auto-generated from first message
     messages    Json     // Array of messages with roles
     metadata    Json?    // Tool usage stats, etc.
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     lastActiveAt DateTime
     
     user User @relation(fields: [userId], references: [id])
     
     @@index([userId, lastActiveAt])
   }
   ```

2. **API Route Foundation** (`/api/ai/chat/route.ts`):
   ```typescript
   import { streamText } from 'ai'
   import { google } from '@ai-sdk/google'
   import { getServerSession } from 'next-auth'
   
   export async function POST(request: NextRequest) {
     const session = await getServerSession(authOptions)
     if (!session) return unauthorized()
     
     const { messages, conversationId } = await request.json()
     
     // Load or create conversation
     const conversation = await loadOrCreateConversation(
       conversationId, 
       session.user.id
     )
     
     // TODO: Add dynamic MCP tool discovery
     // TODO: Implement streaming
     
     return new Response('Not implemented')
   }
   ```

3. **Conversation Service**:
   ```typescript
   // src/lib/services/ai-conversation.service.ts
   export class AIConversationService {
     async create(userId: string, title?: string): Promise<AIConversation>
     async findById(id: string, userId: string): Promise<AIConversation | null>
     async update(id: string, messages: Message[]): Promise<AIConversation>
     async addTurn(id: string, userMessage: string, assistantResponse: string): Promise<void>
   }
   ```

### Phase 1-T: Test
- Unit tests for conversation service
- Integration tests for database operations
- API route basic functionality tests

### Phase 1-R: Review
- Code review with mcp__zen__codereview focusing on database design and API structure

### Phase 1-C: Commit & Push
- Commit with ITRC evidence and push to remote

---

## Phase 2: Dynamic MCP Tool Discovery
**Deliverable**: Runtime tool discovery from MCP server (no hardcoded schemas)

### Phase 2-I: Implement

**Key Insight from Research**: MCP supports dynamic tool discovery via `tools/list` requests. We can query the MCP server at runtime to get available tools and their schemas.

1. **MCP Tool Discovery**:
   ```typescript
   // src/lib/ai/mcp-discovery.ts
   export class MCPToolDiscovery {
     async discoverTools(userId: string): Promise<ToolDefinition[]> {
       // Get user's MCP client
       const mcpClient = await this.getMCPClient(userId)
       
       // Query MCP server for available tools
       const toolsResponse = await mcpClient.request({
         method: 'tools/list',
         params: {}
       })
       
       // Convert MCP tool definitions to Vercel AI SDK format
       return toolsResponse.tools.map(tool => ({
         name: tool.name,
         description: tool.description,
         parameters: tool.inputSchema // Already in JSON Schema format
       }))
     }
   }
   ```

2. **Tool Execution**:
   ```typescript
   // src/lib/ai/mcp-executor.ts
   export class MCPToolExecutor {
     constructor(private userId: string) {}
     
     async execute(toolName: string, parameters: any): Promise<ToolResult> {
       const mcpClient = await this.getMCPClient(this.userId)
       
       try {
         const result = await mcpClient.request({
           method: 'tools/call',
           params: {
             name: toolName,
             arguments: parameters
           }
         })
         
         return {
           success: true,
           data: result.content
         }
       } catch (error) {
         return {
           success: false,
           error: error.message
         }
       }
     }
   }
   ```

3. **Integration with API Route**:
   ```typescript
   // Update /api/ai/chat/route.ts
   const toolDiscovery = new MCPToolDiscovery()
   const tools = await toolDiscovery.discoverTools(session.user.id)
   
   const result = await streamText({
     model: google('gemini-2.5-flash'),
     tools,
     // ... rest of configuration
   })
   ```

### Phase 2-T: Test
- Integration tests for MCP tool discovery
- Unit tests for tool execution
- Mock MCP server responses

### Phase 2-R: Review  
- Code review focusing on dynamic discovery logic

### Phase 2-C: Commit & Push
- Commit with ITRC evidence and push to remote

---

## Phase 3: Streaming Implementation
**Deliverable**: Working streaming responses with Vercel AI SDK

### Phase 3-I: Implement
1. **Streaming Configuration**:
   ```typescript
   const result = await streamText({
     model: google('gemini-2.5-flash'),
     messages: conversation.messages,
     tools,
     system: `You are the Maix AI Assistant. 
             You have access to all MCP tools for managing projects, products, posts, etc.
             Always explain which tools you're using and why.`,
     maxTokens: 2048,
     temperature: 0.7,
     onFinish: async ({ usage, finishReason, text }) => {
       await saveConversationTurn(conversation.id, {
         userMessage: messages[messages.length - 1],
         assistantResponse: text,
         toolsUsed: extractToolsUsed(text),
         usage
       })
     }
   })
   
   return result.toTextStreamResponse()
   ```

2. **Client-Side Streaming**:
   ```typescript
   // Update AI Assistant UI component
   const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
     api: '/api/ai/chat',
     onFinish: (message) => {
       // Update conversation state
     }
   })
   ```

### Phase 3-T: Test
- Streaming functionality tests
- Client-server integration tests
- Tool calling within streams

### Phase 3-R: Review
- Code review focusing on streaming implementation

### Phase 3-C: Commit & Push
- Commit with ITRC evidence and push to remote

---

## Phase 4: Simple Context Management  
**Deliverable**: Basic conversation persistence (no summarization)

**MWK Decision**: Keep it simple - no summarization for MVP

### Phase 4-I: Implement
1. **Simple Context Handling**:
   ```typescript
   async function prepareContext(messages: Message[]): Promise<Message[]> {
     // For MVP: Just return all messages as-is
     // No summarization, no token limits
     return messages
   }
   ```

2. **Conversation Persistence**:
   ```typescript
   // Simple save/load without complex context management
   async function saveConversationTurn(conversationId: string, turn: ConversationTurn) {
     await prisma.aiConversation.update({
       where: { id: conversationId },
       data: {
         messages: { push: turn },
         lastActiveAt: new Date()
       }
     })
   }
   ```

### Phase 4-T: Test
- Context preparation tests  
- Simple persistence tests

### Phase 4-R: Review
- Code review focusing on persistence logic

### Phase 4-C: Commit & Push
- Commit with ITRC evidence and push to remote

---

## Phase 5: Error Handling & Polish
**Deliverable**: Graceful error handling and production-ready code

### Phase 5-I: Implement
1. **Error Handling**:
   ```typescript
   async function handleToolError(error: any, toolName: string): Promise<ToolResult> {
     console.error(`MCP tool error in ${toolName}:`, error)
     
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
     
     return `I encountered an issue while ${getActionDescription(toolName)}. Please try again or contact support if this persists.`
   }
   ```

2. **UI Polish**:
   - Loading states
   - Error boundaries  
   - Responsive design
   - Dark mode support

### Phase 5-T: Test
- Error scenarios testing
- UI/UX testing
- End-to-end user workflows

### Phase 5-R: Review
- Final comprehensive code review

### Phase 5-C: Commit & Push
- Final commit with ITRC evidence and push to remote

---

## Phase 6: Site-wide UI Integration
**Deliverable**: AI Assistant available on ALL pages across the site

**MWK Decision**: AI Assistant should appear on all pages, not just dashboard.

### Phase 6-I: Implement
1. **AI Assistant UI Component**:
   ```typescript
   // src/components/ai/AIAssistant.tsx
   export function AIAssistant() {
     const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
       api: '/api/ai/chat'
     })
     
     return (
       <div className="flex flex-col h-full">
         <ChatMessages messages={messages} />
         <ChatInput 
           input={input}
           handleInputChange={handleInputChange}
           handleSubmit={handleSubmit}
           isLoading={isLoading}
         />
       </div>
     )
   }
   ```

2. **Site-wide Integration**:
   ```typescript
   // Update root layout to include AI Assistant on all pages
   // src/app/layout.tsx
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html>
         <body>
           <div className="min-h-screen flex">
             <div className="flex-1">
               <Header />
               <main>{children}</main>
             </div>
             <div className="w-80 border-l bg-card">
               <AIAssistant />
             </div>
           </div>
         </body>
       </html>
     )
   }
   ```

3. **Responsive Behavior**:
   ```typescript
   // Mobile: Collapsible sidebar
   // Desktop: Always visible sidebar
   // Tablet: Toggle visibility
   ```

### Phase 6-T: Test
- UI component tests
- Integration tests

### Phase 6-R: Review
- UI/UX code review

### Phase 6-C: Commit & Push
- Commit with ITRC evidence and push to remote

---

## Success Criteria (Simplified)

### Core Functional Requirements
- ✅ AI Assistant can dynamically discover and use all MCP tools
- ✅ Streaming responses work smoothly  
- ✅ Conversations persist and can be resumed
- ✅ Errors are handled gracefully
- ✅ UI is responsive and accessible

**MWK Decision**: "Don't worry about" performance requirements, quality metrics, risk management, and deployment strategy for MVP.

---

## Key Architectural Decisions

### Dynamic vs Static Tool Discovery
- ✅ **DECIDED**: Use MCP's `tools/list` for dynamic discovery
- ✅ **BENEFIT**: No hardcoded schemas, automatically includes new tools
- ✅ **IMPLEMENTATION**: Query MCP server at runtime, convert to Vercel AI SDK format

### Context Management Approach
- ✅ **DECIDED**: Keep it simple - no summarization for MVP
- ✅ **BENEFIT**: Less complexity, faster implementation
- ✅ **IMPLEMENTATION**: Store all messages, handle token limits later

### UI Placement Strategy
- ✅ **DECIDED**: Site-wide AI Assistant on ALL pages
- ✅ **IMPLEMENTATION**: Fixed sidebar on desktop, collapsible on mobile
- ✅ **BENEFIT**: Consistent AI access regardless of page context

---

## Dependencies

### External Services
- Gemini API access via `@ai-sdk/google`
- Vercel AI SDK for streaming
- Existing MCP server infrastructure

### Internal Dependencies  
- User authentication system
- Prisma database access
- Existing UI components (shadcn/ui)

---

## Next Steps

1. **Get expert review** of this plan (DAPPER requirement)
2. **Clarify UI placement** - dashboard-only or site-wide?
3. **Proceed to Produce phase** with ITRC implementation

This plan incorporates MWK's key insight about dynamic MCP tool discovery and simplification preferences while maintaining the DAPPER structure for systematic implementation.