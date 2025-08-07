import { prisma } from '@/lib/prisma'
import { RegistrationStatus, type Registration, type User } from '@prisma/client'
import { z } from 'zod'

// Validation schemas
export const CreateRegistrationSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  notes: z.string().max(500).optional()
})

export const UpdateRegistrationSchema = z.object({
  status: z.nativeEnum(RegistrationStatus).optional(),
  notes: z.string().max(500).optional()
})

export type CreateRegistrationInput = z.infer<typeof CreateRegistrationSchema>
export type UpdateRegistrationInput = z.infer<typeof UpdateRegistrationSchema>

/**
 * Check if a user can manage registrations for an event
 * Must be organization member
 */
export async function canManageRegistrations(userId: string, eventId: string): Promise<boolean> {
  const event = await prisma.maixEvent.findUnique({
    where: { id: eventId },
    select: { organizationId: true }
  })
  
  if (!event) return false
  
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
 * Create a new registration for an event
 */
export async function createRegistration(
  input: CreateRegistrationInput,
  userId?: string
): Promise<Registration> {
  // Validate input
  const validatedInput = CreateRegistrationSchema.parse(input)
  
  // Check if event exists and is accepting registrations
  const event = await prisma.maixEvent.findUnique({
    where: { id: validatedInput.eventId },
    select: {
      id: true,
      status: true,
      capacity: true,
      isPublic: true,
      organizationId: true,
      _count: {
        select: {
          registrations: {
            where: {
              status: 'CONFIRMED'
            }
          }
        }
      }
    }
  })
  
  if (!event) {
    throw new Error('Event not found')
  }
  
  if (event.status !== 'PUBLISHED' && event.status !== 'IN_PROGRESS') {
    throw new Error('Event is not accepting registrations')
  }
  
  // Check if event is public or user has permission
  if (!event.isPublic && userId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: event.organizationId,
          userId
        }
      }
    })
    
    if (!membership) {
      throw new Error('This event is private to organization members')
    }
  } else if (!event.isPublic && !userId) {
    throw new Error('This event is private to organization members')
  }
  
  // Check for duplicate registration
  const existingRegistration = await prisma.registration.findFirst({
    where: {
      eventId: validatedInput.eventId,
      email: validatedInput.email,
      status: {
        not: 'CANCELLED'
      }
    }
  })
  
  if (existingRegistration) {
    throw new Error('You are already registered for this event')
  }
  
  // Determine registration status based on capacity
  let status: RegistrationStatus = 'CONFIRMED'
  if (event.capacity && event._count.registrations >= event.capacity) {
    status = 'WAITLISTED'
  }
  
  // Create registration
  const registration = await prisma.registration.create({
    data: {
      eventId: validatedInput.eventId,
      userId: userId || null,
      name: validatedInput.name,
      email: validatedInput.email,
      metadata: validatedInput.notes ? { notes: validatedInput.notes } : undefined,
      status
    },
    include: {
      event: {
        select: {
          name: true,
          date: true
        }
      }
    }
  })
  
  return registration
}

/**
 * Update a registration (for organizers)
 */
export async function updateRegistration(
  userId: string,
  registrationId: string,
  input: UpdateRegistrationInput
): Promise<Registration> {
  // Validate input
  const validatedInput = UpdateRegistrationSchema.parse(input)
  
  // Get registration to check permissions
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { eventId: true }
  })
  
  if (!registration) {
    throw new Error('Registration not found')
  }
  
  // Check permissions
  const canManage = await canManageRegistrations(userId, registration.eventId)
  if (!canManage) {
    throw new Error('You do not have permission to manage registrations for this event')
  }
  
  // Update registration
  const updateData: any = {}
  if (validatedInput.status) updateData.status = validatedInput.status
  if (validatedInput.notes !== undefined) {
    updateData.metadata = { notes: validatedInput.notes }
  }
  
  const updatedRegistration = await prisma.registration.update({
    where: { id: registrationId },
    data: updateData,
    include: {
      event: {
        select: {
          name: true,
          date: true
        }
      },
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })
  
  // If changing from waitlisted to confirmed, check capacity
  if (validatedInput.status === 'CONFIRMED') {
    const event = await prisma.maixEvent.findUnique({
      where: { id: registration.eventId },
      select: {
        capacity: true,
        _count: {
          select: {
            registrations: {
              where: {
                status: 'CONFIRMED',
                id: {
                  not: registrationId
                }
              }
            }
          }
        }
      }
    })
    
    if (event?.capacity && event._count.registrations >= event.capacity) {
      // Revert the update
      await prisma.registration.update({
        where: { id: registrationId },
        data: { status: 'WAITLISTED' }
      })
      throw new Error('Cannot confirm registration - event is at capacity')
    }
  }
  
  return updatedRegistration
}

/**
 * Cancel a registration
 */
export async function cancelRegistration(
  registrationId: string,
  userEmail?: string,
  userId?: string
): Promise<void> {
  // Get registration
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      email: true,
      userId: true,
      eventId: true,
      status: true
    }
  })
  
  if (!registration) {
    throw new Error('Registration not found')
  }
  
  // Check if already cancelled
  if (registration.status === 'CANCELLED') {
    throw new Error('Registration is already cancelled')
  }
  
  // Check permissions - user can cancel their own registration
  if (userEmail && registration.email !== userEmail) {
    throw new Error('You can only cancel your own registration')
  }
  
  if (userId && registration.userId && registration.userId !== userId) {
    // Check if user is event organizer
    const canManage = await canManageRegistrations(userId, registration.eventId)
    if (!canManage) {
      throw new Error('You do not have permission to cancel this registration')
    }
  }
  
  // Cancel registration
  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: 'CANCELLED'
    }
  })
  
  // If there was a confirmed registration, check for waitlisted registrations to promote
  if (registration.status === 'CONFIRMED') {
    const nextWaitlisted = await prisma.registration.findFirst({
      where: {
        eventId: registration.eventId,
        status: 'WAITLISTED'
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    if (nextWaitlisted) {
      await prisma.registration.update({
        where: { id: nextWaitlisted.id },
        data: {
          status: 'CONFIRMED'
        }
      })
    }
  }
}

/**
 * List registrations for an event
 */
export async function listEventRegistrations(
  userId: string,
  eventId: string,
  options: {
    status?: RegistrationStatus[]
    limit?: number
    offset?: number
  } = {}
): Promise<{ registrations: Registration[], total: number }> {
  // Check permissions
  const canManage = await canManageRegistrations(userId, eventId)
  if (!canManage) {
    throw new Error('You do not have permission to view registrations for this event')
  }
  
  // Build where clause
  const where: any = { eventId }
  
  if (options.status && options.status.length > 0) {
    where.status = { in: options.status }
  }
  
  // Get total count
  const total = await prisma.registration.count({ where })
  
  // Get registrations
  const registrations = await prisma.registration.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true
        }
      }
    },
    orderBy: [
      { status: 'asc' }, // Confirmed first, then waitlisted, then cancelled
      { createdAt: 'asc' }
    ],
    take: options.limit || 50,
    skip: options.offset || 0
  })
  
  return { registrations, total }
}

/**
 * Get registration by email for an event
 */
export async function getRegistrationByEmail(
  eventId: string,
  email: string
): Promise<Registration | null> {
  const registration = await prisma.registration.findFirst({
    where: {
      eventId,
      email,
      status: {
        not: 'CANCELLED'
      }
    },
    include: {
      event: {
        select: {
          name: true,
          date: true,
          venueJson: true
        }
      }
    }
  })
  
  return registration
}

/**
 * Get registration statistics for an event
 */
export async function getRegistrationStats(eventId: string): Promise<{
  total: number
  confirmed: number
  waitlisted: number
  cancelled: number
}> {
  const stats = await prisma.registration.groupBy({
    by: ['status'],
    where: { eventId },
    _count: true
  })
  
  const result = {
    total: 0,
    confirmed: 0,
    waitlisted: 0,
    cancelled: 0
  }
  
  stats.forEach(stat => {
    result.total += stat._count
    switch (stat.status) {
      case 'CONFIRMED':
        result.confirmed = stat._count
        break
      case 'WAITLISTED':
        result.waitlisted = stat._count
        break
      case 'CANCELLED':
        result.cancelled = stat._count
        break
    }
  })
  
  return result
}