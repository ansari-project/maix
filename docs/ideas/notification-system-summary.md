# MAIX Notification System - Implementation Summary

## Quick Overview

**Two-Component System:**
1. **In-App Notifications** - Real-time updates within the platform
2. **Email Bridge** - Transactional emails for important events

## Recommended Tech Stack

| Component | Recommendation | Why | Alternative |
|-----------|---------------|-----|-------------|
| **Email Service** | Resend | Modern API, React Email templates, great DX | SendGrid |
| **Real-time** | Pusher | Already in CLAUDE.md, reliable WebSockets | Server-Sent Events |
| **Queue** | BullMQ + Redis | Reliable delivery, retry logic | Database queue |
| **Templates** | React Email | Component-based, TypeScript support | MJML |

## Core Notification Types

### Must-Have (Phase 1)
- ✅ New volunteer application on your project
- ✅ Application status changed (accepted/rejected)
- ✅ New answer to your question
- ✅ Direct message received

### Nice-to-Have (Phase 2+)
- Mentions in posts/comments
- Project updates from followed projects
- Best answer selection
- Comment on your posts

## Database Schema (Simplified)

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String   // Who receives it
  type      String   // What type of notification
  title     String   // Notification title
  message   String   // Notification body
  metadata  Json?    // Extra data (projectId, etc)
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model NotificationPreference {
  userId         String  @unique
  emailEnabled   Boolean @default(true)
  inAppEnabled   Boolean @default(true)
  // ... granular preferences per notification type
}
```

## Implementation Checklist

### Phase 1: MVP (2 weeks)
- [ ] Add Notification model to Prisma schema
- [ ] Create notification service for CRUD operations
- [ ] Add notification creation to existing triggers:
  - [ ] When application submitted
  - [ ] When application status changes
  - [ ] When answer posted to question
- [ ] Build notification dropdown UI component
- [ ] Create `/api/notifications` endpoints

### Phase 2: Email Integration (2 weeks)
- [ ] Set up Resend account
- [ ] Create email service with templates:
  - [ ] Application received
  - [ ] Application status update
  - [ ] New answer notification
- [ ] Add email sending to notification triggers
- [ ] Implement email queue for reliability

### Phase 3: Preferences & Real-time (2 weeks)
- [ ] Add NotificationPreference model
- [ ] Build preference management UI
- [ ] Integrate Pusher for real-time updates
- [ ] Add unread count badge to navbar
- [ ] Implement notification filtering by preferences

## Key Code Locations to Update

### When Creating Notifications:
1. `/api/projects/[id]/apply/route.ts` - Add notification when application submitted
2. `/api/applications/[id]/route.ts` - Add notification when status changes
3. `/api/posts/route.ts` - Add notification for answers to questions
4. `/api/posts/[id]/comments/route.ts` - Add notification for mentions

### Example Implementation:
```typescript
// In /api/projects/[id]/apply/route.ts
import { createNotification } from '@/services/notification.service'

// After creating application...
await createNotification({
  userId: project.ownerId,
  type: 'APPLICATION_NEW',
  title: 'New Application',
  message: `${user.name} applied to volunteer for ${project.name}`,
  metadata: {
    applicationId: application.id,
    projectId: project.id
  }
})
```

## Email Template Example (React Email)

```tsx
// emails/ApplicationReceived.tsx
export const ApplicationReceived = ({ projectName, applicantName }) => (
  <Html>
    <Body>
      <Container>
        <Text>Assalamu alaikum,</Text>
        <Heading>{applicantName} wants to volunteer!</Heading>
        <Text>
          Someone has applied to help with your project "{projectName}".
        </Text>
        <Button href={`${APP_URL}/projects/${projectId}/volunteers`}>
          Review Application
        </Button>
      </Container>
    </Body>
  </Html>
)
```

## Environment Variables to Add

```env
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=notifications@maix.io

# Real-time (Pusher) - if not already present
PUSHER_APP_ID=xxxxx
PUSHER_KEY=xxxxx
PUSHER_SECRET=xxxxx
PUSHER_CLUSTER=us2

# Redis (for queue)
REDIS_URL=redis://localhost:6379
```

## Quick Start Commands

```bash
# Install dependencies
npm install resend @react-email/components bull bullmq ioredis

# Add to Prisma schema and migrate
npx prisma migrate dev --name add-notifications

# Set up Resend
# 1. Sign up at https://resend.com
# 2. Verify domain or use their subdomain
# 3. Get API key and add to .env
```

## Islamic Considerations
- Default quiet hours during typical prayer times
- Respectful Arabic greetings in emails
- Option to pause during Ramadan
- Hijri calendar awareness for Islamic events

## Success Metrics
- 📊 Notification delivery rate > 95%
- 📧 Email open rate > 40%
- ⏱️ Real-time delivery < 2 seconds
- 👤 User preference adoption > 60%

## Common Pitfalls to Avoid
- ❌ Don't send too many notifications (fatigue)
- ❌ Don't forget unsubscribe links in emails
- ❌ Don't ignore user preferences
- ❌ Don't send notifications for user's own actions
- ❌ Don't forget to batch similar notifications

This streamlined approach gets notifications working quickly while leaving room for future enhancements.