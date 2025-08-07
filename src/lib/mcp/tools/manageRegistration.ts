import { z } from 'zod'
import {
  createRegistration,
  updateRegistration,
  cancelRegistration,
  listEventRegistrations,
  getRegistrationByEmail,
  getRegistrationStats,
  CreateRegistrationSchema,
  UpdateRegistrationSchema
} from '@/lib/services/registration.service'

// Tool schemas
const RegisterForEventSchema = z.object({
  eventId: z.string().describe('Event ID to register for'),
  name: z.string().min(1).max(100).describe('Attendee name'),
  email: z.string().email().describe('Attendee email address'),
  notes: z.string().max(500).optional().describe('Optional notes or dietary requirements')
})

const UpdateRegistrationToolSchema = z.object({
  registrationId: z.string().describe('Registration ID to update'),
  status: z.enum(['CONFIRMED', 'WAITLISTED', 'CANCELLED']).optional().describe('New registration status'),
  notes: z.string().max(500).optional().describe('Updated notes')
})

const CancelRegistrationSchema = z.object({
  registrationId: z.string().describe('Registration ID to cancel')
})

const ListRegistrationsSchema = z.object({
  eventId: z.string().describe('Event ID to list registrations for'),
  status: z.array(z.enum(['CONFIRMED', 'WAITLISTED', 'CANCELLED'])).optional().describe('Filter by registration status'),
  limit: z.number().min(1).max(100).default(50).describe('Maximum number of registrations to return'),
  offset: z.number().min(0).default(0).describe('Number of registrations to skip')
})

const CheckRegistrationSchema = z.object({
  eventId: z.string().describe('Event ID to check registration for'),
  email: z.string().email().describe('Email address to check')
})

const GetRegistrationStatsSchema = z.object({
  eventId: z.string().describe('Event ID to get registration statistics for')
})

/**
 * Register for an event
 */
export async function maix_register_for_event(
  params: z.input<typeof RegisterForEventSchema>,
  userId?: string
) {
  try {
    const validatedParams = RegisterForEventSchema.parse(params)
    
    const registration = await createRegistration(validatedParams, userId)
    
    const status = registration.status === 'CONFIRMED' 
      ? 'confirmed' 
      : registration.status === 'WAITLISTED'
      ? 'waitlisted'
      : 'pending'
    
    return {
      success: true,
      data: {
        id: registration.id,
        eventName: (registration as any).event?.name,
        eventDate: (registration as any).event?.date,
        name: registration.name,
        email: registration.email,
        status: registration.status,
        registeredAt: registration.createdAt,
        metadata: registration.metadata
      },
      message: status === 'confirmed'
        ? `Successfully registered for the event! Your registration is confirmed.`
        : status === 'waitlisted'
        ? `You've been added to the waitlist. We'll notify you if a spot becomes available.`
        : `Registration received and is being processed.`
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to register for event'
    }
  }
}

/**
 * Update a registration (organizer only)
 */
export async function maix_update_registration(
  params: z.input<typeof UpdateRegistrationToolSchema>,
  userId: string
) {
  try {
    const validatedParams = UpdateRegistrationToolSchema.parse(params)
    const { registrationId, ...updateData } = validatedParams
    
    const registration = await updateRegistration(userId, registrationId, updateData)
    
    return {
      success: true,
      data: {
        id: registration.id,
        name: registration.name,
        email: registration.email,
        status: registration.status,
        metadata: registration.metadata,
        eventName: (registration as any).event?.name,
        userName: (registration as any).user?.name
      },
      message: `Registration updated successfully`
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update registration'
    }
  }
}

/**
 * Cancel a registration
 */
export async function maix_cancel_registration(
  params: z.input<typeof CancelRegistrationSchema>,
  userId?: string
) {
  try {
    const validatedParams = CancelRegistrationSchema.parse(params)
    
    await cancelRegistration(validatedParams.registrationId, undefined, userId)
    
    return {
      success: true,
      message: 'Registration cancelled successfully'
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to cancel registration'
    }
  }
}

/**
 * List registrations for an event (organizer only)
 */
export async function maix_list_registrations(
  params: z.input<typeof ListRegistrationsSchema>,
  userId: string
) {
  try {
    const validatedParams = ListRegistrationsSchema.parse(params)
    
    const result = await listEventRegistrations(
      userId,
      validatedParams.eventId,
      {
        status: validatedParams.status as any,
        limit: validatedParams.limit,
        offset: validatedParams.offset
      }
    )
    
    return {
      success: true,
      data: {
        registrations: result.registrations.map(reg => ({
          id: reg.id,
          name: reg.name,
          email: reg.email,
          status: reg.status,
          registeredAt: reg.createdAt,
          metadata: reg.metadata,
          userName: (reg as any).user?.name,
          userEmail: (reg as any).user?.email
        })),
        total: result.total,
        summary: {
          total: result.total,
          confirmed: result.registrations.filter(r => r.status === 'CONFIRMED').length,
          waitlisted: result.registrations.filter(r => r.status === 'WAITLISTED').length,
          cancelled: result.registrations.filter(r => r.status === 'CANCELLED').length
        }
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to list registrations'
    }
  }
}

/**
 * Check if someone is registered for an event
 */
export async function maix_check_registration(
  params: z.input<typeof CheckRegistrationSchema>
) {
  try {
    const validatedParams = CheckRegistrationSchema.parse(params)
    
    const registration = await getRegistrationByEmail(
      validatedParams.eventId,
      validatedParams.email
    )
    
    if (!registration) {
      return {
        success: true,
        data: {
          isRegistered: false,
          message: 'Not registered for this event'
        }
      }
    }
    
    return {
      success: true,
      data: {
        isRegistered: true,
        registrationId: registration.id,
        status: registration.status,
        registeredAt: registration.createdAt,
        eventName: (registration as any).event?.name,
        eventDate: (registration as any).event?.date,
        message: registration.status === 'CONFIRMED'
          ? 'Registration confirmed'
          : registration.status === 'WAITLISTED'
          ? 'On waitlist'
          : 'Registration status: ' + registration.status
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to check registration'
    }
  }
}

/**
 * Get registration statistics for an event
 */
export async function maix_get_registration_stats(
  params: z.input<typeof GetRegistrationStatsSchema>,
  userId: string
) {
  try {
    const validatedParams = GetRegistrationStatsSchema.parse(params)
    
    const stats = await getRegistrationStats(validatedParams.eventId)
    
    return {
      success: true,
      data: {
        total: stats.total,
        confirmed: stats.confirmed,
        waitlisted: stats.waitlisted,
        cancelled: stats.cancelled,
        active: stats.confirmed + stats.waitlisted,
        confirmationRate: stats.total > 0 
          ? Math.round((stats.confirmed / stats.total) * 100)
          : 0,
        waitlistRate: stats.total > 0
          ? Math.round((stats.waitlisted / stats.total) * 100)
          : 0,
        cancellationRate: stats.total > 0
          ? Math.round((stats.cancelled / stats.total) * 100)
          : 0
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get registration statistics'
    }
  }
}

// Export tool definitions for registration
export const registrationTools = {
  maix_register_for_event: {
    description: 'Register someone for an event. Handles capacity limits and waitlisting automatically.',
    parameters: RegisterForEventSchema,
    handler: maix_register_for_event
  },
  maix_update_registration: {
    description: 'Update a registration status or notes (organizer only).',
    parameters: UpdateRegistrationToolSchema,
    handler: maix_update_registration
  },
  maix_cancel_registration: {
    description: 'Cancel a registration. Automatically promotes waitlisted attendees if space opens up.',
    parameters: CancelRegistrationSchema,
    handler: maix_cancel_registration
  },
  maix_list_registrations: {
    description: 'List all registrations for an event with optional status filter (organizer only).',
    parameters: ListRegistrationsSchema,
    handler: maix_list_registrations
  },
  maix_check_registration: {
    description: 'Check if someone is registered for an event by their email.',
    parameters: CheckRegistrationSchema,
    handler: maix_check_registration
  },
  maix_get_registration_stats: {
    description: 'Get registration statistics for an event including confirmation and cancellation rates.',
    parameters: GetRegistrationStatsSchema,
    handler: maix_get_registration_stats
  }
}