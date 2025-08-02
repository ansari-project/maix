# Phase 1 Notification System - Implementation Plan with Email

**Date**: 2025-01-23  
**Status**: Ready for Implementation  

## Overview

This document outlines the simplified notification system for MAIX Phase 1, including both in-app notifications and email notifications using Resend. Based on design analysis, we're keeping the schema simple while delivering comprehensive notification coverage.

## Core Principles

- **Simple over complex**: entityType/entityId pattern instead of polymorphic relations
- **Email included**: Since Resend is already implemented, include email notifications
- **Essential features**: 6 notification types covering core use cases
- **Synchronous email**: No queue complexity for MVP

## Schema Design

```prisma
// Add to prisma/schema.prisma

enum NotificationType {
  // Applications
  APPLICATION_NEW        // Someone applied to your project
  APPLICATION_ACCEPTED   // Your application was accepted
  APPLICATION_REJECTED   // Your application was rejected
  
  // Q&A
  ANSWER_NEW            // Someone answered your question
  NEW_QUESTION          // New question posted (for followers)
  
  // Projects
  NEW_PROJECT           // New project needs volunteers
}

model Notification {
  id          String           @id @default(cuid())
  type        NotificationType
  title       String
  message     String           @db.Text
  entityType  String           // "application", "post", "project"
  entityId    String           // ID of related entity
  read        Boolean          @default(false)
  readAt      DateTime?
  createdAt   DateTime         @default(now())
  
  // User who receives the notification
  userId      String
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Direct relation to project (most common case)
  projectId   String?
  project     Project?         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([userId, read, createdAt])
  @@index([userId, createdAt])
  @@map("notifications")
}

// Simple preferences - just email on/off for MVP
model NotificationPreference {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  emailEnabled Boolean  @default(true)
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@map("notification_preferences")
}

// Update existing models
model User {
  // ... existing fields
  notifications          Notification[]
  notificationPreference NotificationPreference?
}

model Project {
  // ... existing fields
  notifications Notification[]
}
```

## Service Implementation

```typescript
// src/services/notification.service.ts
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'
import { sendNotificationEmail } from './email.service'

export class NotificationService {
  // Create notification and optionally send email
  private static async createNotification(data: {
    type: NotificationType
    userId: string
    title: string
    message: string
    entityType: string
    entityId: string
    projectId?: string
    emailData?: any // Additional data for email template
  }) {
    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        userId: data.userId,
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
        projectId: data.projectId
      }
    })

    // Check if user wants email notifications
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId: data.userId }
    })

    if (preference?.emailEnabled ?? true) {
      // Send email (fire and forget for MVP)
      sendNotificationEmail({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        ...data.emailData
      }).catch(error => {
        console.error('Failed to send notification email:', error)
      })
    }

    return notification
  }

  // Type-safe creator methods
  static async createApplicationNew(data: {
    projectOwnerId: string
    applicantName: string
    applicantEmail: string
    projectId: string
    projectName: string
    applicationId: string
    applicationMessage: string
  }) {
    return this.createNotification({
      type: 'APPLICATION_NEW',
      userId: data.projectOwnerId,
      title: 'New volunteer application',
      message: `${data.applicantName} has applied to volunteer for ${data.projectName}`,
      entityType: 'application',
      entityId: data.applicationId,
      projectId: data.projectId,
      emailData: {
        applicantName: data.applicantName,
        applicantEmail: data.applicantEmail,
        projectName: data.projectName,
        projectId: data.projectId,
        applicationMessage: data.applicationMessage
      }
    })
  }

  static async createApplicationStatusChanged(data: {
    applicantId: string
    projectName: string
    projectId: string
    applicationId: string
    accepted: boolean
  }) {
    return this.createNotification({
      type: data.accepted ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
      userId: data.applicantId,
      title: data.accepted ? 'Application accepted!' : 'Application update',
      message: `Your application for "${data.projectName}" has been ${data.accepted ? 'accepted' : 'rejected'}`,
      entityType: 'application',
      entityId: data.applicationId,
      projectId: data.projectId,
      emailData: {
        projectName: data.projectName,
        projectId: data.projectId,
        accepted: data.accepted
      }
    })
  }

  static async createAnswerNew(data: {
    questionAuthorId: string
    answererName: string
    questionTitle: string
    questionId: string
    answerId: string
  }) {
    return this.createNotification({
      type: 'ANSWER_NEW',
      userId: data.questionAuthorId,
      title: 'New answer to your question',
      message: `${data.answererName} answered: "${data.questionTitle}"`,
      entityType: 'post',
      entityId: data.answerId,
      emailData: {
        answererName: data.answererName,
        questionTitle: data.questionTitle,
        questionId: data.questionId
      }
    })
  }

  static async createNewProject(data: {
    userId: string // User who might be interested
    projectName: string
    projectGoal: string
    projectId: string
    helpType: string
  }) {
    return this.createNotification({
      type: 'NEW_PROJECT',
      userId: data.userId,
      title: 'New project needs volunteers',
      message: `"${data.projectName}" is looking for ${data.helpType.toLowerCase()} help`,
      entityType: 'project',
      entityId: data.projectId,
      projectId: data.projectId,
      emailData: {
        projectName: data.projectName,
        projectGoal: data.projectGoal,
        projectId: data.projectId,
        helpType: data.helpType
      }
    })
  }

  static async createNewQuestion(data: {
    userId: string // User who might be interested
    questionTitle: string
    authorName: string
    questionId: string
  }) {
    return this.createNotification({
      type: 'NEW_QUESTION',
      userId: data.userId,
      title: 'New question in Q&A',
      message: `${data.authorName} asked: "${data.questionTitle}"`,
      entityType: 'post',
      entityId: data.questionId,
      emailData: {
        questionTitle: data.questionTitle,
        authorName: data.authorName,
        questionId: data.questionId
      }
    })
  }

  // Notification retrieval with multi-query hydration
  static async getUserNotifications(userId: string, limit = 20, offset = 0) {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        project: true
      }
    })

    // Collect entity IDs by type
    const applicationIds = new Set<string>()
    const postIds = new Set<string>()

    for (const n of notifications) {
      if (n.entityType === 'application') applicationIds.add(n.entityId)
      if (n.entityType === 'post') postIds.add(n.entityId)
    }

    // Fetch related entities in batch
    const [applications, posts] = await Promise.all([
      applicationIds.size > 0 
        ? prisma.application.findMany({ 
            where: { id: { in: [...applicationIds] } },
            include: { user: true }
          }) 
        : [],
      postIds.size > 0 
        ? prisma.post.findMany({ 
            where: { id: { in: [...postIds] } },
            include: { author: true }
          }) 
        : []
    ])

    // Create lookup maps
    const applicationMap = new Map(applications.map(a => [a.id, a]))
    const postMap = new Map(posts.map(p => [p.id, p]))

    // Attach related data
    return notifications.map(n => ({
      ...n,
      relatedEntity: 
        n.entityType === 'application' ? applicationMap.get(n.entityId) :
        n.entityType === 'post' ? postMap.get(n.entityId) :
        n.entityType === 'project' ? n.project :
        null
    }))
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

  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        read: false
      }
    })
  }
}
```

## Email Service

```typescript
// src/services/email.service.ts
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'
import { 
  ApplicationReceivedEmail,
  ApplicationStatusEmail,
  NewAnswerEmail,
  NewProjectEmail,
  NewQuestionEmail
} from '@/emails'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface EmailParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  [key: string]: any // Additional template-specific data
}

export async function sendNotificationEmail(params: EmailParams) {
  const { userId, type } = params
  
  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true }
  })

  if (!user?.email) return

  try {
    const emailHtml = await renderEmailTemplate(type, user, params)
    
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Maix <ai-noreply@maix.io>',
      to: user.email,
      subject: getEmailSubject(type, params),
      html: emailHtml
    })
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

function getEmailSubject(type: NotificationType, params: any): string {
  switch (type) {
    case 'APPLICATION_NEW':
      return `New volunteer application for ${params.projectName}`
    case 'APPLICATION_ACCEPTED':
      return 'Your application was accepted! 🎉'
    case 'APPLICATION_REJECTED':
      return 'Application update'
    case 'ANSWER_NEW':
      return 'New answer to your question'
    case 'NEW_PROJECT':
      return `New project: ${params.projectName}`
    case 'NEW_QUESTION':
      return 'New question in Q&A'
    default:
      return 'New notification from MAIX'
  }
}

async function renderEmailTemplate(type: NotificationType, user: any, params: any): Promise<string> {
  switch (type) {
    case 'APPLICATION_NEW':
      return ApplicationReceivedEmail({
        userName: user.name || 'there',
        ...params
      })
    case 'APPLICATION_ACCEPTED':
    case 'APPLICATION_REJECTED':
      return ApplicationStatusEmail({
        userName: user.name || 'there',
        ...params
      })
    case 'ANSWER_NEW':
      return NewAnswerEmail({
        userName: user.name || 'there',
        ...params
      })
    case 'NEW_PROJECT':
      return NewProjectEmail({
        userName: user.name || 'there',
        ...params
      })
    case 'NEW_QUESTION':
      return NewQuestionEmail({
        userName: user.name || 'there',
        ...params
      })
    default:
      throw new Error(`No email template for type: ${type}`)
  }
}
```

## Email Templates

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
import { baseStyles } from './styles'

interface ApplicationReceivedEmailProps {
  userName: string
  projectName: string
  applicantName: string
  applicantEmail: string
  projectId: string
  applicationMessage: string
}

export function ApplicationReceivedEmail({
  userName,
  projectName,
  applicantName,
  applicantEmail,
  projectId,
  applicationMessage
}: ApplicationReceivedEmailProps) {
  const previewText = `${applicantName} wants to volunteer for ${projectName}`
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={baseStyles.box}>
            <Heading style={baseStyles.heading}>
              Assalamu alaikum {userName}!
            </Heading>
            
            <Text style={baseStyles.paragraph}>
              Good news! <strong>{applicantName}</strong> ({applicantEmail}) has applied to volunteer 
              for your project "{projectName}".
            </Text>

            <Text style={baseStyles.paragraph}>
              <strong>Their message:</strong>
            </Text>
            
            <Section style={baseStyles.messageBox}>
              <Text style={baseStyles.paragraph}>
                {applicationMessage}
              </Text>
            </Section>

            <Button
              style={baseStyles.button}
              href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects/${projectId}/applications`}
            >
              Review Application
            </Button>

            <Text style={baseStyles.footer}>
              May Allah bless your project with success.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

```tsx
// src/emails/NewProject.tsx
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
import { baseStyles } from './styles'

interface NewProjectEmailProps {
  userName: string
  projectName: string
  projectGoal: string
  projectId: string
  helpType: string
}

export function NewProjectEmail({
  userName,
  projectName,
  projectGoal,
  projectId,
  helpType
}: NewProjectEmailProps) {
  const previewText = `New project needs ${helpType.toLowerCase()} help: ${projectName}`
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={baseStyles.box}>
            <Heading style={baseStyles.heading}>
              New volunteer opportunity!
            </Heading>
            
            <Text style={baseStyles.paragraph}>
              Assalamu alaikum {userName},
            </Text>
            
            <Text style={baseStyles.paragraph}>
              A new project has been posted that needs <strong>{helpType.toLowerCase()}</strong> help:
            </Text>

            <Section style={baseStyles.highlightBox}>
              <Text style={baseStyles.projectTitle}>
                {projectName}
              </Text>
              <Text style={baseStyles.paragraph}>
                {projectGoal}
              </Text>
            </Section>

            <Button
              style={baseStyles.button}
              href={`${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}`}
            >
              View Project
            </Button>

            <Text style={baseStyles.footer}>
              Make a difference in your community through meaningful tech contributions.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

```tsx
// src/emails/styles.ts
export const baseStyles = {
  main: {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
  },
  box: {
    padding: '0 48px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1E3A8A',
    margin: '40px 0 20px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#374151',
    margin: '16px 0',
  },
  button: {
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
  },
  footer: {
    fontSize: '14px',
    color: '#6B7280',
    marginTop: '32px',
    fontStyle: 'italic',
  },
  messageBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
  },
  highlightBox: {
    borderLeft: '4px solid #D97706',
    paddingLeft: '16px',
    margin: '24px 0',
  },
  projectTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1E3A8A',
    margin: '0 0 8px 0',
  }
}
```

## Integration Points

### 1. Application Submission
```typescript
// In /src/app/api/projects/[id]/apply/route.ts
await NotificationService.createApplicationNew({
  projectOwnerId: project.ownerId,
  applicantName: user.name || user.email,
  applicantEmail: user.email,
  projectId: project.id,
  projectName: project.name,
  applicationId: newApplication.id,
  applicationMessage: message
})
```

### 2. New Project Creation
```typescript
// In /src/app/api/projects/route.ts
// After creating project, notify active users who might be interested
// For MVP, just notify all active users (we can add skill matching later)
const activeUsers = await prisma.user.findMany({
  where: { 
    isActive: true,
    id: { not: user.id } // Don't notify the creator
  },
  select: { id: true }
})

// Create notifications for each user (batch later if needed)
for (const activeUser of activeUsers) {
  await NotificationService.createNewProject({
    userId: activeUser.id,
    projectName: newProject.name,
    projectGoal: newProject.goal,
    projectId: newProject.id,
    helpType: newProject.helpType
  })
}
```

### 3. New Question Posted
```typescript
// In /src/app/api/posts/route.ts
if (type === 'QUESTION') {
  // For MVP, notify all active users except the author
  const activeUsers = await prisma.user.findMany({
    where: { 
      isActive: true,
      id: { not: user.id }
    },
    select: { id: true }
  })

  for (const activeUser of activeUsers) {
    await NotificationService.createNewQuestion({
      userId: activeUser.id,
      questionTitle: content.substring(0, 100),
      authorName: user.name || 'Someone',
      questionId: newPost.id
    })
  }
}
```

## API Routes

```typescript
// src/app/api/notifications/preferences/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireAuth()
    
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId: user.id }
    })

    return NextResponse.json({
      emailEnabled: preference?.emailEnabled ?? true
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth()
    const { emailEnabled } = await request.json()

    const preference = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailEnabled
      },
      update: { emailEnabled }
    })

    return NextResponse.json(preference)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
```

## Implementation Steps

1. **Add schema changes** to `prisma/schema.prisma`
2. **Run migration**: `npx prisma migrate dev --name add-notifications`
3. **Create services** (notification and email)
4. **Create email templates** with React Email
5. **Create API routes** for notifications and preferences
6. **Add integration points** to existing APIs
7. **Create UI components** (dropdown and preferences toggle)
8. **Test all flows** including email delivery

## What We're Deferring

- ❌ Email queue (synchronous is fine for MVP)
- ❌ Real-time updates (polling is sufficient)
- ❌ Granular preferences (just on/off for now)
- ❌ Smart targeting (all users get new project/question notifications)
- ❌ Quiet hours / prayer time awareness
- ❌ Email digests

## Success Metrics

- Users receive both in-app and email notifications
- Email delivery rate > 95%
- Users can turn off email notifications
- All 6 notification types work correctly

## Estimated Implementation Time

- Schema & Migration: 30 minutes
- Service Layer: 2 hours
- Email Templates: 2 hours
- API Routes: 1 hour
- Integration Points: 2 hours
- UI Components: 2 hours
- Testing: 2 hours

**Total: ~1.5 days of focused work**