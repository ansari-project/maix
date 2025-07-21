# MAIX Notification System Design

**Date**: 2025-07-21  
**Status**: Design Complete - Ready for Implementation  

## Executive Summary

This document outlines a comprehensive notification system for MAIX with two core components: in-app notifications and an email notification bridge. The system is designed to handle various notification types from volunteer applications, Q&A interactions, project updates, social interactions, and future GitHub integration.

## Notification Types

### 1. Application Notifications
- **New Application**: When someone applies to your project
- **Status Changed**: When your application is accepted/rejected
- **Application Withdrawn**: When a volunteer withdraws their application

### 2. Q&A Notifications
- **New Answer**: When someone answers your question
- **Best Answer**: When your answer is marked as best
- **New Comment**: When someone comments on your Q&A post

### 3. Project/Product Updates
- **New Update**: Updates on projects you follow or volunteer for
- **Status Changed**: When a project changes lifecycle status
- **Milestone Reached**: When a project reaches completion date

### 4. Social Interactions
- **Mentions**: When someone mentions you (@username)
- **New Follower**: When someone follows you
- **Direct Message**: When you receive a message

### 5. GitHub Integration (Future)
- **Code Activity**: Commits, PRs, issues on watched projects
- **Releases**: New version releases
- **Milestones**: GitHub project milestones

## Technical Architecture

### Recommended Technology Stack

#### Email Service: **Resend**
- **Why**: Modern API, React Email templates, excellent developer experience
- **Features**: Transactional emails, webhooks, email analytics
- **Pricing**: 100 emails/day free, then $20/month for 5,000 emails
- **Alternative**: SendGrid (more established, similar pricing)

#### Real-time Delivery: **Pusher** or **Server-Sent Events**
- **Pusher**: Already mentioned in CLAUDE.md, WebSocket-based, reliable
- **SSE Alternative**: Native browser support, simpler for one-way notifications
- **Implementation**: Use for instant notification badge updates

#### Queue System: **BullMQ with Redis**
- **Why**: Reliable delivery, retry logic, scheduled notifications
- **Features**: Job prioritization, delayed jobs, rate limiting
- **Use Case**: Decouple notification creation from delivery

#### Template Engine: **React Email**
- **Why**: Component-based email templates, consistent with React codebase
- **Features**: Responsive design, preview tools, TypeScript support
- **Benefits**: Reusable components, maintainable templates

### Database Schema

```prisma
// Core notification model
model Notification {
  id          String           @id @default(cuid())
  type        NotificationType
  title       String
  message     String           @db.Text
  metadata    Json?            // Type-specific data (e.g., projectId, postId)
  read        Boolean          @default(false)
  readAt      DateTime?
  createdAt   DateTime         @default(now())
  
  // Recipient
  userId      String
  user        User             @relation(fields: [userId], references: [id])
  
  // Polymorphic references for context
  applicationId String?
  projectId     String?
  postId        String?
  commentId     String?
  messageId     String?
  
  @@index([userId, read, createdAt])
  @@index([userId, type, createdAt])
  @@map("notifications")
}

// User notification preferences
model NotificationPreference {
  id          String          @id @default(cuid())
  userId      String          @unique
  user        User            @relation(fields: [userId], references: [id])
  
  // Email notification settings
  emailEnabled          Boolean @default(true)
  emailApplications     Boolean @default(true)
  emailAnswers          Boolean @default(true)
  emailMentions         Boolean @default(true)
  emailProjectUpdates   Boolean @default(true)
  emailMessages         Boolean @default(true)
  emailDigest           DigestFrequency @default(DAILY)
  
  // In-app notification settings
  inAppEnabled          Boolean @default(true)
  inAppApplications     Boolean @default(true)
  inAppAnswers          Boolean @default(true)
  inAppMentions         Boolean @default(true)
  inAppProjectUpdates   Boolean @default(true)
  inAppMessages         Boolean @default(true)
  
  // Quiet hours (respect prayer times)
  quietHoursEnabled     Boolean @default(false)
  quietHoursStart       String? // "13:00" format
  quietHoursEnd         String? // "14:30" format
  timezone              String  @default("UTC")
  
  @@map("notification_preferences")
}

// Email notification queue
model EmailQueue {
  id          String         @id @default(cuid())
  userId      String
  type        NotificationType
  subject     String
  htmlContent String         @db.Text
  textContent String         @db.Text
  metadata    Json?
  status      EmailStatus    @default(PENDING)
  attempts    Int            @default(0)
  sentAt      DateTime?
  error       String?
  createdAt   DateTime       @default(now())
  scheduledFor DateTime      @default(now())
  
  @@index([status, scheduledFor])
  @@map("email_queue")
}

enum NotificationType {
  // Applications
  APPLICATION_NEW
  APPLICATION_ACCEPTED
  APPLICATION_REJECTED
  APPLICATION_WITHDRAWN
  
  // Q&A
  ANSWER_NEW
  ANSWER_BEST
  COMMENT_NEW
  
  // Social
  MENTION
  FOLLOWER_NEW
  MESSAGE_NEW
  
  // Projects/Products
  PROJECT_UPDATE
  PROJECT_STATUS_CHANGED
  PRODUCT_UPDATE
  
  // System
  SYSTEM_ANNOUNCEMENT
  MODERATION_ACTION
}

enum DigestFrequency {
  REALTIME
  DAILY
  WEEKLY
  NEVER
}

enum EmailStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
  CANCELLED
}
```

## Implementation Architecture

### 1. Notification Service (Core)
```typescript
// services/notification.service.ts
interface NotificationService {
  // Create notification and trigger delivery
  create(params: CreateNotificationParams): Promise<Notification>
  
  // Mark notifications as read
  markAsRead(notificationIds: string[]): Promise<void>
  
  // Get user notifications
  getUserNotifications(userId: string, options: PaginationOptions): Promise<Notification[]>
  
  // Get unread count
  getUnreadCount(userId: string): Promise<number>
}

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, any>
  relatedIds?: {
    applicationId?: string
    projectId?: string
    postId?: string
    commentId?: string
  }
}
```

### 2. Email Bridge Service
```typescript
// services/email.service.ts
interface EmailService {
  // Queue email for delivery
  queueEmail(params: EmailParams): Promise<void>
  
  // Process email queue (called by worker)
  processQueue(): Promise<void>
  
  // Send email immediately
  sendImmediate(params: EmailParams): Promise<void>
}

interface EmailParams {
  to: string
  subject: string
  template: EmailTemplate
  data: Record<string, any>
  scheduledFor?: Date
}

type EmailTemplate = 
  | 'application-received'
  | 'application-status'
  | 'new-answer'
  | 'mention'
  | 'project-update'
  | 'digest'
```

### 3. Real-time Delivery
```typescript
// services/realtime.service.ts
interface RealtimeService {
  // Send notification to user's active sessions
  notifyUser(userId: string, notification: Notification): Promise<void>
  
  // Update notification badge count
  updateBadgeCount(userId: string, count: number): Promise<void>
}
```

### 4. Preference Manager
```typescript
// services/preference.service.ts
interface PreferenceService {
  // Get user preferences
  getPreferences(userId: string): Promise<NotificationPreference>
  
  // Update preferences
  updatePreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<void>
  
  // Check if notification should be sent
  shouldSendNotification(userId: string, type: NotificationType, channel: 'email' | 'inApp'): Promise<boolean>
}
```

## Email Templates

### React Email Components
```tsx
// emails/templates/ApplicationReceived.tsx
import { Html, Head, Body, Container, Text, Button, Heading } from '@react-email/components'

export function ApplicationReceivedEmail({ projectName, applicantName, message }) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Application for {projectName}</Heading>
          <Text style={text}>
            Assalamu alaikum,
          </Text>
          <Text style={text}>
            {applicantName} has applied to volunteer for your project.
          </Text>
          <Text style={quote}>
            "{message}"
          </Text>
          <Button style={button} href={`${process.env.APP_URL}/projects/${projectId}/volunteers`}>
            Review Application
          </Button>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

// ... more styles
```

## API Endpoints

### Notification Management
```
GET    /api/notifications              # Get user notifications
POST   /api/notifications/mark-read    # Mark as read
GET    /api/notifications/unread-count # Get unread count
DELETE /api/notifications/:id          # Delete notification
```

### Preference Management
```
GET    /api/notifications/preferences     # Get preferences
PUT    /api/notifications/preferences     # Update preferences
POST   /api/notifications/test-email      # Send test email
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- Create database schema and migrations
- Implement NotificationService
- Basic in-app notification creation
- Simple notification UI component
- API endpoints for fetching notifications

### Phase 2: Email Bridge (Week 3-4)
- Set up Resend account and configuration
- Implement EmailService with queue
- Create basic email templates
- Add email sending to notification triggers
- Test email delivery and formatting

### Phase 3: Real-time & Preferences (Week 5-6)
- Integrate Pusher or implement SSE
- Real-time notification delivery
- Notification preference UI
- Preference enforcement in services
- Unread badge updates

### Phase 4: Advanced Features (Week 7-8)
- Email digest functionality
- Quiet hours implementation
- Advanced email templates
- Notification analytics
- Performance optimization

## Islamic Considerations

### Prayer Time Awareness
- Implement quiet hours that can align with prayer times
- Option to pause notifications during Jummah
- Hijri calendar integration for Islamic events

### Content Guidelines
- Respectful greeting formats (Assalamu alaikum)
- Avoid notification fatigue during Ramadan
- Cultural sensitivity in notification timing

### Privacy and Modesty
- Strict privacy controls on who can mention users
- Option to disable social notifications
- Gender-appropriate communication options

## Security Considerations

### Email Security
- Verify email ownership before sending
- Rate limiting on notification creation
- Sanitize user content in emails
- Implement unsubscribe tokens

### Data Protection
- Encrypt sensitive notification metadata
- Regular cleanup of old notifications
- Audit trail for notification access
- GDPR compliance for email data

## Performance Optimization

### Database
- Index on (userId, read, createdAt) for fast queries
- Pagination for notification lists
- Soft delete for audit trail
- Archive old notifications

### Email Delivery
- Batch similar notifications
- Queue processing with exponential backoff
- Failed email retry logic
- Monitor delivery rates

### Real-time
- Connection pooling for Pusher
- Debounce rapid notifications
- Efficient badge count queries
- Client-side caching

## Monitoring and Analytics

### Key Metrics
- Notification delivery rate
- Email open/click rates
- Time to read notifications
- Preference opt-out rates
- Queue processing time

### Alerts
- Email delivery failures
- Queue buildup
- High bounce rates
- Pusher connection issues

## Testing Strategy

### Unit Tests
- Notification creation logic
- Preference evaluation
- Email template rendering
- Queue processing

### Integration Tests
- End-to-end notification flow
- Email delivery verification
- Real-time delivery testing
- Preference enforcement

### Load Testing
- High volume notification creation
- Queue processing under load
- Real-time connection limits
- Database query performance

## Migration Strategy

### Existing Users
- Create default preferences for all users
- Backfill notifications for recent activities
- Gradual rollout with feature flags
- Clear communication about new features

### Backward Compatibility
- Keep existing direct message system
- Gradual migration of triggers
- Maintain API compatibility
- Preserve notification history

## Future Enhancements

### Advanced Features
- Push notifications (mobile web)
- SMS notifications for critical updates
- Notification scheduling
- Custom notification sounds

### Intelligence
- Smart notification bundling
- ML-based preference learning
- Optimal timing prediction
- Engagement analytics

### Integrations
- Slack/Discord webhooks
- Calendar integration
- Mobile app support
- Third-party service hooks

## Conclusion

This notification system design provides a solid foundation for keeping MAIX users engaged and informed. The phased implementation approach allows for gradual rollout and testing, while the architecture supports future expansion. The combination of in-app notifications and email ensures users stay connected regardless of their platform usage patterns.

The emphasis on user preferences and Islamic considerations ensures the system respects user needs and cultural values, while the modern tech stack provides reliability and maintainability.