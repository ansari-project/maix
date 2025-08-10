# AI Assistant - Alignment Decisions Summary

## MWK's Decisions from Comments

### Key Requirements
- **Streaming is REQUIRED** - Must have streaming responses
- **ALL MCP tools available** - Not limited subset
- **Go straight to Phase 3** - Skip phases 1 and 2, full integration immediately
- **Conversations must persist** - Always persist (Option C)

### Simplification Decisions

| Option | Decision | Notes |
|--------|----------|-------|
| 1. No Conversation Persistence | **REJECT** | Must persist conversations |
| 2. Single Model Only | **ACCEPT** | But use Gemini-2.5-Flash (not 1.5) |
| 3. No Streaming | **REJECT** | Streaming required |
| 4. Fixed Context (5 msgs) | **REJECT** | Need more context |
| 5. No MCP Tool Explanations | **REJECT** | AI should explain tool usage |
| 6. No Caching | **ACCEPT** | No caching needed |
| 7. No Rate Limiting | **ACCEPT** | Don't worry about rate limiting for MVP |
| 8. No Error Recovery | **REJECT** | Need proper error handling |
| Meta: Accept ALL | **REJECT** | Use selective approach |

### Open Questions Decisions

#### Tier 1 (Critical):
1. **Write access**: Option B - Full access from day one
2. **MCP failures**: Option A - Fail gracefully with user-friendly message  
3. **Persistence**: Option C - Always persist
4. **Budget**: "Don't worry about it"

#### Tier 2 (Important):
1. **Tool explanations**: Yes - AI should explain
2. **Context turns**: After 20 turns, summarize
3. **Cache responses**: No caching

#### Tier 3 (Deferrable):
1. **Multi-language**: No
2. **Voice**: No
3. **Export**: No

### Items to Remove (MWK: "Overkill for MVP")
- Prompt injection prevention
- Rate limiting
- Context enrichment strategy
- Security considerations (MWK: "I don't really care about this")
- Risk mitigation (MWK: "Not worried about these")
- Success metrics (MWK: "Not worried about these")

### Technical Feedback
- **Bad ideas to avoid**:
  - Intent detection → Direct MCP calls (Option 2)
  - Hybrid with tool descriptions returning JSON (Option 3)
- **Merge designs**: Events should adopt the AIConversation stack
- **MCP connection**: Check if there's a way to connect MCP to Gemini directly
- **Alternative**: Check if Anthropic is better for MCP integration

### Summary of Final Direction
1. Use Gemini-2.5-Flash (single model)
2. Streaming is mandatory
3. Full MCP tool access from start (Phase 3)
4. Always persist conversations
5. AI explains what tools it's using
6. After 20 turns, summarize context
7. No caching, no rate limiting for MVP
8. Proper error handling (not generic messages)
9. Don't worry about security/budget for now