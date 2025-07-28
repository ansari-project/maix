# Causemon Phase 2: Gemini with Grounding Integration Design

## Overview
Phase 2 implements the core search and analysis functionality using Gemini's grounding capabilities to find and analyze public figure statements about specific topics.

## Key Components

### 1. Search Service (`/src/lib/causemon/search.service.ts`)
Responsible for executing searches using Gemini with grounding.

```typescript
interface SearchRequest {
  publicFigure: PublicFigure;
  topic: Topic;
  dateRange: {
    from: Date;
    to: Date;
  };
}

interface SearchResult {
  events: Array<{
    title: string;
    eventDate: Date;
    summary: string;
    quotes: string[];
    sources: Array<{
      url: string;
      publisher: string;
      publishedAt: Date;
      headline: string;
    }>;
  }>;
}
```

**Key Design Decisions:**
- Single Gemini call with grounding to search AND analyze
- Returns structured data ready for database storage
- Handles multiple sources per event (deduplication)
- Date range filtering for incremental searches

### 2. Event Processing Pipeline (`/src/lib/causemon/event.processor.ts`)
Transforms search results into database entities.

```typescript
interface EventProcessor {
  processSearchResults(
    searchResult: SearchResult,
    monitor: Monitor
  ): Promise<void>;
}
```

**Processing Steps:**
1. Deduplicate events by content similarity
2. Create/update Event records
3. Create Article records for each source
4. Link to monitor's public figure and topic
5. Track processing metadata

### 3. Cron Job Handler (`/src/app/api/causemon/cron/search/route.ts`)
Scheduled job that runs searches for all active monitors.

**Execution Flow:**
1. Get all active monitors
2. Group by search parameters to minimize API calls
3. Execute searches with rate limiting
4. Process results into database
5. Track execution metrics

**Error Handling:**
- Retry failed searches with exponential backoff
- Continue processing other monitors if one fails
- Log errors for manual review
- Send alert emails for critical failures

### 4. Event Viewing UI (`/src/app/causemon/events/page.tsx`)
Display events found by monitors.

**Features:**
- Timeline view of events
- Group by date or topic
- Expand to see all sources
- Filter by monitor
- Export capability

## Technical Architecture

### Gemini Grounding Configuration
```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  tools: [{
    googleSearchRetrieval: {
      dynamicRetrievalConfig: {
        mode: 'MODE_DYNAMIC',
        dynamicThreshold: 0.3  // Adjust based on testing
      }
    }
  }],
  generationConfig: {
    temperature: 0.2,  // Low for factual accuracy
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  }
});
```

### Prompt Engineering
```typescript
const searchPrompt = `
Search for recent statements, speeches, interviews, or official communications 
where ${publicFigure.name} (also known as: ${publicFigure.aliases.join(', ')}) 
discussed ${topic.name} (related keywords: ${topic.keywords.join(', ')}).

Time period: ${dateRange.from} to ${dateRange.to}

For each relevant finding, extract:
1. Event title (what happened - speech, interview, statement, etc.)
2. Event date (when it occurred)
3. Summary (2-3 sentences of what was said about the topic)
4. Direct quotes (exact words used, especially about ${topic.name})
5. Sources (URL, publisher name, article headline, publish date)

Group multiple articles about the same event together.

Return as structured JSON matching this schema:
{
  "events": [{
    "title": string,
    "eventDate": string (ISO date),
    "summary": string,
    "quotes": string[],
    "sources": [{
      "url": string,
      "publisher": string,
      "headline": string,
      "publishedAt": string (ISO date)
    }]
  }]
}

Only include events where ${publicFigure.name} actually spoke about ${topic.name}.
Exclude events where they were merely mentioned or where others spoke about them.
`;
```

### Database Queries

**Efficient Event Storage:**
```typescript
// Check for existing events to avoid duplicates
const existingEvent = await prisma.event.findFirst({
  where: {
    publicFigureId: monitor.publicFigureId,
    topicId: monitor.topicId,
    eventDate: eventDate,
    title: title
  }
});

if (!existingEvent) {
  // Create new event with articles
  await prisma.event.create({
    data: {
      publicFigureId: monitor.publicFigureId,
      topicId: monitor.topicId,
      title,
      eventDate,
      summary,
      quotes,
      articles: {
        create: sources.map(source => ({
          headline: source.headline,
          sourceUrl: source.url,
          sourcePublisher: source.publisher,
          publishedAt: source.publishedAt,
          content: summary // Store summary as content for now
        }))
      }
    }
  });
}
```

### Rate Limiting & Cost Control
- Limit to 100 searches per day initially
- Cache search results for 24 hours
- Batch similar searches when possible
- Track token usage per search
- Set up billing alerts

### Error Scenarios
1. **Gemini API Errors**: Retry with backoff, fallback to next monitor
2. **No Results Found**: Log as successful search with 0 events
3. **Malformed Response**: Log for debugging, skip event
4. **Database Errors**: Retry transaction, alert if persistent
5. **Rate Limits**: Queue for later execution

## Implementation Steps

1. **Search Service**
   - Create Gemini client wrapper with error handling
   - Implement search prompt builder
   - Add response parser with validation
   - Create search result cache

2. **Event Processor**
   - Build deduplication logic
   - Implement database transactions
   - Add processing metrics
   - Create error recovery

3. **Cron Infrastructure**
   - Set up Vercel cron configuration
   - Implement job scheduler
   - Add monitoring and alerts
   - Create manual trigger endpoint

4. **UI Components**
   - Build event timeline component
   - Add filtering and search
   - Implement infinite scroll
   - Create event detail modal

## Testing Strategy

### Unit Tests
- Search prompt generation
- Response parsing
- Event deduplication
- Database operations

### Integration Tests
- Full search pipeline
- Cron job execution
- Error handling paths
- Rate limiting

### Manual Testing
- Various public figures and topics
- Different date ranges
- Edge cases (no results, errors)
- UI responsiveness

## Success Metrics
- Search accuracy (relevant results)
- Processing speed (<30s per monitor)
- Error rate (<5%)
- Cost per search (<$0.10)
- User satisfaction with results

## Security Considerations
- Validate all user inputs
- Sanitize Gemini responses
- Rate limit by user
- Monitor for abuse
- Secure cron endpoints

## Future Optimizations
- Parallel search execution
- Smart caching strategies
- Incremental searches
- Result quality scoring
- User feedback loop