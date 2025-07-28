# Causemon Phase 2: Simplified Gemini Integration

## Scope
Implement core search functionality with Gemini grounding to find and store public figure statements.

## Key Components (Simplified)

### 1. Update Monitor Model
Add tracking field to Monitor:
```prisma
model Monitor {
  // ... existing fields ...
  lastSearchedAt  DateTime? // Track last successful search
}
```

### 2. Search Service (`/src/lib/causemon/search-service.ts`)
Simple wrapper around Gemini with grounding:

```typescript
export async function searchForEvents(
  monitor: Monitor & { publicFigure: PublicFigure; topic: Topic }
): Promise<SearchResult> {
  const prompt = buildSearchPrompt(monitor);
  const result = await callGeminiWithGrounding(prompt);
  return parseAndValidateResult(result);
}
```

### 3. Event Processor (`/src/lib/causemon/event-processor.ts`)
Store results with basic deduplication:

```typescript
export async function processSearchResults(
  results: SearchResult,
  monitorId: string
): Promise<void> {
  for (const event of results.events) {
    // Simple deduplication
    const eventHash = createHash('md5')
      .update(event.title + event.eventDate + results.publicFigureId)
      .digest('hex');
    
    const existing = await prisma.event.findUnique({
      where: { deduplicationHash: eventHash }
    });
    
    if (!existing) {
      await createEventWithArticles(event);
    }
  }
  
  // Update monitor
  await prisma.monitor.update({
    where: { id: monitorId },
    data: { lastSearchedAt: new Date() }
  });
}
```

### 4. Manual Trigger Endpoint (`/src/app/api/causemon/monitors/[id]/search/route.ts`)
Start with manual trigger before implementing cron:

```typescript
export async function POST(request, { params }) {
  const { id } = await params;
  
  // Check if enough time has passed (24 hours)
  const monitor = await getMonitorWithCheck(id, session.user.id);
  if (monitor.lastSearchedAt && 
      Date.now() - monitor.lastSearchedAt.getTime() < 24 * 60 * 60 * 1000) {
    return NextResponse.json({ 
      error: 'Please wait 24 hours between searches' 
    }, { status: 429 });
  }
  
  try {
    const results = await searchForEvents(monitor);
    await processSearchResults(results, monitor.id);
    return NextResponse.json({ success: true, eventsFound: results.events.length });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
```

### 5. Simple Event Display
Update existing events page to show results:
- List events chronologically
- Group by date
- Show all sources per event
- No filtering or scoring initially

## Implementation Checklist

1. **Database Changes**:
   - [ ] Add `lastSearchedAt` to Monitor model
   - [ ] Add `deduplicationHash` to Event model
   - [ ] Run migration

2. **Core Functions**:
   - [ ] Create Gemini prompt builder
   - [ ] Implement Gemini API call with grounding
   - [ ] Add Zod schema for response validation
   - [ ] Build event processor with deduplication

3. **API Endpoints**:
   - [ ] Create manual search trigger endpoint
   - [ ] Update events endpoint to include articles

4. **UI Updates**:
   - [ ] Add "Search Now" button to monitors
   - [ ] Update events page to show results
   - [ ] Add loading states

5. **Testing**:
   - [ ] Test with real Gemini API
   - [ ] Verify deduplication works
   - [ ] Check 24-hour throttling

## Gemini Configuration

```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  tools: [{
    googleSearchRetrieval: {}
  }],
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 4096,
  }
});
```

## Simplified Prompt

```typescript
function buildSearchPrompt(monitor): string {
  const { publicFigure, topic } = monitor;
  const afterDate = monitor.lastSearchedAt 
    ? `after:${monitor.lastSearchedAt.toISOString().split('T')[0]}`
    : 'from the last 7 days';
  
  return `
Search for recent content ${afterDate} where ${publicFigure.name} 
discussed ${topic.name}.

Find speeches, interviews, statements, or official communications.

Return as JSON:
{
  "events": [{
    "title": "Event description",
    "eventDate": "YYYY-MM-DD",
    "summary": "What was said",
    "quotes": ["Direct quote 1", "Direct quote 2"],
    "sources": [{
      "url": "https://...",
      "publisher": "Source Name",
      "headline": "Article Title"
    }]
  }]
}

Only include events where ${publicFigure.name} actually spoke about ${topic.name}.
`;
}
```

## Cost Control
- Log token usage and estimated cost per search
- Global limit of 100 searches per day
- 24-hour minimum between searches per monitor

## Error Handling
- 3 retry attempts with exponential backoff
- Log all errors with full context
- Return user-friendly error messages

## Success Metrics
- Searches complete in <30 seconds
- <5% error rate
- Relevant results (manual verification)
- Cost <$0.10 per search

This simplified approach focuses on core functionality while maintaining quality and reliability.