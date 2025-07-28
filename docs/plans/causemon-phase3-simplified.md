# Causemon Phase 3: Simplified Email & Cron Design

## Overview

Phase 3 implements automated searches and email notifications with a focus on reliability and simplicity. Key principles:
- Avoid Vercel timeout issues with small batches
- Legal compliance with unsubscribe mechanism
- Simple HTML emails instead of complex templating
- Gradual rollout to manage costs

## Key Changes from Original Design

1. **Staggered cron runs** (every 2 hours) instead of single daily job
2. **Simple HTML templates** instead of React Email
3. **Unsubscribe token** added to User model
4. **Test mode** for safe development
5. **Smaller batches** (20 users per run) to avoid timeouts

## Database Schema Updates

```prisma
model User {
  // ... existing fields
  
  // Email preferences
  subscribedToDigest    Boolean   @default(true)
  lastDigestSentAt      DateTime?
  unsubscribeToken      String?   @unique @default(cuid())
  
  // Relations
  emailLogs            EmailLog[]
}

model EmailLog {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  // Email details
  emailType     String   // "daily_digest"
  subject       String
  sentAt        DateTime @default(now())
  status        String   // "sent", "failed"
  
  // Tracking
  eventsIncluded Int     @default(0)
  
  // Error tracking
  errorMessage  String?
  
  @@index([userId, sentAt])
}
```

## Implementation Components

### 1. Cron Configuration (`vercel.json`)

```json
{
  "crons": [{
    "path": "/api/cron/send-digests",
    "schedule": "0 */2 * * *"
  }]
}
```

Runs every 2 hours, processing small batches to avoid timeout.

### 2. Cron Handler (`/api/cron/send-digests/route.ts`)

```typescript
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Calculate time window
  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setUTCHours(0, 0, 0, 0);

  // Fetch batch of users who need emails
  const users = await prisma.user.findMany({
    where: {
      subscribedToDigest: true,
      OR: [
        { lastDigestSentAt: null },
        { lastDigestSentAt: { lt: todayMidnight } }
      ],
      monitors: { 
        some: { isActive: true } 
      }
    },
    take: 20, // Small batch
    include: {
      monitors: {
        where: { isActive: true },
        include: {
          publicFigure: true,
          topic: true
        }
      }
    }
  });

  // Process each user
  const results = await Promise.allSettled(
    users.map(user => processUserDigest(user))
  );

  // Count successes
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return Response.json({ 
    processed: users.length,
    succeeded,
    failed
  });
}

async function processUserDigest(user: UserWithMonitors) {
  try {
    // Get recent events for this user's monitors
    const events = await getRecentEventsForUser(user.id);
    
    if (events.length === 0) {
      // No events, but update timestamp to prevent re-checking today
      await prisma.user.update({
        where: { id: user.id },
        data: { lastDigestSentAt: new Date() }
      });
      return;
    }

    // Send email
    const emailService = getEmailService();
    await emailService.sendDailyDigest(user, events);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { lastDigestSentAt: new Date() }
    });

    // Log success
    await prisma.emailLog.create({
      data: {
        userId: user.id,
        emailType: 'daily_digest',
        subject: `Daily Update: ${events.length} new events`,
        status: 'sent',
        eventsIncluded: events.length
      }
    });
  } catch (error) {
    // Log failure
    await prisma.emailLog.create({
      data: {
        userId: user.id,
        emailType: 'daily_digest',
        subject: 'Daily Update',
        status: 'failed',
        errorMessage: error.message
      }
    });
    throw error;
  }
}
```

### 3. Simple Email Service (`/lib/causemon/email-service.ts`)

```typescript
import { Resend } from 'resend';

export class EmailService {
  private resend: Resend;
  private testMode: boolean;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.testMode = process.env.EMAIL_TEST_MODE === 'true';
  }

  async sendDailyDigest(user: User, events: Event[]) {
    const to = this.testMode 
      ? process.env.ADMIN_EMAIL! 
      : user.email;

    const subject = `Causemon Daily: ${events.length} new events`;
    const html = this.generateDigestHTML(user, events);
    const text = this.generateDigestText(user, events);

    await this.resend.emails.send({
      from: process.env.EMAIL_FROM || 'Causemon <noreply@maix.app>',
      to,
      subject,
      html,
      text
    });
  }

  private generateDigestHTML(user: User, events: Event[]): string {
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_URL}/unsubscribe/${user.unsubscribeToken}`;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Causemon Daily Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1E3A8A; border-bottom: 2px solid #1E3A8A; padding-bottom: 10px;">
    Causemon Daily Update
  </h1>
  
  <p>Hi ${user.name || 'there'},</p>
  
  <p>Here are the latest events from your monitors:</p>
  
  ${events.map(event => `
    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #1E3A8A;">
        ${this.escapeHtml(event.title)}
      </h3>
      <p style="color: #666; margin: 5px 0;">
        <strong>${this.escapeHtml(event.publicFigure.name)}</strong> 
        on ${this.escapeHtml(event.topic.name)}
      </p>
      <p>${this.escapeHtml(event.summary)}</p>
      <p style="margin-top: 10px;">
        <a href="${process.env.NEXT_PUBLIC_URL}/causemon/events" 
           style="color: #1E3A8A; text-decoration: none; font-weight: bold;">
          View Details →
        </a>
      </p>
    </div>
  `).join('')}
  
  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
  
  <p style="color: #666; font-size: 14px;">
    <a href="${process.env.NEXT_PUBLIC_URL}/causemon" style="color: #1E3A8A;">
      Manage your monitors
    </a> | 
    <a href="${unsubscribeUrl}" style="color: #666;">
      Unsubscribe
    </a>
  </p>
</body>
</html>
    `;
  }

  private generateDigestText(user: User, events: Event[]): string {
    return `
Causemon Daily Update

Hi ${user.name || 'there'},

Here are the latest events from your monitors:

${events.map(event => `
- ${event.title}
  ${event.publicFigure.name} on ${event.topic.name}
  ${event.summary}
  
  View at: ${process.env.NEXT_PUBLIC_URL}/causemon/events
`).join('\n')}

Manage monitors: ${process.env.NEXT_PUBLIC_URL}/causemon
Unsubscribe: ${process.env.NEXT_PUBLIC_URL}/unsubscribe/${user.unsubscribeToken}
    `;
  }

  private escapeHtml(text: string): string {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
```

### 4. Unsubscribe Handler (`/app/unsubscribe/[token]/page.tsx`)

```typescript
export default async function UnsubscribePage({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}) {
  const { token } = await params;
  
  // Find and update user
  const user = await prisma.user.update({
    where: { unsubscribeToken: token },
    data: { subscribedToDigest: false }
  });

  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
        <p>This unsubscribe link is invalid or has expired.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Unsubscribed</h1>
      <p className="mb-4">
        You have been unsubscribed from Causemon daily emails.
      </p>
      <p>
        <Link href="/causemon" className="text-primary hover:underline">
          Manage your monitors
        </Link>
      </p>
    </div>
  );
}
```

## Monitoring & Safety

### Environment Variables

```env
# Required
RESEND_API_KEY=re_xxx
EMAIL_FROM=Causemon <noreply@yourdomain.com>
CRON_SECRET=your-secret-token

# Development
EMAIL_TEST_MODE=true
ADMIN_EMAIL=admin@yourdomain.com
```

### Monitoring Queries

```sql
-- Daily email stats
SELECT 
  DATE(sentAt) as date,
  COUNT(*) as total_emails,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  AVG(eventsIncluded) as avg_events_per_email
FROM EmailLog
GROUP BY DATE(sentAt)
ORDER BY date DESC;

-- Users not receiving emails
SELECT u.id, u.email, u.lastDigestSentAt
FROM User u
WHERE u.subscribedToDigest = true
  AND u.lastDigestSentAt < NOW() - INTERVAL '2 days'
  AND EXISTS (
    SELECT 1 FROM Monitor m 
    WHERE m.userId = u.id AND m.isActive = true
  );
```

## Testing Strategy

1. **Test Mode**: Set `EMAIL_TEST_MODE=true` to redirect all emails to admin
2. **Small Rollout**: Start with 5-10 beta users
3. **Monitor Logs**: Check EmailLog table for failures
4. **Gradual Increase**: Increase batch size as confidence grows

## Cost Management

- **Email costs**: $0.25 per 1000 emails (Resend)
- **Search costs**: Managed by existing Phase 2 rate limits
- **Database costs**: Minimal (small EmailLog table)

## Success Metrics

1. **Delivery rate**: >95% successful
2. **Processing time**: <10s per batch of 20
3. **User engagement**: Track unsubscribe rate (<5%)
4. **Reliability**: No missed daily emails

## Next Steps

1. Run database migration for new fields
2. Implement email service with test mode
3. Create unsubscribe page
4. Deploy cron handler
5. Test with admin account
6. Gradual rollout to users