import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { TodoStatus } from '@prisma/client'
import { 
  detectEventType, 
  generateEventTasks,
  EVENT_TASK_TEMPLATES
} from '@/lib/ai/event-assistant'

// Tool schemas
const GenerateEventTasksSchema = z.object({
  eventId: z.string().describe('Event ID to generate tasks for'),
  eventType: z.enum(['tech_meetup', 'workshop', 'networking', 'conference', 'hackathon']).optional().describe('Type of event for task template selection'),
  customTasks: z.array(z.object({
    title: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    dueDate: z.string().optional(),
    category: z.string().optional()
  })).optional().describe('Additional custom tasks to create')
})

const CreateEventWithTasksSchema = z.object({
  organizationId: z.string().describe('Organization ID'),
  name: z.string().describe('Event name'),
  description: z.string().describe('Event description'),
  date: z.string().describe('Event date in ISO format'),
  venue: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    capacity: z.number().optional()
  }).optional(),
  capacity: z.number().optional(),
  generateTasks: z.boolean().default(true).describe('Whether to auto-generate task checklist'),
  eventType: z.enum(['tech_meetup', 'workshop', 'networking', 'conference', 'hackathon']).optional()
})

const BulkCreateTasksSchema = z.object({
  eventId: z.string().describe('Event ID'),
  tasks: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    dueDate: z.string().optional(),
    labels: z.array(z.string()).optional()
  })).describe('Array of tasks to create')
})

/**
 * Generate tasks for an event based on its type
 */
export async function maix_generate_event_tasks(
  params: z.input<typeof GenerateEventTasksSchema>,
  userId: string
) {
  try {
    const validatedParams = GenerateEventTasksSchema.parse(params)
    
    // Get event details
    const event = await prisma.maixEvent.findUnique({
      where: { id: validatedParams.eventId },
      select: {
        id: true,
        name: true,
        description: true,
        date: true,
        organizationId: true
      }
    })
    
    if (!event) {
      return {
        success: false,
        error: 'Event not found'
      }
    }
    
    // Check permissions
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: event.organizationId,
          userId
        }
      }
    })
    
    if (!membership) {
      return {
        success: false,
        error: 'You do not have permission to manage this event'
      }
    }
    
    // Determine event type
    let eventType = validatedParams.eventType
    if (!eventType) {
      eventType = detectEventType(event.name + ' ' + event.description) || 'tech_meetup'
    }
    
    // Generate tasks based on template
    const templateTasks = generateEventTasks(
      eventType,
      new Date(event.date),
      event.id
    )
    
    // Create tasks in database
    const createdTasks = await Promise.all(
      templateTasks.map(task => 
        prisma.todo.create({
          data: {
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: TodoStatus.OPEN,
            eventId: event.id,
            creatorId: userId,
            assigneeId: userId
          }
        })
      )
    )
    
    // Add custom tasks if provided
    if (validatedParams.customTasks && validatedParams.customTasks.length > 0) {
      const customCreated = await Promise.all(
        validatedParams.customTasks.map(task =>
          prisma.todo.create({
            data: {
              title: task.title,
              description: `Priority: ${task.priority}${task.category ? `\nCategory: ${task.category}` : ''}`,
              dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
              status: TodoStatus.OPEN,
              eventId: event.id,
              creatorId: userId,
              assigneeId: userId
            }
          })
        )
      )
      createdTasks.push(...customCreated)
    }
    
    return {
      success: true,
      data: {
        eventName: event.name,
        eventType: eventType,
        tasksCreated: createdTasks.length,
        tasks: createdTasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          dueDate: t.dueDate,
          status: t.status
        }))
      },
      message: `Created ${createdTasks.length} tasks for your ${EVENT_TASK_TEMPLATES[eventType].name}`
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to generate tasks'
    }
  }
}

/**
 * Create an event and automatically generate tasks
 */
export async function maix_create_event_with_tasks(
  params: z.input<typeof CreateEventWithTasksSchema>,
  userId: string
) {
  try {
    const validatedParams = CreateEventWithTasksSchema.parse(params)
    
    // First create the event
    const { createEvent } = await import('@/lib/services/event.service')
    const eventData = {
      organizationId: validatedParams.organizationId,
      name: validatedParams.name,
      description: validatedParams.description,
      date: validatedParams.date,
      venueJson: validatedParams.venue,
      capacity: validatedParams.capacity,
      isPublic: true
    }
    
    const event = await createEvent(userId, eventData)
    
    // Generate tasks if requested
    let tasksCreated = 0
    if (validatedParams.generateTasks) {
      const taskResult = await maix_generate_event_tasks(
        {
          eventId: event.id,
          eventType: validatedParams.eventType
        },
        userId
      )
      
      if (taskResult.success) {
        tasksCreated = taskResult.data?.tasksCreated || 0
      }
    }
    
    return {
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          date: event.date,
          status: event.status
        },
        tasksCreated
      },
      message: tasksCreated > 0 
        ? `Event "${event.name}" created with ${tasksCreated} planning tasks!`
        : `Event "${event.name}" created successfully!`
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create event with tasks'
    }
  }
}

/**
 * Bulk create tasks for an event
 */
export async function maix_bulk_create_tasks(
  params: z.input<typeof BulkCreateTasksSchema>,
  userId: string
) {
  try {
    const validatedParams = BulkCreateTasksSchema.parse(params)
    
    // Check event exists and user has permission
    const event = await prisma.maixEvent.findUnique({
      where: { id: validatedParams.eventId },
      select: { organizationId: true }
    })
    
    if (!event) {
      return {
        success: false,
        error: 'Event not found'
      }
    }
    
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: event.organizationId,
          userId
        }
      }
    })
    
    if (!membership) {
      return {
        success: false,
        error: 'You do not have permission to manage this event'
      }
    }
    
    // Create all tasks
    const createdTasks = await Promise.all(
      validatedParams.tasks.map(task =>
        prisma.todo.create({
          data: {
            title: task.title,
            description: `${task.description || ''}${task.priority ? `\nPriority: ${task.priority}` : ''}${task.labels?.length ? `\nLabels: ${task.labels.join(', ')}` : ''}`.trim(),
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            status: TodoStatus.OPEN,
            eventId: validatedParams.eventId,
            creatorId: userId,
            assigneeId: userId
          }
        })
      )
    )
    
    return {
      success: true,
      data: {
        tasksCreated: createdTasks.length,
        tasks: createdTasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          dueDate: t.dueDate,
          status: t.status
        }))
      },
      message: `Created ${createdTasks.length} tasks successfully`
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create tasks'
    }
  }
}

// Export tool definitions
export const eventTaskTools = {
  maix_generate_event_tasks: {
    description: 'Generate a complete task checklist for an event based on its type (meetup, workshop, conference, etc.)',
    parameters: GenerateEventTasksSchema,
    handler: maix_generate_event_tasks
  },
  maix_create_event_with_tasks: {
    description: 'Create a new event and automatically generate appropriate planning tasks',
    parameters: CreateEventWithTasksSchema,
    handler: maix_create_event_with_tasks
  },
  maix_bulk_create_tasks: {
    description: 'Create multiple tasks for an event at once',
    parameters: BulkCreateTasksSchema,
    handler: maix_bulk_create_tasks
  }
}