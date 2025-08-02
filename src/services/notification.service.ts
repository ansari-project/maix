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
            where: { id: { in: Array.from(applicationIds) } },
            include: { user: true }
          }) 
        : [],
      postIds.size > 0 
        ? prisma.post.findMany({ 
            where: { id: { in: Array.from(postIds) } },
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