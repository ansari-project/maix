# AI Assistant with MCP Integration - GPT-5 Revised Design

## Status: DESIGN PHASE (GPT-5 REVISED)
**Date**: January 10, 2025
**Author**: Claude Code with GPT-5 Expert Review Integration

---

## Executive Summary (GPT-5 Perspective)

**Verdict**: MCP-first is the right direction for long-term maintainability and security. However, align the AI Assistant implementation with the existing Event Assistant execution model to avoid unnecessary complexity and satisfy streaming/observability from day one.

**Key Changes from Original**:
- Use Vercel AI SDK's `streamText` (not direct Gemini SDK)
- Align with Event Assistant's in-process tool pattern
- Fix PAT storage (encrypt, don't hash)
- Implement minimal quotas from day one

---

## 1. DESIGN PHASE - Aligned Architecture (GPT-5 Revised)

### 1.1 Overview
Transform the AI Assistant into a fully functional, context-aware assistant that **reuses the Event Assistant pattern** with Vercel AI SDK for consistent streaming, tool calling, and observability.

### 1.2 Core Architecture Decision

**REVISED APPROACH: Event Assistant Pattern with MCP Tools**

The AI Assistant will:
1. **Clone Event Assistant structure** at `/api/ai/chat`
2. Use **Vercel AI SDK's streamText** (not direct Gemini SDK)
3. Execute **in-process MCP tools** (not HTTP calls initially)
4. Leverage **session auth** (PATs only if truly needed for external MCP)

### 1.3 Architecture Flow (Revised)

```
User Input → AI Assistant UI → /api/ai/chat endpoint
                                        ↓
                        Vercel AI SDK streamText with tools
                                        ↓
                            Automatic tool selection via schemas
                                        ↓
                        In-process tool execution (userId from session)
                                        ↓
                            Stream response with tool results
                                        ↓
                                Return streamed response to UI
```

**Key Difference**: No manual JSON parsing, no PAT complexity for MVP

### 1.4 PAT Strategy (Revised)

**GPT-5 Finding**: Current design has fatal flaw - hashing PATs then trying to decrypt

**Two Options**:

#### Option A: In-Process Tools (RECOMMENDED for MVP)
```typescript
// Like Event Assistant - no PAT needed
const tools = {
  maix_manage_project: {
    schema: z.object({
      name: z.string(),
      description: z.string()
    }),
    handler: async ({ name, description }, { userId }) => {
      // Direct Prisma call with userId from session
      return await prisma.project.create({
        data: { name, description, ownerId: userId }
      })
    }
  }
}
```

#### Option B: External MCP with Proper Encryption
```typescript
// If truly need external MCP server
interface StoredPAT {
  hashedToken: string        // For lookup/validation
  encryptedToken: string     // For actual use (reversible)
  iv: string                 // Initialization vector
  salt: string              // Encryption salt
}

// Store both hash (for validation) and encrypted (for use)
const plainToken = generateSecureToken()
const hashedToken = await hashToken(plainToken)
const { encrypted, iv, salt } = await encryptToken(plainToken)
```

### 1.5 Tool Integration (Aligned with Event Assistant)

```typescript
// /api/ai/chat/route.ts - Following Event Assistant pattern
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

// Define tools with Zod schemas (automatic validation)
const tools = {
  maix_search_projects: {
    description: 'Search for projects',
    parameters: z.object({
      query: z.string().optional(),
      status: z.enum(['AWAITING_VOLUNTEERS', 'IN_PROGRESS', 'COMPLETED']).optional(),
      limit: z.number().default(10)
    }),
    execute: async (params, { userId }) => {
      return await searchProjects({ ...params, userId })
    }
  },
  maix_manage_project: {
    description: 'Create or update a project',
    parameters: z.object({
      id: z.string().optional(),
      name: z.string(),
      description: z.string(),
      visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC')
    }),
    execute: async (params, { userId }) => {
      // Phase 1: Return error for write operations
      if (!READ_ONLY_MODE) {
        return { error: 'Write operations not yet enabled' }
      }
      return await manageProject({ ...params, ownerId: userId })
    }
  }
  // ... all other MCP tools
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return unauthorized()
  
  const { messages } = await request.json()
  
  // Use streamText like Event Assistant does
  const result = await streamText({
    model: google('gemini-1.5-flash'), // Or use env var for model
    messages,
    tools,
    system: AI_ASSISTANT_SYSTEM_PROMPT,
    maxTokens: 2048,
    temperature: 0.7,
    onFinish: async ({ usage }) => {
      // Track usage for quotas
      await trackUsage(session.user.id, usage)
    }
  })
  
  return result.toTextStreamResponse()
}
```

### 1.6 Streaming Implementation (Critical Fix)

**Original Issue**: Used non-streaming `generateContent`
**GPT-5 Solution**: Use Vercel AI SDK's `streamText`

```typescript
// ❌ WRONG (Original)
const result = await genAI.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: enrichedPrompt
})

// ✅ CORRECT (GPT-5 Revised)
const result = await streamText({
  model: google('gemini-1.5-flash'),
  messages,
  tools,
  // Automatic streaming, tool calling, validation
})
```

### 1.7 Rate Limiting & Quotas (MANDATORY from Day 1)

**GPT-5 Strong Recommendation**: Don't launch without quotas

```typescript
// Simple in-memory quotas for MVP
class QuotaManager {
  private userQuotas = new Map<string, {
    tokens: number,
    requests: number,
    resetAt: Date
  }>()
  
  async checkQuota(userId: string): Promise<boolean> {
    const quota = this.userQuotas.get(userId)
    const now = new Date()
    
    if (!quota || quota.resetAt < now) {
      // Reset daily quota
      this.userQuotas.set(userId, {
        tokens: 0,
        requests: 0,
        resetAt: new Date(now.getTime() + 86400000) // 24 hours
      })
      return true
    }
    
    // Check limits
    if (quota.tokens > 100000) return false // 100k tokens/day
    if (quota.requests > 50) return false    // 50 requests/day
    
    return true
  }
  
  async trackUsage(userId: string, usage: { totalTokens: number }) {
    const quota = this.userQuotas.get(userId)
    if (quota) {
      quota.tokens += usage.totalTokens
      quota.requests += 1
    }
  }
}

// Global budget tracking
const MONTHLY_BUDGET = 300 // dollars
const COST_PER_1K_TOKENS = 0.002 // Gemini Flash pricing
let monthlySpend = 0

async function trackUsage(userId: string, usage: any) {
  const cost = (usage.totalTokens / 1000) * COST_PER_1K_TOKENS
  monthlySpend += cost
  
  if (monthlySpend > MONTHLY_BUDGET * 0.5) {
    // Alert at 50%
    await notifyAdmins('AI Assistant at 50% monthly budget')
  }
  
  if (monthlySpend > MONTHLY_BUDGET) {
    // Hard stop
    throw new Error('Monthly budget exceeded')
  }
}
```

### 1.8 Error Recovery (Minimal but Essential)

```typescript
// Retry wrapper for read operations only
async function retryReadTool(
  toolName: string,
  params: any,
  maxRetries = 2
): Promise<any> {
  let lastError
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const result = await tools[toolName].execute(params)
      return result
    } catch (error) {
      lastError = error
      
      // Only retry on transient errors
      if (!isTransientError(error) || i === maxRetries) {
        throw error
      }
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 100)
      )
    }
  }
  
  throw lastError
}

function isTransientError(error: any): boolean {
  // Network errors, timeouts, 5xx errors
  return error.code === 'ECONNRESET' ||
         error.code === 'ETIMEDOUT' ||
         (error.status >= 500 && error.status < 600)
}
```

### 1.9 Context Management (Fixed Window)

```typescript
// Simple sliding window for MVP
function truncateContext(messages: Message[]): Message[] {
  const MAX_MESSAGES = 10 // Last 5 exchanges
  const MAX_TOKENS = 30000 // Conservative limit
  
  // Always keep system message
  const system = messages[0]
  const conversation = messages.slice(1)
  
  // Take last N messages
  const truncated = conversation.slice(-MAX_MESSAGES)
  
  // TODO: Add token counting for more precise truncation
  
  return [system, ...truncated]
}
```

### 1.10 Simplified Options (GPT-5 Curated)

| Option | GPT-5 Recommendation | Rationale |
|--------|---------------------|-----------|
| 1. No conversation persistence | ✅ ACCEPT | Reduces complexity for MVP |
| 2. Single model (Flash) | ✅ ACCEPT | Use env var for easy switch |
| 3. No streaming | ❌ REJECT | Required for UX |
| 4. Fixed context (5 msgs) | ✅ ACCEPT | Simple, add token budget later |
| 5. No tool explanations | ✅ ACCEPT | Log server-side instead |
| 6. No caching | ✅ ACCEPT | Add micro-caching later |
| 7. No rate limiting | ❌ REJECT | MUST have quotas day 1 |
| 8. No error recovery | ❌ REJECT | Need minimal retry for reads |
| 9. Accept ALL | ❌ REJECT | Use curated set above |

### 1.11 Implementation Phases (Revised)

#### Phase 1: Read-Only Assistant (Week 1)
- Clone Event Assistant structure
- Implement read-only MCP tools
- Add streaming with Vercel AI SDK
- Implement basic quotas
- Session-only conversations

#### Phase 2: Basic Writes (Week 2)
- Enable create operations with confirmation
- Add idempotency keys
- Implement audit logging
- Add feature flags per user

#### Phase 3: Full Integration (Week 3)
- All MCP tools enabled
- Advanced context management
- Caching layer
- Production monitoring

### 1.12 Critical Implementation Steps

**Step 1**: Clone Event Assistant
```bash
cp src/app/api/chat/events/route.ts src/app/api/ai/chat/route.ts
# Modify system prompt and tools
```

**Step 2**: Decide Architecture
```typescript
// Option A: In-process (RECOMMENDED)
const tools = { /* direct handlers */ }

// Option B: External MCP
const tools = { /* HTTP client calls */ }
```

**Step 3**: Implement Quotas
```typescript
// Add QuotaManager from section 1.7
// Check quota before processing
// Track usage after completion
```

**Step 4**: Add Read-Only Guard
```typescript
const READ_ONLY_PHASE_1 = true

// In each write tool:
if (READ_ONLY_PHASE_1) {
  return { error: 'This action will be available soon' }
}
```

### 1.13 Risk Mitigation

| Risk | GPT-5 Assessment | Mitigation |
|------|------------------|------------|
| PAT confusion | CRITICAL | Use in-process or fix encryption |
| No streaming | HIGH | Use Vercel AI SDK from start |
| Cost overrun | HIGH | Quotas mandatory day 1 |
| Tool misuse | MEDIUM | Schema validation built-in |
| Context loss | LOW | Fixed window acceptable for MVP |

### 1.14 Success Metrics

1. **Performance**
   - First token < 500ms (streaming)
   - Full response < 3s
   - Tool execution < 2s

2. **Cost**
   - Stay under $300/month
   - Average session < $0.015
   - Per-user daily cap enforced

3. **Quality**
   - Tool selection accuracy > 95%
   - Error rate < 5%
   - User satisfaction > 4/5

### 1.15 Open Questions (Revised Priority)

#### Tier 1: Critical (Must answer before Plan phase)

1. **In-process vs External MCP?**
   - GPT-5 recommends in-process for MVP
   - Avoids PAT complexity
   - Faster, simpler, proven pattern

2. **Monthly budget?**
   - GPT-5 suggests $300 initial cap
   - Need alerts at 50%, 80%, 100%
   - Per-user limits essential

3. **Model selection?**
   - Start with gemini-1.5-flash
   - Make configurable via env var
   - Consider gemini-2.0-flash when stable

#### Tier 2: Important

1. **Conversation UI reuse?**
   - Merge AI Assistant and Event Assistant UIs?
   - Share conversation components?

2. **Monitoring strategy?**
   - OpenTelemetry from start?
   - Custom metrics?

#### Tier 3: Deferrable

1. **Multi-language support?**
2. **Voice input?**
3. **Export capabilities?**

---

## 2. ALIGN PHASE - Awaiting Human Decisions

### GPT-5 Strong Recommendations:

1. **MUST DO**:
   - [ ] Use Vercel AI SDK (not direct Gemini)
   - [ ] Implement quotas before launch
   - [ ] Start with in-process tools
   - [ ] Fix PAT storage if using external MCP

2. **SHOULD DO**:
   - [ ] Clone Event Assistant pattern
   - [ ] Add minimal retry for reads
   - [ ] Use env vars for model selection
   - [ ] Implement sliding context window

3. **NICE TO HAVE**:
   - [ ] Micro-caching for common queries
   - [ ] Advanced token budgeting
   - [ ] Conversation persistence option

---

## Expert Review Summary

### GPT-5 Key Insights:

1. **Alignment is Critical**: Your Event Assistant already solves these problems correctly. Don't reinvent.

2. **Streaming is Solved**: Vercel AI SDK handles streaming, tool calling, and validation in one package.

3. **PAT Complexity Unnecessary**: Start in-process. Add external MCP only if truly needed.

4. **Quotas Non-Negotiable**: Without quotas, you risk significant cost overruns.

5. **Simplicity Wins**: The curated simplifications create a solid MVP that can evolve.

### Next Steps:

1. Review this revised design
2. Make Tier 1 decisions
3. Choose simplification options
4. Proceed to Plan phase with clear direction

---

## Appendix: Key Code Comparisons

### Original Approach vs GPT-5 Revision:

```typescript
// ❌ ORIGINAL: Manual parsing, no streaming
const result = await genAI.generateContent(...)
const parsed = JSON.parse(result.text)
if (parsed.action) {
  await mcpClient.call(parsed.action, parsed.params)
}

// ✅ GPT-5: Automatic tools, streaming built-in
const result = await streamText({
  model: google('gemini-1.5-flash'),
  tools,  // Automatic validation & execution
  messages
})
return result.toTextStreamResponse()
```

### PAT Storage Fix:

```typescript
// ❌ ORIGINAL: Hash only (can't decrypt)
const hashedToken = await hashToken(plainToken)
// Later: await decryptToken(token.encryptedToken) // FAILS!

// ✅ GPT-5: Proper encryption
const { encrypted, iv, salt } = await encryptToken(plainToken)
// Later: await decryptToken(encrypted, iv, salt) // WORKS!
```

### Rate Limiting:

```typescript
// ❌ ORIGINAL: No rate limiting

// ✅ GPT-5: Mandatory quotas
if (!await quotaManager.checkQuota(userId)) {
  return { error: 'Daily limit reached' }
}
```

---

This revised design incorporates GPT-5's expert feedback while maintaining DAPPER compliance and addressing all critical implementation issues.