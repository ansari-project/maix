# MAIX Notification System - Complete Design & Implementation Guide

**Date**: 2025-01-22  
**Status**: Design Complete - Ready for Implementation  

## Executive Summary

This document consolidates the complete notification system design for MAIX, featuring two core components: in-app notifications and an email notification bridge. The system handles notifications from volunteer applications, Q&A interactions, project updates, social interactions, and future GitHub integration.

## Quick Architecture Overview

**Two-Component System:**
1. **In-App Notifications** - Database-backed, real-time updates within the platform
2. **Email Bridge** - Transactional emails for important events via queue system

## Technology Stack Recommendation

| Component | Recommendation | Why | Alternative |
|-----------|---------------|-----|-------------|
| **Email Service** | **Resend** | React Email templates, modern API, excellent DX | SendGrid |
| **Real-time** | **Pusher** | Already in CLAUDE.md, reliable WebSockets | Server-Sent Events |
| **Queue** | **BullMQ + Redis** | Reliable delivery, retry logic, scheduled jobs | Database queue |
| **Templates** | **React Email** | Component-based, TypeScript, matches stack | MJML |

### Why Resend for Email?

After comparing SendGrid, AWS SES, Postmark, and Resend:
- **Best Developer Experience**: Modern API, React Email integration
- **Cost Effective**: 100 emails/day free, then $20/month for 50k emails
- **Perfect for MAIX**: Component-based email templates match React stack
- **Quick Setup**: Domain verification in minutes, great documentation

## Notification Types

### Core Notifications (Phase 1)
1. **Application Notifications**
   - New application on your project
   - Application status changed (accepted/rejected)
   - Application withdrawn

2. **Q&A Notifications**  
   - New answer to your question
   - Your answer marked as best
   - New comment on your Q&A post

3. **Direct Messages**
   - New message received

### Extended Notifications (Phase 2+)
4. **Project/Product Updates**
   - New update on followed project
   - Project status changed
   - Product milestone reached

5. **Social Interactions**
   - Mentioned in post/comment (@username)
   - New follower

6. **GitHub Integration** (Future)
   - Code commits, PRs, issues
   - Release notifications

## Complete Database Schema

```prisma
// Add to prisma/schema.prisma

// Notification types enum
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
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Polymorphic references for context
  applicationId String?
  application   Application?   @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  
  projectId     String?
  project       Project?       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  postId        String?
  post          Post?          @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  commentId     String?
  comment       Comment?       @relation(fields: [commentId], references: [id], onDelete: Cascade)
  
  messageId     String?
  message       Message?       @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  @@index([userId, read, createdAt])
  @@index([userId, type, createdAt])
  @@map("notifications")
}

// User notification preferences
model NotificationPreference {
  id          String          @id @default(cuid())
  userId      String          @unique
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Global settings
  emailEnabled          Boolean @default(true)
  inAppEnabled          Boolean @default(true)
  
  // Per-type settings (stored as JSON for flexibility)
  emailTypes            Json    @default("{}")  // { "APPLICATION_NEW": true, ... }
  inAppTypes            Json    @default("{}")  // { "APPLICATION_NEW": true, ... }
  
  // Email digest settings
  emailDigest           DigestFrequency @default(DAILY)
  
  // Quiet hours (respect prayer times)
  quietHoursEnabled     Boolean @default(false)
  quietHoursStart       String? // "13:00" format
  quietHoursEnd         String? // "14:30" format
  timezone              String  @default("UTC")
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@map("notification_preferences")
}

// Email queue for reliable delivery
model EmailQueue {
  id          String         @id @default(cuid())
  userId      String
  type        NotificationType
  to          String         // Email address
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

// Update existing models
model User {
  // ... existing fields
  notifications         Notification[]
  notificationPreference NotificationPreference?
}

model Application {
  // ... existing fields
  notifications Notification[]
}

model Project {
  // ... existing fields
  notifications Notification[]
}

model Post {
  // ... existing fields
  notifications Notification[]
}

model Comment {
  // ... existing fields
  notifications Notification[]
}

model Message {
  // ... existing fields
  notifications Notification[]
}
```

## Service Implementation

### 1. Core Notification Service

```typescript
// src/services/notification.service.ts
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'
import { sendNotificationEmail } from './email.service'

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
    messageId?: string
  }
}

export class NotificationService {
  static async create(params: CreateNotificationParams) {
    const { userId, type, title, message, metadata, relatedIds } = params

    // Check user preferences
    const preferences = await this.getUserPreferences(userId)
    
    // Create in-app notification if enabled
    let notification = null
    if (this.shouldSendInApp(preferences, type)) {
      notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          metadata,
          ...relatedIds
        }
      })

      // Trigger real-time update
      await this.triggerRealtimeUpdate(userId, notification)
    }

    // Queue email if enabled
    if (this.shouldSendEmail(preferences, type)) {
      await sendNotificationEmail({
        userId,
        type,
        title,
        message,
        metadata
      })
    }

    return notification
  }

  static async markAsRead(notificationIds: string[], userId: string) {
    return prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId // Ensure user owns these notifications
      },
      data: {
        read: true,
        readAt: new Date()
      }
    })
  }

  static async getUserNotifications(userId: string, limit = 20, offset = 0) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        application: {
          include: {
            project: true
          }
        },
        post: true,
        project: true,
        comment: true
      }
    })
  }

  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        read: false
      }
    })
  }

  private static async getUserPreferences(userId: string) {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId }
    })

    // Return defaults if no preferences set
    if (!prefs) {
      return {
        emailEnabled: true,
        inAppEnabled: true,
        emailTypes: {},
        inAppTypes: {}
      }
    }

    return prefs
  }

  private static shouldSendInApp(preferences: any, type: NotificationType): boolean {
    if (!preferences.inAppEnabled) return false
    
    const typePrefs = preferences.inAppTypes as Record<string, boolean>
    return typePrefs[type] !== false // Default to true if not specified
  }

  private static shouldSendEmail(preferences: any, type: NotificationType): boolean {
    if (!preferences.emailEnabled) return false
    
    const typePrefs = preferences.emailTypes as Record<string, boolean>
    return typePrefs[type] !== false // Default to true if not specified
  }

  private static async triggerRealtimeUpdate(userId: string, notification: any) {
    // TODO: Implement Pusher/SSE trigger
    // Example with Pusher:
    // await pusher.trigger(`private-user-${userId}`, 'new-notification', {
    //   notification
    // })
  }
}
```

### 2. Email Service with Resend

```typescript
// src/services/email.service.ts
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'
import { 
  ApplicationReceivedEmail,
  ApplicationStatusEmail,
  NewAnswerEmail 
} from '@/emails'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface EmailParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, any>
}

export async function sendNotificationEmail(params: EmailParams) {
  const { userId, type, metadata } = params
  
  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true }
  })

  if (!user?.email) return

  try {
    // Queue the email for sending
    await prisma.emailQueue.create({
      data: {
        userId,
        type,
        to: user.email,
        subject: getEmailSubject(type, metadata),
        htmlContent: await renderEmailHtml(type, user, metadata),
        textContent: await renderEmailText(type, user, metadata),
        metadata
      }
    })
  } catch (error) {
    console.error('Failed to queue email:', error)
  }
}

// Process email queue (called by worker)
export async function processEmailQueue() {
  const emails = await prisma.emailQueue.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: new Date() }
    },
    take: 10
  })

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: 'MAIX <notifications@maix.io>',
        to: email.to,
        subject: email.subject,
        html: email.htmlContent,
        text: email.textContent
      })

      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { 
          status: 'SENT',
          sentAt: new Date()
        }
      })
    } catch (error) {
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { 
          status: 'FAILED',
          attempts: email.attempts + 1,
          error: error.message
        }
      })
    }
  }
}

function getEmailSubject(type: NotificationType, metadata: any): string {
  switch (type) {
    case 'APPLICATION_NEW':
      return 'New volunteer application'
    case 'APPLICATION_ACCEPTED':
      return 'Your application was accepted!'
    case 'APPLICATION_REJECTED':
      return 'Application update'
    case 'ANSWER_NEW':
      return 'New answer to your question'
    default:
      return 'New notification from MAIX'
  }
}

async function renderEmailHtml(type: NotificationType, user: any, metadata: any): string {
  // Use React Email components
  switch (type) {
    case 'APPLICATION_NEW':
      return renderToString(
        ApplicationReceivedEmail({
          userName: user.name || 'there',
          projectName: metadata?.projectName,
          applicantName: metadata?.applicantName,
          projectId: metadata?.projectId
        })
      )
    // ... other cases
  }
}
```

### 3. React Email Templates

```tsx
// src/emails/ApplicationReceived.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ApplicationReceivedEmailProps {
  userName: string
  projectName: string
  applicantName: string
  projectId: string
}

export const ApplicationReceivedEmail = ({
  userName,
  projectName,
  applicantName,
  projectId
}: ApplicationReceivedEmailProps) => {
  const previewText = `${applicantName} wants to volunteer for ${projectName}`
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>
              Assalamu alaikum {userName}!
            </Heading>
            
            <Text style={paragraph}>
              Good news! <strong>{applicantName}</strong> has applied to volunteer 
              for your project "{projectName}".
            </Text>

            <Text style={paragraph}>
              Review their application to see if they're a good fit for your project.
            </Text>

            <Button
              style={button}
              href={`${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}/volunteers`}
            >
              Review Application
            </Button>

            <Text style={footer}>
              May Allah bless your project with success.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const box = {
  padding: '0 48px',
}

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1E3A8A',
  margin: '40px 0 20px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  margin: '16px 0',
}

const button = {
  backgroundColor: '#1E3A8A',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '32px 0',
}

const footer = {
  fontSize: '14px',
  color: '#6B7280',
  marginTop: '32px',
  fontStyle: 'italic',
}
```

## API Implementation

### Notification Endpoints

```typescript
// src/app/api/notifications/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { NotificationService } from '@/services/notification.service'

// GET /api/notifications
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const notifications = await NotificationService.getUserNotifications(
      user.id,
      limit,
      offset
    )

    const unreadCount = await NotificationService.getUnreadCount(user.id)

    return NextResponse.json({
      notifications,
      unreadCount,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/mark-read
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { notificationIds } = await request.json()

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Invalid notification IDs' },
        { status: 400 }
      )
    }

    await NotificationService.markAsRead(notificationIds, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}
```

### Preference Management

```typescript
// src/app/api/notifications/preferences/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// GET /api/notifications/preferences
export async function GET() {
  try {
    const user = await requireAuth()
    
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: user.id }
    })

    // Return defaults if not found
    if (!preferences) {
      return NextResponse.json({
        emailEnabled: true,
        inAppEnabled: true,
        emailTypes: {},
        inAppTypes: {},
        emailDigest: 'DAILY'
      })
    }

    return NextResponse.json(preferences)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/preferences
export async function PUT(request: Request) {
  try {
    const user = await requireAuth()
    const updates = await request.json()

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...updates
      },
      update: updates
    })

    return NextResponse.json(preferences)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
```

## Integration Points

### 1. When Application is Submitted

```typescript
// Update /src/app/api/projects/[id]/apply/route.ts
import { NotificationService } from '@/services/notification.service'

// After creating application:
await NotificationService.create({
  userId: project.ownerId,
  type: 'APPLICATION_NEW',
  title: 'New volunteer application',
  message: `${user.name || user.email} has applied to volunteer for ${project.name}`,
  metadata: {
    projectName: project.name,
    applicantName: user.name || user.email,
    projectId: project.id
  },
  relatedIds: {
    applicationId: newApplication.id,
    projectId: project.id
  }
})
```

### 2. When Application Status Changes

```typescript
// Update /src/app/api/applications/[id]/route.ts
if (status === 'ACCEPTED' || status === 'REJECTED') {
  await NotificationService.create({
    userId: application.userId,
    type: status === 'ACCEPTED' ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
    title: `Application ${status.toLowerCase()}`,
    message: `Your application for "${application.project.name}" has been ${status.toLowerCase()}`,
    metadata: {
      projectName: application.project.name,
      projectId: application.projectId
    },
    relatedIds: {
      applicationId: application.id,
      projectId: application.projectId
    }
  })
}
```

### 3. When Answer is Posted

```typescript
// Update /src/app/api/posts/route.ts
if (type === 'ANSWER' && parentId) {
  const question = await prisma.post.findUnique({
    where: { id: parentId },
    include: { author: true }
  })
  
  if (question && question.authorId !== user.id) {
    await NotificationService.create({
      userId: question.authorId,
      type: 'ANSWER_NEW',
      title: 'New answer to your question',
      message: `${user.name} answered your question`,
      metadata: {
        questionTitle: question.content.substring(0, 100),
        answererName: user.name,
        postId: parentId
      },
      relatedIds: {
        postId: newPost.id
      }
    })
  }
}
```

## UI Components

### Notification Dropdown

```tsx
// src/components/notifications/NotificationDropdown.tsx
'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })
      
      setNotifications(notifications.map(n => 
        notificationIds.includes(n.id) ? { ...n, read: true } : n
      ))
      setUnreadCount(Math.max(0, unreadCount - notificationIds.length))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead([notification.id])
    }

    // Navigate based on type
    switch (notification.type) {
      case 'APPLICATION_NEW':
        router.push(`/projects/${notification.projectId}/volunteers`)
        break
      case 'APPLICATION_ACCEPTED':
      case 'APPLICATION_REJECTED':
        router.push(`/projects/${notification.projectId}`)
        break
      case 'ANSWER_NEW':
        router.push(`/q-and-a/${notification.postId}`)
        break
    }
    
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <h3 className="font-semibold mb-2">Notifications</h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No notifications yet
            </p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start p-3 cursor-pointer ${
                    !notification.read ? 'bg-accent/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="font-medium text-sm">{notification.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {notification.message}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { 
                      addSuffix: true 
                    })}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Real-time Updates Hook

```typescript
// src/hooks/useNotifications.ts
import { useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Pusher from 'pusher-js'

export function useNotifications(onNewNotification: (notification: any) => void) {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user?.id) return

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const channel = pusher.subscribe(`private-user-${session.user.id}`)
    
    channel.bind('new-notification', (data: any) => {
      onNewNotification(data.notification)
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
      pusher.disconnect()
    }
  }, [session?.user?.id, onNewNotification])
}
```

## Environment Variables

```env
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=notifications@maix.io

# Real-time (Pusher) - if not already present
PUSHER_APP_ID=xxxxx
PUSHER_KEY=xxxxx
PUSHER_SECRET=xxxxx
PUSHER_CLUSTER=us2
NEXT_PUBLIC_PUSHER_KEY=xxxxx
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# Redis (for BullMQ queue)
REDIS_URL=redis://localhost:6379

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://maix.io
```

## Installation Commands

```bash
# Core dependencies
npm install resend @react-email/components

# Queue system (optional for Phase 1)
npm install bull bullmq ioredis

# Real-time (if not already installed)
npm install pusher pusher-js

# Run database migration
npx prisma migrate dev --name add-notifications
```

## Implementation Phases

### Phase 1: Core Infrastructure
- Add notification models to Prisma schema
- Create NotificationService class
- Implement basic in-app notifications
- Add notification creation to key triggers (applications, answers)
- Build notification dropdown UI
- Create API endpoints

**Deliverables:**
- Users see in-app notifications
- Notification badge with unread count
- Mark as read functionality
- Basic notification list

### Phase 2: Email Integration
- Set up Resend account and verify domain
- Create email service with queue
- Build React Email templates
- Add email sending to notification triggers
- Implement basic preference management

**Deliverables:**
- Users receive email notifications
- Beautiful HTML emails with Islamic greetings
- Basic on/off preferences
- Email delivery tracking

### Phase 3: Preferences & Real-time
- Full preference management UI
- Granular notification controls
- Integrate Pusher for real-time updates
- Add quiet hours support
- Email digest functionality

**Deliverables:**
- Real-time notification updates
- Detailed preference controls
- Respect for prayer times
- Daily/weekly digest emails

### Phase 4: Advanced Features
- Advanced email templates
- Notification analytics
- Performance optimization
- Additional notification types
- Mobile web push (future)

**Deliverables:**
- Rich notification experiences
- Usage analytics
- Optimized performance
- Extended notification coverage

## Islamic Considerations

### Design Elements
- **Greetings**: Use "Assalamu alaikum" in emails
- **Blessings**: Include appropriate du'as in email footers
- **Visual Design**: Align with Islamic color palette from main app

### Timing Considerations
- **Prayer Times**: Implement quiet hours that respect prayer times
- **Jummah**: Option to pause notifications during Friday prayers
- **Ramadan**: Reduced notification frequency during fasting hours
- **Hijri Calendar**: Awareness of Islamic dates and events

### Privacy & Modesty
- Strict controls on who can mention/notify users
- Gender-appropriate communication options
- Respect for user privacy preferences

## Security & Performance

### Security
- Verify email ownership before sending
- Rate limiting on notification creation
- Sanitize all user content in emails
- Implement unsubscribe tokens
- CSRF protection on preference updates

### Performance
- Database indexes on (userId, read, createdAt)
- Pagination for notification lists
- Batch similar notifications
- Queue email delivery
- Cache user preferences
- Archive old notifications

## Common Pitfalls to Avoid

1. **Don't send too many notifications** - Implement rate limiting
2. **Don't notify users of their own actions** - Check userId !== authorId
3. **Don't forget unsubscribe links** - Include in all emails
4. **Don't ignore preferences** - Always check before sending
5. **Don't send during quiet hours** - Respect prayer times
6. **Don't expose sensitive data** - Sanitize notification content
7. **Don't forget mobile view** - Test notification UI on mobile

## Testing Checklist

- [ ] In-app notifications appear immediately
- [ ] Unread count updates correctly
- [ ] Clicking notification navigates to correct page
- [ ] Email arrives within reasonable time
- [ ] Email renders correctly in major clients
- [ ] Preferences are respected
- [ ] Real-time updates work across tabs
- [ ] Queue retries failed emails
- [ ] Old notifications are archived
- [ ] Performance under load

## Success Metrics

- 📊 **Delivery Rate**: > 95% for both in-app and email
- 📧 **Email Open Rate**: > 40%
- ⏱️ **Real-time Delivery**: < 2 seconds
- 👤 **Preference Adoption**: > 60% of users customize
- 🔕 **Unsubscribe Rate**: < 5%
- 📱 **Mobile Engagement**: > 50% interact on mobile

## Conclusion

This notification system provides comprehensive coverage for MAIX's current and future needs. The phased approach allows for gradual implementation while the architecture supports future expansion. By combining in-app notifications with email, users stay engaged regardless of their usage patterns, while Islamic considerations ensure the system respects community values.