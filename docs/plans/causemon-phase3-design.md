# Causemon Phase 3: Email Generation and Cron Jobs Design

## Overview

Phase 3 implements automated daily searches and email notifications for Causemon monitors. This phase will:
1. Create a cron job system to run daily searches
2. Generate email summaries of new events
3. Send emails to users based on their preferences
4. Track email delivery status

## Key Design Decisions

### 1. Cron Job Architecture

**Approach**: Vercel Cron Jobs
- Use Vercel's built-in cron functionality
- Single cron endpoint that processes all monitors
- Runs once daily at a fixed time (e.g., 2 AM UTC)
- Processes monitors in batches to avoid timeouts

**Alternative Considered**: External cron service (e.g., GitHub Actions)
- Rejected due to added complexity and external dependencies

### 2. Email Service

**Approach**: Resend API
- Modern email API with good developer experience
- Built-in React email templates
- Reliable delivery and tracking
- Simple integration

**Alternative Considered**: SendGrid, AWS SES
- More complex setup for MVP needs

### 3. Email Template Design

**Approach**: React Email Components
- Type-safe email templates
- Consistent styling with main app
- Mobile-responsive design
- Plain text fallback

## Database Schema Updates

```prisma
// Add to existing schema
model EmailLog {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  // Email details
  emailType     String   // "daily_digest", "weekly_digest"
  subject       String
  sentAt        DateTime @default(now())
  status        String   // "sent", "failed", "bounced"
  
  // Tracking
  eventsIncluded Int     @default(0)
  monitorsIncluded Int   @default(0)
  
  // Error tracking
  errorMessage  String?
  
  @@index([userId, sentAt])
  @@map("email_logs")
}
```

## Component Architecture

### 1. Cron Handler (`/api/cron/causemon-daily`)

```typescript
export async function GET(request: Request) {
  // Verify cron secret
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get all active monitors that need searching
  const monitors = await getMonitorsForDailySearch();
  
  // Process in batches
  const results = await processMonitorBatch(monitors);
  
  // Send email digests
  await sendDailyDigests(results);
  
  return Response.json({ 
    processed: monitors.length,
    emails: results.emailsSent 
  });
}
```

### 2. Email Service (`/lib/causemon/email-service.ts`)

```typescript
interface EmailService {
  sendDailyDigest(userId: string, events: Event[]): Promise<void>;
  sendWeeklyDigest(userId: string, events: Event[]): Promise<void>;
  sendErrorNotification(userId: string, error: string): Promise<void>;
}

class ResendEmailService implements EmailService {
  async sendDailyDigest(userId: string, events: Event[]) {
    const user = await getUserWithEmail(userId);
    const html = await renderDailyDigestEmail({ user, events });
    
    await resend.emails.send({
      from: 'Causemon <noreply@maix.app>',
      to: user.email,
      subject: `Daily Update: ${events.length} new events`,
      html,
      text: generatePlainText(events)
    });
    
    await logEmail(userId, 'daily_digest', events.length);
  }
}
```

### 3. Email Templates (`/emails/daily-digest.tsx`)

```tsx
export function DailyDigestEmail({ user, events }: Props) {
  return (
    <Html>
      <Head />
      <Preview>
        {events.length} new events from your Causemon monitors
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading>Daily Causemon Update</Heading>
          <Text>Hi {user.name},</Text>
          <Text>
            Here are the latest events from your monitors:
          </Text>
          
          {events.map(event => (
            <Section key={event.id} style={eventSection}>
              <Heading as="h3">{event.title}</Heading>
              <Text>{event.publicFigure.name} on {event.topic.name}</Text>
              <Text>{event.summary}</Text>
              <Button href={`${process.env.NEXT_PUBLIC_URL}/causemon/events`}>
                View Details
              </Button>
            </Section>
          ))}
          
          <Hr />
          <Link href={`${process.env.NEXT_PUBLIC_URL}/causemon`}>
            Manage Monitors
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
```

### 4. Batch Processor (`/lib/causemon/batch-processor.ts`)

```typescript
export class BatchProcessor {
  async processMonitorBatch(monitors: Monitor[]) {
    const batchSize = 10; // Process 10 monitors at a time
    const results = [];
    
    for (let i = 0; i < monitors.length; i += batchSize) {
      const batch = monitors.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(monitor => this.processMonitor(monitor))
      );
      results.push(...batchResults);
    }
    
    return this.aggregateResults(results);
  }
  
  private async processMonitor(monitor: Monitor) {
    try {
      const searchService = getSearchService();
      const results = await searchService.searchForEvents(monitor);
      
      const eventProcessor = getEventProcessor();
      const processed = await eventProcessor.processSearchResults(
        results,
        monitor.id,
        monitor.publicFigureId,
        monitor.topicId
      );
      
      return { monitor, ...processed };
    } catch (error) {
      console.error(`Failed to process monitor ${monitor.id}:`, error);
      return { monitor, error };
    }
  }
}
```

## Vercel Cron Configuration

In `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/causemon-daily",
    "schedule": "0 2 * * *"
  }]
}
```

## Email Frequency Logic

```typescript
async function sendDailyDigests(results: ProcessedResults) {
  // Group by user
  const eventsByUser = await groupEventsByUser(results);
  
  for (const [userId, userEvents] of eventsByUser) {
    const user = await getUser(userId);
    
    // Check user's email preferences
    if (user.emailFrequency === 'daily' && userEvents.length > 0) {
      await emailService.sendDailyDigest(userId, userEvents);
    } else if (user.emailFrequency === 'weekly') {
      // Store for weekly digest (Phase 4)
      await storeForWeeklyDigest(userId, userEvents);
    }
  }
}
```

## Error Handling

1. **Search Failures**: Log error, continue with next monitor
2. **Email Failures**: Retry with exponential backoff, log failures
3. **Timeout Protection**: Process in batches, use Vercel's max timeout
4. **Rate Limit Handling**: Respect daily search limits even in cron

## Security Considerations

1. **Cron Authentication**: Use secret token to prevent unauthorized triggers
2. **Email Content**: Sanitize all user-generated content in emails
3. **Unsubscribe Links**: Include one-click unsubscribe in all emails
4. **Rate Limiting**: Prevent email bombing by limiting sends per user

## Cost Estimation

- **Gemini API**: ~$0.002 per monitor per day (2000 tokens)
- **Resend**: $0.00025 per email
- **Total for 100 users**: ~$0.25/day

## Success Metrics

1. **Delivery Rate**: >95% successful email delivery
2. **Processing Time**: <30 seconds for 100 monitors
3. **Error Rate**: <1% failed searches
4. **User Engagement**: Track email open rates

## Implementation Steps

1. Set up Resend account and API key
2. Create email templates with React Email
3. Implement batch processor for monitors
4. Create cron endpoint with authentication
5. Add email logging and tracking
6. Configure Vercel cron schedule
7. Test with small batch of monitors
8. Monitor and optimize performance

## Testing Strategy

1. **Unit Tests**: Email template rendering, batch processing logic
2. **Integration Tests**: Cron handler with mocked services
3. **Email Tests**: Send test emails to team members
4. **Load Tests**: Process 100+ monitors in development
5. **Error Scenarios**: Test failure handling and retries

## Future Enhancements (Phase 4+)

1. Weekly digest emails
2. Customizable email times per user
3. Email preferences (which events to include)
4. Rich email analytics
5. SMS notifications for critical events