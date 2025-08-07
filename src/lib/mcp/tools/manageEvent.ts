import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { MaixEventStatus } from '@prisma/client'
import { 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  getEvent,
  listOrganizationEvents,
  listPublicEvents,
  getEventStats,
  CreateEventSchema,
  UpdateEventSchema
} from '@/lib/services/event.service'

// Tool schemas
const CreateEventToolSchema = z.object({
  organizationId: z.string().describe('Organization ID that owns the event'),
  name: z.string().min(1).max(100).describe('Event name'),
  description: z.string().min(1).max(5000).describe('Event description with details about the purpose and activities'),
  date: z.string().describe('Event date in ISO 8601 format (e.g., 2025-09-15T14:00:00Z)'),
  venue: z.object({
    name: z.string().optional().describe('Venue name'),
    address: z.string().optional().describe('Venue address'),
    capacity: z.number().optional().describe('Venue capacity'),
    notes: z.string().optional().describe('Additional venue information')
  }).optional().describe('Venue information'),
  capacity: z.number().min(1).max(10000).optional().describe('Maximum number of attendees'),
  isPublic: z.boolean().default(true).describe('Whether the event is public (true) or organization-only (false)')
})

const UpdateEventToolSchema = z.object({
  eventId: z.string().describe('Event ID to update'),
  name: z.string().min(1).max(100).optional().describe('Updated event name'),
  description: z.string().min(1).max(5000).optional().describe('Updated event description'),
  date: z.string().optional().describe('Updated event date in ISO 8601 format'),
  venue: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    capacity: z.number().optional(),
    notes: z.string().optional()
  }).optional().describe('Updated venue information'),
  capacity: z.number().min(1).max(10000).optional().describe('Updated maximum attendees'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional().describe('Event status'),
  isPublic: z.boolean().optional().describe('Updated visibility setting')
})

const GetEventToolSchema = z.object({
  eventId: z.string().describe('Event ID to retrieve')
})

const ListEventsToolSchema = z.object({
  organizationId: z.string().optional().describe('Filter by organization ID'),
  status: z.array(z.enum(['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])).optional().describe('Filter by event status'),
  upcoming: z.boolean().optional().describe('Only show future events'),
  publicOnly: z.boolean().optional().describe('Only show public events'),
  limit: z.number().min(1).max(100).default(20).describe('Maximum number of events to return'),
  offset: z.number().min(0).default(0).describe('Number of events to skip')
})

const DeleteEventToolSchema = z.object({
  eventId: z.string().describe('Event ID to delete')
})

const GetEventStatsToolSchema = z.object({
  eventId: z.string().describe('Event ID to get statistics for')
})

/**
 * Create a new event
 */
export async function maix_create_event(
  params: z.input<typeof CreateEventToolSchema>,
  userId: string
) {
  try {
    const validatedParams = CreateEventToolSchema.parse(params)
    
    // Transform venue to venueJson
    const eventData = {
      ...validatedParams,
      venueJson: validatedParams.venue
    }
    delete (eventData as any).venue
    
    const event = await createEvent(userId, eventData)
    
    return {
      success: true,
      data: {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date,
        venue: event.venueJson,
        capacity: event.capacity,
        status: event.status,
        isPublic: event.isPublic,
        organizationName: (event as any).organization?.name,
        creatorName: (event as any).creator?.name,
        registrationCount: (event as any)._count?.registrations || 0,
        todoCount: (event as any)._count?.todos || 0
      },
      message: `Event "${event.name}" created successfully`
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create event'
    }
  }
}

/**
 * Update an existing event
 */
export async function maix_update_event(
  params: z.input<typeof UpdateEventToolSchema>,
  userId: string
) {
  try {
    const validatedParams = UpdateEventToolSchema.parse(params)
    const { eventId, ...updateData } = validatedParams
    
    // Transform venue to venueJson if provided
    if (updateData.venue) {
      (updateData as any).venueJson = updateData.venue
      delete (updateData as any).venue
    }
    
    const event = await updateEvent(userId, eventId, updateData)
    
    return {
      success: true,
      data: {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date,
        venue: event.venueJson,
        capacity: event.capacity,
        status: event.status,
        isPublic: event.isPublic,
        organizationName: (event as any).organization?.name,
        registrationCount: (event as any)._count?.registrations || 0,
        todoCount: (event as any)._count?.todos || 0
      },
      message: `Event "${event.name}" updated successfully`
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update event'
    }
  }
}

/**
 * Get event details
 */
export async function maix_get_event(
  params: z.input<typeof GetEventToolSchema>,
  userId: string | null
) {
  try {
    const validatedParams = GetEventToolSchema.parse(params)
    
    const event = await getEvent(userId, validatedParams.eventId)
    
    if (!event) {
      return {
        success: false,
        error: 'Event not found or you do not have permission to view it'
      }
    }
    
    // Get statistics if user has permission
    let stats = null
    if (userId) {
      try {
        stats = await getEventStats(validatedParams.eventId)
      } catch {
        // Ignore stats errors for non-organizers
      }
    }
    
    return {
      success: true,
      data: {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date,
        venue: event.venueJson,
        capacity: event.capacity,
        status: event.status,
        isPublic: event.isPublic,
        organizationName: (event as any).organization?.name,
        organizationSlug: (event as any).organization?.slug,
        creatorName: (event as any).creator?.name,
        registrationCount: (event as any)._count?.registrations || 0,
        todoCount: (event as any)._count?.todos || 0,
        stats: stats ? {
          confirmedRegistrations: stats.confirmedRegistrations,
          waitlistedRegistrations: stats.waitlistedRegistrations,
          totalTodos: stats.totalTodos,
          completedTodos: stats.completedTodos,
          capacityUsed: stats.capacityUsed
        } : undefined
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get event'
    }
  }
}

/**
 * List events with filters
 */
export async function maix_list_events(
  params: z.input<typeof ListEventsToolSchema>,
  userId: string | null
) {
  try {
    const validatedParams = ListEventsToolSchema.parse(params)
    
    let result
    
    if (validatedParams.publicOnly || !validatedParams.organizationId) {
      // List public events
      result = await listPublicEvents({
        upcoming: validatedParams.upcoming,
        limit: validatedParams.limit,
        offset: validatedParams.offset
      })
    } else {
      // List organization events
      result = await listOrganizationEvents(
        userId,
        validatedParams.organizationId,
        {
          status: validatedParams.status as MaixEventStatus[],
          upcoming: validatedParams.upcoming,
          limit: validatedParams.limit,
          offset: validatedParams.offset
        }
      )
    }
    
    return {
      success: true,
      data: {
        events: result.events.map(event => ({
          id: event.id,
          name: event.name,
          description: event.description.substring(0, 200) + (event.description.length > 200 ? '...' : ''),
          date: event.date,
          capacity: event.capacity,
          status: event.status,
          isPublic: event.isPublic,
          organizationName: (event as any).organization?.name,
          organizationSlug: (event as any).organization?.slug,
          registrationCount: (event as any)._count?.registrations || 0
        })),
        total: result.total
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to list events'
    }
  }
}

/**
 * Delete an event
 */
export async function maix_delete_event(
  params: z.input<typeof DeleteEventToolSchema>,
  userId: string
) {
  try {
    const validatedParams = DeleteEventToolSchema.parse(params)
    
    await deleteEvent(userId, validatedParams.eventId)
    
    return {
      success: true,
      message: 'Event deleted successfully'
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete event'
    }
  }
}

/**
 * Get event statistics
 */
export async function maix_get_event_stats(
  params: z.input<typeof GetEventStatsToolSchema>,
  userId: string
) {
  try {
    const validatedParams = GetEventStatsToolSchema.parse(params)
    
    // Check if user has permission to view event
    const event = await getEvent(userId, validatedParams.eventId)
    if (!event) {
      return {
        success: false,
        error: 'Event not found or you do not have permission to view it'
      }
    }
    
    const stats = await getEventStats(validatedParams.eventId)
    
    return {
      success: true,
      data: {
        eventName: event.name,
        totalRegistrations: stats.totalRegistrations,
        confirmedRegistrations: stats.confirmedRegistrations,
        waitlistedRegistrations: stats.waitlistedRegistrations,
        totalTodos: stats.totalTodos,
        completedTodos: stats.completedTodos,
        todoCompletionRate: stats.totalTodos > 0 
          ? Math.round((stats.completedTodos / stats.totalTodos) * 100) 
          : 0,
        capacityUsed: stats.capacityUsed,
        spotsAvailable: event.capacity 
          ? Math.max(0, event.capacity - stats.confirmedRegistrations)
          : null
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get event statistics'
    }
  }
}

// Export tool definitions for registration
export const eventTools = {
  maix_create_event: {
    description: 'Create a new event for an organization. Use this when planning a meetup, workshop, or any gathering.',
    parameters: CreateEventToolSchema,
    handler: maix_create_event
  },
  maix_update_event: {
    description: 'Update an existing event\'s details like name, date, venue, or status.',
    parameters: UpdateEventToolSchema,
    handler: maix_update_event
  },
  maix_get_event: {
    description: 'Get detailed information about a specific event including registrations and todos.',
    parameters: GetEventToolSchema,
    handler: maix_get_event
  },
  maix_list_events: {
    description: 'List events with optional filters by organization, status, or upcoming dates.',
    parameters: ListEventsToolSchema,
    handler: maix_list_events
  },
  maix_delete_event: {
    description: 'Delete an event (only for organization owners, cannot delete if registrations exist).',
    parameters: DeleteEventToolSchema,
    handler: maix_delete_event
  },
  maix_get_event_stats: {
    description: 'Get statistics about an event including registration counts and todo completion.',
    parameters: GetEventStatsToolSchema,
    handler: maix_get_event_stats
  }
}