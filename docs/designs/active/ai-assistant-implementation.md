# AI Assistant Implementation Design

## Status: DESIGN PHASE
**Date**: January 10, 2025
**Author**: Claude Code + Human Review Required

---

## 1. DESIGN PHASE - Comprehensive Technical Exploration

### 1.1 Overview
Transform the current AI Assistant stub into a fully functional, context-aware assistant powered by Google Gemini that helps users navigate the Maix platform, manage tasks, find projects, and get intelligent assistance.

### 1.2 Architecture Options

#### Option A: Server-Side Processing (Traditional)
**Architecture**: Client → Next.js API Route → Gemini API → Response

**Pros**:
- ✅ API key security (never exposed to client)
- ✅ Full control over prompts and context injection
- ✅ Can access database for context enrichment
- ✅ Rate limiting and usage tracking on server
- ✅ Can implement response caching
- ✅ Easier to add authentication/authorization

**Cons**:
- ❌ Higher server costs (Vercel function execution time)
- ❌ Added latency (extra hop)
- ❌ Potential for server overload
- ❌ More complex streaming implementation

**Implementation Approach**:
```typescript
// API Route: /api/ai/chat
export async function POST(req: Request) {
  const session = await getServerSession()
  const { message, context } = await req.json()
  
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const enrichedContext = await enrichContextFromDB(context, session)
  
  const result = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: buildPrompt(message, enrichedContext),
  })
  
  return Response.json({ response: result.text })
}
```

#### Option B: Client-Side with Server Proxy (Hybrid)
**Architecture**: Client → Next.js API (auth only) → Client-side Gemini call

**Pros**:
- ✅ Lower server costs
- ✅ Real-time streaming easier
- ✅ Reduced server load
- ✅ API key still secure (proxy endpoint)

**Cons**:
- ❌ Limited context enrichment
- ❌ Harder to implement rate limiting
- ❌ Client needs to manage conversation state
- ❌ Potential for prompt manipulation

#### Option C: Edge Functions with Streaming
**Architecture**: Client → Edge Function → Gemini API (streaming)

**Pros**:
- ✅ Best performance (edge locations)
- ✅ Native streaming support
- ✅ Lower costs than serverless functions
- ✅ Good security model

**Cons**:
- ❌ Limited runtime (can't access full Node.js APIs)
- ❌ Database access more complex
- ❌ Debugging can be harder

**Recommended**: **Option A (Server-Side)** for initial implementation
- **Rationale**: Security, control, and ability to enrich context from database outweigh the cons
- **Simplification Opportunity**: Start without streaming, add later if needed

### 1.3 Library Comparison

#### @google/genai (Already Installed)
**Pros**:
- ✅ Official Google SDK
- ✅ Already in project
- ✅ Direct Gemini access
- ✅ Good TypeScript support

**Cons**:
- ❌ No built-in conversation management
- ❌ No streaming helpers for Next.js
- ❌ Manual prompt engineering

#### Vercel AI SDK
**Pros**:
- ✅ Built for Next.js
- ✅ Streaming out of the box
- ✅ React hooks for UI
- ✅ Provider agnostic

**Cons**:
- ❌ Another dependency
- ❌ Abstraction layer overhead
- ❌ May not support latest Gemini features

#### LangChain
**Pros**:
- ✅ Rich ecosystem
- ✅ Advanced features (agents, chains)
- ✅ Memory management

**Cons**:
- ❌ Heavy dependency
- ❌ Overkill for our needs
- ❌ Learning curve

**Recommended**: **@google/genai** with custom helpers
- **Rationale**: Already installed, direct control, no abstraction overhead
- **Simplification**: Build only what we need, avoid framework lock-in

### 1.4 Feature Scope

#### Core Features (MVP)
1. **Contextual Chat**
   - Page-aware responses
   - User session context
   - Recent activity awareness

2. **Action Capabilities**
   - Search projects/products
   - Create/update todos
   - Navigate to pages
   - Answer questions about platform

3. **Smart Suggestions**
   - Context-based prompts
   - Quick actions based on current page
   - Proactive assistance

#### Advanced Features (Future)
- Voice input/output
- Multi-modal (image understanding)
- Conversation history persistence
- Custom user preferences
- Integration with notifications

**Simplification**: Focus on text-based chat with basic actions first

### 1.5 Context Management Strategy

#### Context Sources
1. **Static Context**
   - Current page/route
   - User role and permissions
   - Platform capabilities

2. **Dynamic Context**
   - Recent user activities
   - Current projects/todos
   - Unread notifications

3. **Conversation Context**
   - Message history (last 10 messages)
   - Previous actions taken
   - User preferences

#### Context Injection Approach
```typescript
interface AIContext {
  page: {
    path: string
    title: string
    capabilities: string[]
  }
  user: {
    name: string
    role: string
    recentProjects: Project[]
    activeTodos: Todo[]
  }
  conversation: {
    history: Message[]
    sessionId: string
  }
}
```

### 1.6 Action System Design

#### Action Types
```typescript
type AIAction = 
  | { type: 'navigate', path: string }
  | { type: 'create_todo', title: string, description?: string }
  | { type: 'search', query: string, filters?: SearchFilters }
  | { type: 'show_info', data: any }
  | { type: 'execute_command', command: string }
```

#### Function Calling vs Response Parsing
**Option 1: Gemini Function Calling**
```typescript
const tools = [{
  functionDeclarations: [{
    name: 'navigate',
    description: 'Navigate to a page',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' }
      }
    }
  }]
}]
```

**Option 2: Structured Response Parsing**
```typescript
// Train model to respond with JSON
const response = await genAI.models.generateContent({
  contents: prompt + '\nRespond with JSON: {text: string, action?: Action}',
})
```

**Recommended**: Start with structured response parsing, migrate to function calling later

### 1.7 Security Considerations

1. **API Key Management**
   - Store in environment variables
   - Never expose to client
   - Rotate regularly

2. **Input Validation**
   - Sanitize user inputs
   - Prevent prompt injection
   - Limit message length

3. **Rate Limiting**
   - Per-user limits
   - Implement backoff
   - Track usage

4. **Content Filtering**
   - Use Gemini's built-in safety settings
   - Additional content validation
   - Audit logs

### 1.8 Performance Optimization

1. **Caching Strategy**
   - Cache common queries
   - Store conversation context in Redis/memory
   - Implement TTL for responses

2. **Model Selection**
   - Use gemini-2.0-flash for simple queries
   - Use gemini-2.5-pro for complex reasoning
   - Dynamic model selection based on query complexity

3. **Response Streaming**
   - Implement SSE for real-time responses
   - Progressive rendering
   - Chunked responses

### 1.9 Testing Strategy

1. **Unit Tests**
   - Prompt building logic
   - Context enrichment
   - Action parsing

2. **Integration Tests**
   - API endpoint tests
   - Mock Gemini responses
   - Error handling

3. **E2E Tests**
   - User interaction flows
   - Action execution
   - Context awareness

### 1.10 Open Questions for Alignment

#### Tier 1: Critical (Must answer before Plan phase)
1. **Q: Should the AI have write access to create/modify data?**
   - Option A: Read-only assistant (safer)
   - Option B: Full CRUD capabilities (more useful)
   - **Awaiting Decision**

2. **Q: How should we handle conversation history?**
   - Option A: Session-only (privacy-focused)
   - Option B: Persistent storage (better UX)
   - Option C: User choice (complex but flexible)
   - **Awaiting Decision**

3. **Q: What's our monthly budget for Gemini API costs?**
   - Affects model selection and rate limits
   - Need to plan for scaling
   - **Awaiting Decision**

4. **Q: Should AI responses include citations/sources?**
   - Important for trust and verification
   - Adds complexity to implementation
   - **Awaiting Decision**

#### Tier 2: Important (Can decide during implementation)
1. **Q: Should we support voice input?**
   - Enhances accessibility
   - Additional complexity

2. **Q: How many conversation turns to maintain in context?**
   - Affects token usage and costs
   - 10 messages suggested as default

3. **Q: Should AI proactively suggest actions?**
   - Could be helpful or annoying
   - Needs user research

#### Tier 3: Deferrable (Can decide later)
1. **Q: Support for multiple languages?**
2. **Q: Custom AI personalities/tones?**
3. **Q: Export conversation history?**

### 1.11 Proposed Simplifications

1. **SIMPLIFICATION: No streaming in MVP** ✅
   - **Rationale**: Significantly reduces complexity
   - **Trade-off**: Slightly worse UX for long responses
   - **Benefit**: Ship faster, add streaming later

2. **SIMPLIFICATION: No conversation persistence initially** ✅
   - **Rationale**: Avoids privacy concerns and storage complexity
   - **Trade-off**: Users lose context on page refresh
   - **Benefit**: Simpler implementation, can add later

3. **SIMPLIFICATION: Single model (gemini-2.0-flash) for all queries** ✅
   - **Rationale**: Predictable costs and behavior
   - **Trade-off**: May not be optimal for complex queries
   - **Benefit**: Simpler to implement and monitor

4. **SIMPLIFICATION: Text-only responses (no rich cards/embeds)** ✅
   - **Rationale**: Reduces UI complexity
   - **Trade-off**: Less visually engaging
   - **Benefit**: Faster to implement and test

5. **SIMPLIFICATION: No function calling, use JSON responses** ✅
   - **Rationale**: Simpler to debug and control
   - **Trade-off**: Slightly less reliable action detection
   - **Benefit**: Full control over action execution

### 1.12 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API costs exceed budget | Medium | High | Implement strict rate limits, monitor usage |
| Prompt injection attacks | Medium | High | Input sanitization, output validation |
| Poor response quality | Low | Medium | Careful prompt engineering, user feedback |
| Slow response times | Medium | Medium | Caching, model selection, timeout handling |
| Database context queries slow | Low | Medium | Optimize queries, implement caching |

### 1.13 Success Metrics

1. **Performance Metrics**
   - Response time < 2 seconds (p95)
   - Error rate < 1%
   - Uptime > 99.9%

2. **Usage Metrics**
   - Daily active users
   - Messages per session
   - Action completion rate

3. **Quality Metrics**
   - User satisfaction (thumbs up/down)
   - Action accuracy rate
   - Context relevance score

### 1.14 Alternative Approaches Considered

#### Alternative 1: Use OpenAI Instead of Gemini
- **Pros**: Better function calling, more mature
- **Cons**: More expensive, requires different SDK
- **Decision**: Stick with Gemini per requirements

#### Alternative 2: Build Custom LLM Fine-tune
- **Pros**: Perfect for our use case
- **Cons**: Extremely complex and expensive
- **Decision**: Not viable for current scale

#### Alternative 3: Use Pre-built Chat Widget (Intercom, etc.)
- **Pros**: Fast to implement
- **Cons**: Less control, monthly fees, not integrated
- **Decision**: Build custom for better integration

---

## 2. ALIGN PHASE - Awaiting Human Decisions

This section will be completed after human review of the Design phase.

### Decisions Required:

1. **Architecture Choice**: 
   - [ ] Confirm Option A (Server-Side Processing)
   - [ ] Or select alternative approach

2. **Feature Scope**:
   - [ ] Approve MVP feature list
   - [ ] Add/remove features

3. **Simplifications**:
   - [ ] Accept proposed simplifications
   - [ ] Modify simplification strategy

4. **Critical Questions** (Tier 1):
   - [ ] AI write access decision
   - [ ] Conversation history approach
   - [ ] Monthly budget for API
   - [ ] Citation requirement

5. **Risk Acceptance**:
   - [ ] Accept identified risks
   - [ ] Request additional mitigations

---

## 3. PLAN PHASE - To Be Completed After Alignment

## 4. PRODUCE PHASE - To Be Completed After Planning

## 5. EVALUATE PHASE - To Be Completed After Production

## 6. REFINE PHASE - To Be Completed After Evaluation