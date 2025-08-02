# Causemon Documentation

## Overview

Causemon is a monitoring system integrated into the MAIX platform that tracks what public figures say about specific causes across various sources (media, government committees, hansard, press releases). It provides email notifications to users about new statements and positions.

**Example use case**: Track what Anthony Albanese says about Palestine/Gaza in parliament, media, and committees

**Current Status**: MVP Phase 5 Complete - Full monitoring functionality with enhanced search display and monitor-specific events viewing.

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

## Current Implementation Status

### ✅ Phase 1: Database & Basic CRUD (Complete)
- Database schema implemented
- Basic CRUD APIs for monitors
- Authentication integration
- User interface for monitor management

### ✅ Phase 2: Gemini Integration (Complete)
- Gemini 1.5 Pro with Google Search grounding
- Search service implementation
- Test endpoint for dry runs
- Structured data extraction

### ✅ Phase 3 Core: Custom Input & No Restrictions (Complete)
- Removed all beta restrictions (no monitor limits)
- Available to all authenticated users
- Custom person/topic input via text fields
- Dynamic entity creation with case-insensitive matching
- Comprehensive error handling and debug logging

### ✅ Phase 3 Email: Cron & Email (Complete)
- Cron job handlers implemented and tested
- Email service with React Email templates
- Resend API integration working
- Daily digest emails operational

### ✅ Phase 4: @google/genai Migration & UI Simplification (Complete)
- Migrated from deprecated @google/generative-ai to canonical @google/genai
- Updated API calls to use new structure with Google Search grounding
- Removed test monitor endpoint - simplified to single "Search Now" button
- Removed 24-hour rate limiting for immediate testing
- All unit tests updated and passing
- Production ready with Gemini 2.5 Pro integration

### ✅ Phase 5: Enhanced Search Display & Events Navigation (Complete)
- Enhanced search results to show ALL found events (both new and existing) with status indicators
- Removed cost display from search results interface
- Added monitor-specific events viewing with "View Events" button (FileText icon)
- Implemented proper URL parameters for filtering events by specific monitor
- Added contextual page headers showing monitor details in events view
- Added navigation between all events and monitor-specific views
- Enhanced user experience with Suspense boundaries and proper loading states

## Key Features Implemented

### 1. Custom Person & Topic Input
- Users can monitor ANY public figure and ANY topic
- Text input fields with placeholders (e.g., "Anthony Albanese", "Palestine")
- Dynamic creation of new persons/topics if they don't exist
- Case-insensitive matching to prevent duplicates
- Empty arrays initialization for aliases/keywords

### 2. No Beta Restrictions
- No monitor limits per user
- Available to all authenticated users (not just admins)
- Added to main navigation under "Apps" section
- Full production-ready features

### 3. Core Monitoring Features
- Create monitors for person/topic combinations
- Manual search capability for immediate testing
- View all active monitors with details
- Delete monitors
- Email frequency preferences (daily/weekly)

### 4. Search & Analysis
- Gemini 2.5 Pro with Google Search grounding
- Searches for recent statements from public figures
- Extracts structured data: title, date, summary, quotes, sources
- Groups related articles into single events
- Comprehensive error handling with retry logic
- Debug logging for production troubleshooting
- Enhanced search display showing ALL found events with NEW/EXISTING status
- Real-time search progress indicators with circular progress bars

### 5. Events Management & Navigation
- Comprehensive events viewing page with date-based organization
- Monitor-specific events filtering via URL parameters
- Context-aware page headers showing monitor details
- Navigation between all events and monitor-specific views
- Source attribution with external links and publication dates
- Quote extraction and display with proper formatting
- Events sorted chronologically with full metadata

## Database Schema (Current)

```prisma
// Simplified schema focused on current implementation
model Monitor {
  id              String        @id @default(cuid())
  userId          String
  publicFigureId  String
  topicId         String
  isActive        Boolean       @default(true)
  emailFrequency  String        @default("daily")
  lastSearchedAt  DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // Relations
  user            User          @relation(fields: [userId], references: [id])
  publicFigure    PublicFigure  @relation(fields: [publicFigureId], references: [id])
  topic           Topic         @relation(fields: [topicId], references: [id])
  
  @@unique([userId, publicFigureId, topicId])
}

model PublicFigure {
  id        String    @id @default(cuid())
  name      String
  aliases   String[]  @default([])  // Empty by default for custom entries
  title     String?
  imageUrl  String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  monitors  Monitor[]
  events    Event[]
}

model Topic {
  id        String    @id @default(cuid())
  name      String
  keywords  String[]  @default([])  // Empty by default for custom entries
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  monitors  Monitor[]
  events    Event[]
}

// Future schema additions for Phase 3/4
model Event {
  id              String        @id @default(cuid())
  publicFigureId  String
  topicId         String
  title           String
  summary         String        @db.Text
  eventDate       DateTime
  eventType       String
  // ... additional fields
}
```

## API Endpoints

### Protected Routes (Implemented)
- `POST /api/causemon/monitors` - Create new monitor (accepts names, not IDs)
- `GET /api/causemon/monitors` - List user's monitors
- `PATCH /api/causemon/monitors/[id]` - Update monitor (pause/activate)
- `DELETE /api/causemon/monitors/[id]` - Delete a monitor
- `POST /api/causemon/monitors/[id]/search` - Manual search for events (no rate limiting)
- `GET /api/causemon/events` - Get events for user's monitors (supports monitorId filtering)

### Cron Routes (Ready, Not Deployed)
- `GET /api/causemon/cron/search` - Run daily search
- `GET /api/causemon/cron/email` - Send daily emails

## User Interface

### Main Causemon Page (`/causemon`)
```tsx
// Current implementation
<div className="space-y-4">
  <Input
    value={publicFigureName}
    onChange={(e) => setPublicFigureName(e.target.value)}
    placeholder="e.g., Anthony Albanese"
  />
  <Input
    value={topicName}
    onChange={(e) => setTopicName(e.target.value)}
    placeholder="e.g., Palestine"
  />
  <Button onClick={handleAddMonitor}>Add Monitor</Button>
</div>
```

### Navigation Integration
- Added "Apps" section to sidebar (visible to all authenticated users)
- Causemon link under Apps section
- Consistent with MAIX design system
- Monitor-specific events navigation via FileText icon buttons
- Breadcrumb-style navigation between events views

## Implementation Details

### Monitor Creation Flow
1. User enters public figure name and topic name (free text)
2. System searches for existing entries (case-insensitive)
3. If not found, creates new entries with empty aliases/keywords arrays
4. Creates monitor linking user, person, and topic
5. Prevents duplicate monitors for same combination

### Search Endpoint Features
```typescript
// Real-time search with comprehensive logging
console.log(`Starting search for monitor ${id}: ${monitor.publicFigure.name} on ${monitor.topic.name}`);
  publicFigure: monitor.publicFigure?.name,
  topic: monitor.topic?.name,
  aliases: monitor.publicFigure?.aliases,
  keywords: monitor.topic?.keywords,
});

// Safe handling of empty arrays
const figureAliases = monitor.publicFigure.aliases?.length > 0 
  ? `(${monitor.publicFigure.aliases.join(', ')})` 
  : '';
```

### Gemini Integration Example
```typescript
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro",
  tools: [{ googleSearchRetrieval: {} }],
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 4096,
  }
});

// Search with structured prompt
const prompt = `
  Search for recent news articles and statements from the last 24 hours where 
  ${publicFigure} mentioned or discussed ${topic}.
  
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
```

## Environment Variables

```env
# Existing MAIX variables
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Causemon-specific
GOOGLE_API_KEY="..."        # For Gemini API with grounding
RESEND_API_KEY="..."        # For email delivery (Phase 3)
EMAIL_FROM="..."            # Sender email address
CRON_SECRET="..."           # For cron job authentication
```

## Testing & Quality

### Comprehensive Test Coverage
- Unit tests for all API routes
- Edge case handling (empty arrays, null values)
- Case-insensitive name matching tests
- Duplicate prevention tests
- Authentication and authorization tests

### Debug Features
- Detailed console logging throughout
- Monitor ID and user ID tracking
- Database query success/failure logging
- Gemini API response details
- Error stack traces for debugging

## Common Issues & Solutions

### 500 Error on Test
- **Cause**: Empty/null aliases or keywords arrays
- **Solution**: Added optional chaining and empty array checks
- **Debug**: Check Vercel logs for detailed error messages

### Duplicate Entities
- **Cause**: Case-sensitive matching
- **Solution**: Use Prisma's case-insensitive mode
- **Prevention**: Always use `mode: 'insensitive'` in queries

### Missing Dependencies
- **Cause**: Package.json not committed
- **Solution**: Always commit package.json and package-lock.json
- **Prevention**: Added to CLAUDE.md pre-commit checklist

## Future Roadmap

### Phase 6: Production Email & Cron Deployment
- Deploy Vercel cron jobs for daily searches
- Production email delivery via Resend
- Email tracking and analytics
- Performance monitoring and alerting

### Phase 7+ Enhancements
- Sentiment/stance analysis with AI
- Weekly digest options with customizable frequency
- Export capabilities (CSV, PDF) for events data
- Advanced filtering and search within events
- Multiple monitors per search batch optimization
- API for external access with rate limiting
- RSS feeds for programmatic access
- Slack/Discord notifications integration
- Historical analytics and trending analysis
- Event categorization and tagging

## Security Considerations

1. **Authentication**: All routes require valid session
2. **Authorization**: Users can only access their own monitors
3. **Input Validation**: Names are sanitized before database storage
4. **API Keys**: Stored securely in environment variables
5. **Rate Limiting**: Planned for production deployment
6. **Cron Security**: Secret token authentication for cron endpoints

## Development Guidelines

### Following DRSITR
1. **Design** - Work out the overall design and architecture
2. **Review** - Use `mcp__zen__thinkdeep` for comprehensive analysis
3. **Simplify** - Apply "bias towards simple solutions" principle
4. **Implement** - Build following the agreed design
5. **Test** - Write comprehensive tests and run quality checks
6. **Review** - Final code review with `mcp__zen__codereview`

### Code Quality Standards
- TypeScript strict mode
- Proper error handling with try-catch blocks
- Meaningful error messages for debugging
- Consistent naming conventions
- Follow MAIX coding standards
- Comprehensive logging for production issues

## Key Design Decisions

1. **Dynamic Entity Creation**: Allow any person/topic rather than pre-seeded lists
2. **Simple UI**: Text inputs instead of complex dropdowns
3. **Empty Arrays**: Initialize aliases/keywords as empty arrays, not null
4. **Case-Insensitive**: Prevent duplicates with case-insensitive matching
5. **Comprehensive Logging**: Debug-first approach for production issues
6. **Gemini with Grounding**: Single API for both search and analysis
7. **Event/Article Split**: One event can have multiple article sources
8. **User-Based Access**: Simplified from organization-based for MVP

## Cost Estimation

- **Gemini API**: ~$0.002 per monitor per search (2000 tokens)
- **Resend**: $0.00025 per email
- **Total for 100 users**: ~$0.25/day
- **Monthly estimate**: ~$7.50 for moderate usage

## Success Metrics

- Search accuracy (relevant results found)
- Processing speed (<30s per monitor)
- Error rate (<5% failed searches)
- Email delivery rate (>95% successful)
- User engagement with results

This documentation represents the complete Causemon feature, combining the original design vision with the current implementation state. The system is ready for production use with Phase 3 email/cron deployment being the next immediate step.