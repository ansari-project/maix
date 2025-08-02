import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'
import * as React from 'react'
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
    const emailComponent = getEmailComponent(type, user, params)
    
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Maix <ai-noreply@maix.io>',
      to: user.email,
      subject: getEmailSubject(type, params),
      react: emailComponent
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
      return 'New notification from Maix'
  }
}

function getEmailComponent(type: NotificationType, user: any, params: any): React.ReactElement {
  switch (type) {
    case 'APPLICATION_NEW':
      return React.createElement(ApplicationReceivedEmail, {
        userName: user.name || 'there',
        ...params
      })
    case 'APPLICATION_ACCEPTED':
    case 'APPLICATION_REJECTED':
      return React.createElement(ApplicationStatusEmail, {
        userName: user.name || 'there',
        ...params
      })
    case 'ANSWER_NEW':
      return React.createElement(NewAnswerEmail, {
        userName: user.name || 'there',
        ...params
      })
    case 'NEW_PROJECT':
      return React.createElement(NewProjectEmail, {
        userName: user.name || 'there',
        ...params
      })
    case 'NEW_QUESTION':
      return React.createElement(NewQuestionEmail, {
        userName: user.name || 'there',
        ...params
      })
    default:
      throw new Error(`No email template for type: ${type}`)
  }
}