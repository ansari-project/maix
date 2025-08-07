import { prisma } from '@/lib/prisma'
import { MaixEventStatus, type MaixEvent, type Registration, type User } from '@prisma/client'
import { z } from 'zod'

// Validation schemas
export const CreateEventSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(5000),
  date: z.string().datetime(),
  venueJson: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    capacity: z.number().optional(),
    notes: z.string().optional()
  }).optional(),
  capacity: z.number().min(1).max(10000).optional(),
  isPublic: z.boolean().default(true)
})

export const UpdateEventSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(5000).optional(),
  date: z.string().datetime().optional(),
  venueJson: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    capacity: z.number().optional(),
    notes: z.string().optional()
  }).optional(),
  capacity: z.number().min(1).max(10000).optional(),
  status: z.nativeEnum(MaixEventStatus).optional(),
  isPublic: z.boolean().optional()
})

export type CreateEventInput = z.infer<typeof CreateEventSchema>
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>

/**
 * Check if a user can manage events for an organization
 * Must be organization admin or member
 */
export async function canManageEvents(userId: string, organizationId: string): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  })

  return membership !== null && (membership.role === 'OWNER' || membership.role === 'MEMBER')
}

/**
 * Check if a user can view events for an organization
 * Public events are viewable by all, private events require membership
 */
export async function canViewEvent(userId: string | null, eventId: string): Promise<boolean> {
  const event = await prisma.maixEvent.findUnique({
    where: { id: eventId },
    select: { 
      isPublic: true,
      organizationId: true
    }
  })

  if (!event) return false
  if (event.isPublic) return true
  if (!userId) return false

  // Check if user is organization member
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: event.organizationId,
        userId
      }
    }
  })

  return membership !== null
}

/**
 * Create a new event
 */
export async function createEvent(userId: string, input: CreateEventInput): Promise<MaixEvent> {
  // Validate input
  const validatedInput = CreateEventSchema.parse(input)

  // Check permissions
  const canManage = await canManageEvents(userId, validatedInput.organizationId)
  if (!canManage) {
    throw new Error('You do not have permission to create events for this organization')
  }

  // Create event
  const event = await prisma.maixEvent.create({
    data: {
      ...validatedInput,
      date: new Date(validatedInput.date),
      createdBy: userId,
      status: MaixEventStatus.DRAFT
    },
    include: {
      organization: {
        select: { name: true }
      },
      creator: {
        select: { name: true, email: true }
      },
      _count: {
        select: {
          registrations: true,
          todos: true
        }
      }
    }
  })

  return event
}

/**
 * Update an existing event
 */
export async function updateEvent(userId: string, eventId: string, input: UpdateEventInput): Promise<MaixEvent> {
  // Validate input
  const validatedInput = UpdateEventSchema.parse(input)

  // Get event to check permissions
  const event = await prisma.maixEvent.findUnique({
    where: { id: eventId },
    select: { organizationId: true }
  })

  if (!event) {
    throw new Error('Event not found')
  }

  // Check permissions
  const canManage = await canManageEvents(userId, event.organizationId)
  if (!canManage) {
    throw new Error('You do not have permission to update this event')
  }

  // Prepare update data
  const updateData: any = { ...validatedInput }
  if (validatedInput.date) {
    updateData.date = new Date(validatedInput.date)
  }

  // Update event
  const updatedEvent = await prisma.maixEvent.update({
    where: { id: eventId },
    data: updateData,
    include: {
      organization: {
        select: { name: true }
      },
      creator: {
        select: { name: true, email: true }
      },
      _count: {
        select: {
          registrations: true,
          todos: true
        }
      }
    }
  })

  return updatedEvent
}

/**
 * Delete an event
 */
export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  // Get event to check permissions
  const event = await prisma.maixEvent.findUnique({
    where: { id: eventId },
    select: { 
      organizationId: true,
      status: true
    }
  })

  if (!event) {
    throw new Error('Event not found')
  }

  // Check permissions - must be admin
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: event.organizationId,
        userId
      }
    }
  })

  if (!membership || membership.role !== 'OWNER') {
    throw new Error('Only organization owners can delete events')
  }

  // Don't allow deletion of events with registrations (unless CANCELLED)
  if (event.status !== MaixEventStatus.CANCELLED) {
    const registrationCount = await prisma.registration.count({
      where: { eventId }
    })

    if (registrationCount > 0) {
      throw new Error('Cannot delete event with existing registrations. Cancel the event first.')
    }
  }

  // Delete event (cascades to registrations, conversations, todos, posts)
  await prisma.maixEvent.delete({
    where: { id: eventId }
  })
}

/**
 * Get a single event
 */
export async function getEvent(userId: string | null, eventId: string): Promise<MaixEvent | null> {
  // Check view permissions
  const canView = await canViewEvent(userId, eventId)
  if (!canView) {
    return null
  }

  const event = await prisma.maixEvent.findUnique({
    where: { id: eventId },
    include: {
      organization: {
        select: { name: true, slug: true }
      },
      creator: {
        select: { name: true, email: true, image: true }
      },
      _count: {
        select: {
          registrations: {
            where: {
              status: 'CONFIRMED'
            }
          },
          todos: {
            where: {
              status: { not: 'COMPLETED' }
            }
          }
        }
      }
    }
  })

  return event
}

/**
 * List events for an organization
 */
export async function listOrganizationEvents(
  userId: string | null,
  organizationId: string,
  options: {
    status?: MaixEventStatus[]
    upcoming?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ events: MaixEvent[], total: number }> {
  // Build where clause
  const where: any = { organizationId }

  // Check if user can see private events
  const membership = userId ? await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  }) : null

  // If not a member, only show public events
  if (!membership) {
    where.isPublic = true
  }

  // Filter by status
  if (options.status && options.status.length > 0) {
    where.status = { in: options.status }
  }

  // Filter upcoming events
  if (options.upcoming) {
    where.date = { gte: new Date() }
  }

  // Get total count
  const total = await prisma.maixEvent.count({ where })

  // Get events
  const events = await prisma.maixEvent.findMany({
    where,
    include: {
      organization: {
        select: { name: true, slug: true }
      },
      creator: {
        select: { name: true, email: true }
      },
      _count: {
        select: {
          registrations: {
            where: {
              status: 'CONFIRMED'
            }
          },
          todos: true
        }
      }
    },
    orderBy: [
      { date: 'asc' },
      { createdAt: 'desc' }
    ],
    take: options.limit || 20,
    skip: options.offset || 0
  })

  return { events, total }
}

/**
 * List all public events (for discovery)
 */
export async function listPublicEvents(
  options: {
    upcoming?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ events: MaixEvent[], total: number }> {
  // Build where clause
  const where: any = {
    isPublic: true,
    status: { in: [MaixEventStatus.PUBLISHED, MaixEventStatus.IN_PROGRESS] }
  }

  // Filter upcoming events
  if (options.upcoming) {
    where.date = { gte: new Date() }
  }

  // Get total count
  const total = await prisma.maixEvent.count({ where })

  // Get events
  const events = await prisma.maixEvent.findMany({
    where,
    include: {
      organization: {
        select: { name: true, slug: true }
      },
      creator: {
        select: { name: true }
      },
      _count: {
        select: {
          registrations: {
            where: {
              status: 'CONFIRMED'
            }
          }
        }
      }
    },
    orderBy: [
      { date: 'asc' },
      { createdAt: 'desc' }
    ],
    take: options.limit || 20,
    skip: options.offset || 0
  })

  return { events, total }
}

/**
 * Get event statistics
 */
export async function getEventStats(eventId: string): Promise<{
  totalRegistrations: number
  confirmedRegistrations: number
  waitlistedRegistrations: number
  totalTodos: number
  completedTodos: number
  capacityUsed: number
}> {
  const [event, registrationStats, todoStats] = await Promise.all([
    prisma.maixEvent.findUnique({
      where: { id: eventId },
      select: { capacity: true }
    }),
    prisma.registration.groupBy({
      by: ['status'],
      where: { eventId },
      _count: true
    }),
    prisma.todo.groupBy({
      by: ['status'],
      where: { eventId },
      _count: true
    })
  ])

  const stats = {
    totalRegistrations: 0,
    confirmedRegistrations: 0,
    waitlistedRegistrations: 0,
    totalTodos: 0,
    completedTodos: 0,
    capacityUsed: 0
  }

  // Process registration stats
  registrationStats.forEach(stat => {
    stats.totalRegistrations += stat._count
    if (stat.status === 'CONFIRMED') {
      stats.confirmedRegistrations = stat._count
    } else if (stat.status === 'WAITLISTED') {
      stats.waitlistedRegistrations = stat._count
    }
  })

  // Process todo stats
  todoStats.forEach(stat => {
    stats.totalTodos += stat._count
    if (stat.status === 'COMPLETED') {
      stats.completedTodos = stat._count
    }
  })

  // Calculate capacity used
  if (event?.capacity) {
    stats.capacityUsed = Math.round((stats.confirmedRegistrations / event.capacity) * 100)
  }

  return stats
}