# Causemon Design Proposal

## Overview

Causemon is a monitoring system that tracks what public figures say about specific causes across various sources (media, government committees, hansard, press releases). It sends daily email updates to users about new statements and positions.

**Example use case**: Track what Anthony Albanese says about Palestine/Gaza in parliament, media, and committees

## Core Principles (Following MAIX Guidelines)

- **Keep it simple**: Start with basic monitoring, add complexity only when needed
- **Focus on current needs**: Daily email reports, not real-time dashboards
- **Use existing patterns**: Leverage MAIX's auth, database, and infrastructure
- **Avoid premature optimization**: Simple cron jobs, not complex streaming

## Technology Stack

### Same as MAIX (Reuse Infrastructure)
- **Framework**: Next.js 15 App Router
- **Database**: Neon PostgreSQL with Prisma
- **Authentication**: NextAuth.js (shared with MAIX)
- **Deployment**: Vercel
- **Email**: Resend (native Vercel integration, React Email support)

### AI-Specific Additions (Minimal)
- **Search & Analysis**: Gemini API with grounding (Google Search built-in)
- **Scheduling**: Vercel Cron Jobs
- **NO separate search API needed**: Gemini handles both search and analysis
- **NO LangGraph initially**: Start with simple API calls, add orchestration later if needed

## Database Schema (Prisma)

```prisma
// Extends existing MAIX schema

model Monitor {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  // What to monitor
  publicFigureId String
  publicFigure   PublicFigure @relation(fields: [publicFigureId], references: [id])
  topicId        String
  topic          Topic @relation(fields: [topicId], references: [id])
  
  // Settings
  isActive       Boolean  @default(true)
  emailFrequency String   @default("daily") // daily, weekly
  
  // Metadata
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@unique([organizationId, publicFigureId, topicId])
  @@index([userId])
  @@index([organizationId])
  @@index([isActive, emailFrequency])
}

model PublicFigure {
  id          String   @id @default(cuid())
  name        String
  title       String?  // e.g., "Prime Minister of Australia"
  imageUrl    String?
  
  // Search helpers
  aliases     String[] // ["Albo", "Anthony Albanese", "PM Albanese"]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  monitors    Monitor[]
  events      Event[]
  
  @@index([name])
}

model Topic {
  id          String   @id @default(cuid())
  name        String   // "Palestine"
  keywords    String[] // ["Gaza", "West Bank", "Palestinian", "Israel"]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  monitors    Monitor[]
  events      Event[]
  
  @@index([name])
}

model Event {
  id            String   @id @default(cuid())
  
  // What happened
  publicFigureId String
  publicFigure   PublicFigure @relation(fields: [publicFigureId], references: [id])
  topicId        String
  topic          Topic @relation(fields: [topicId], references: [id])
  
  // The event details
  title          String   // "PM speaks at UN about Gaza"
  summary        String   @db.Text // AI-generated summary across all articles
  eventDate      DateTime // When the event happened
  eventType      String   // "speech", "vote", "statement", "interview"
  
  // AI Analysis
  sentiment      String?  // positive, negative, neutral
  stance         String?  // supportive, opposed, neutral
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  // Relations
  articles       Article[] // Multiple articles can cover one event
  
  @@index([publicFigureId, topicId, eventDate])
}

model Article {
  id            String   @id @default(cuid())
  eventId       String
  event         Event    @relation(fields: [eventId], references: [id])
  
  // Article details
  headline       String
  sourceUrl      String   @unique
  sourceType     String   // "media", "hansard", "committee", "press_release"
  sourcePublisher String  // "The Guardian", "Parliament of Australia"
  publishedAt    DateTime
  
  // Content
  fullText       String?  @db.Text
  keyQuotes      Json?    // Array of important quotes
  
  // For deduplication
  contentHash    String   @unique
  
  createdAt      DateTime @default(now())
  
  @@index([eventId])
  @@index([sourceUrl])
  @@index([contentHash])
}

model EmailReport {
  id         String   @id @default(cuid())
  monitorId  String
  monitor    Monitor  @relation(fields: [monitorId], references: [id])
  
  // What was included (just tracking IDs, not relations)
  eventIds   String[] // Array of event IDs included
  eventCount Int      // For quick reference
  
  // Status
  sentAt     DateTime @default(now())
  status     String   @default("sent") // sent, failed, pending
  
  @@index([monitorId, sentAt])
}
```

## User Flow

1. **Setup Monitor**
   - User selects a public figure (or adds new one)
   - User selects a topic (or adds new one)
   - Monitor is created with daily email preference

2. **Daily Processing (Cron Job)**
   - For each active monitor:
     - Use Gemini with grounding to search for [Figure] + [Topic] from last 24h
     - Gemini returns analyzed results with key information extracted
     - Group related articles into events
     - Create or update events with the structured data

3. **Daily Email**
   - Aggregate all events for organization's monitors
   - Generate summary email with Gemini
   - Send via Resend API using React Email templates

## API Design

### Public API Routes
- `GET /api/causemon/public-figures` - List available figures
- `GET /api/causemon/topics` - List available topics

### Protected API Routes
- `POST /api/causemon/monitors` - Create new monitor
- `GET /api/causemon/monitors` - List user's monitors
- `DELETE /api/causemon/monitors/[id]` - Delete monitor
- `GET /api/causemon/events` - Get events for user's monitors
- `POST /api/causemon/monitors/[id]/test` - Test monitor (dry run)

### Cron Routes
- `GET /api/causemon/cron/search` - Run daily search (Vercel Cron)
- `GET /api/causemon/cron/email` - Send daily emails (Vercel Cron)

## MVP Features (Phase 1)

1. **Basic Monitoring**
   - Pre-seeded public figures and topics
   - Organization-based monitors
   - Daily email only

2. **Unified Search & Analysis**
   - Gemini with grounding searches web and news sources
   - Returns pre-analyzed, structured results
   - Automatic source attribution
   - Event grouping for related articles

3. **Basic Analysis**
   - Gemini extracts: headline, summary, key quotes
   - Groups multiple articles into single events
   - No complex sentiment analysis initially
   - No stance detection initially

4. **Operational Features**
   - Test mode for monitors (dry run without saving)
   - Email tracking to prevent duplicates
   - Organization-level access control (RBAC ready)

## Future Enhancements (Not Phase 1)

- Multiple monitors per user
- Custom email frequencies
- Sentiment/stance analysis
- Historical trends
- API for external access
- RSS feeds
- Slack/Discord notifications

## Implementation Plan

1. **Phase 1**: Database schema and basic CRUD APIs
2. **Phase 2**: Gemini with grounding integration
3. **Phase 3**: Email generation and cron jobs
4. **Phase 4**: Testing and refinement

## Why This Design?

- **Reuses MAIX infrastructure**: Auth, database, deployment all ready
- **Minimal new dependencies**: Just Gemini API and Resend
- **Clear value prop**: Daily updates on what matters
- **Room to grow**: Can add complexity based on actual usage
- **Aligned with MAIX mission**: Helps Muslim orgs track relevant issues

## Technology Choices Explained

- **Gemini with grounding**: Single API for both search and analysis - simpler, cheaper
- **Resend**: Native Vercel integration, React Email for JSX templates
- **Event/Article split**: One parliamentary speech can generate 10+ articles
- **Organization-based**: Aligns with MAIX's org structure and future RBAC

## Security & Privacy

- All monitors are private to organizations
- Organization-based access control via RBAC
- No public aggregations initially
- Standard MAIX authentication applies

## Technical Considerations

- **Gemini Grounding**: Use `google_search_retrieval` tool for real-time search
- **Structured Prompts**: Ask Gemini to return data in specific JSON format
- **Event Grouping**: Gemini can identify when multiple sources cover the same event
- **Source Attribution**: Grounding provides source URLs automatically
- **Email Efficiency**: One email per organization with all relevant events
- **React Email Templates**: Write email templates in JSX for better maintainability:
  ```jsx
  // Example Causemon digest template
  export default function CausemonDigest({ events, organization, date }) {
    return (
      <Html>
        <Body style={main}>
          <Container style={container}>
            <Heading>Daily Causemon Update</Heading>
            <Text>{organization.name} • {format(date, 'MMMM d, yyyy')}</Text>
            {events.map(event => (
              <Section key={event.id} style={eventSection}>
                <Text style={eventTitle}>{event.title}</Text>
                <Text style={eventSummary}>{event.summary}</Text>
                <Text style={articleCount}>
                  {event.articles.length} articles covering this event
                </Text>
              </Section>
            ))}
          </Container>
        </Body>
      </Html>
    );
  }
  ```

## Example Gemini Grounding Usage

```typescript
// Example of using Gemini with grounding for Causemon
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro",
  tools: [{ googleSearchRetrieval: {} }]
});

async function searchForEvents(publicFigure: string, topic: string) {
  const prompt = `
    Search for recent news articles and statements from the last 24 hours where 
    ${publicFigure} mentioned or discussed ${topic}.
    
    For each relevant finding, extract:
    - Event title (what happened)
    - Event date
    - Summary of what was said
    - Key quotes
    - Source URL
    - Source publisher
    
    Return results as JSON array with this structure:
    [{
      title: string,
      eventDate: string,
      summary: string,
      quotes: string[],
      sourceUrl: string,
      publisher: string
    }]
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Parse JSON from response
  const events = JSON.parse(text);
  return events;
}
```

This design leverages Gemini's powerful grounding capabilities to create a simpler, more maintainable system that still delivers the core value: keeping organizations informed about what public figures say about causes they care about.