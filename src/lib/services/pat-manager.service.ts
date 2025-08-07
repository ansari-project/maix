import { prisma } from '@/lib/prisma'
import { generateSecureToken, hashToken, encrypt } from '@/lib/utils/encryption'
import type { PersonalAccessToken, User } from '@prisma/client'

const PAT_EXPIRY_DAYS = 90
const PAT_REFRESH_THRESHOLD_DAYS = 7 // Refresh if expiring within 7 days

export interface PatWithToken extends PersonalAccessToken {
  plainToken?: string
}

/**
 * Gets or creates an Event Manager PAT for a user
 * Auto-generates a new PAT if none exists or if expired
 * Auto-refreshes if expiring soon
 */
export async function getOrCreateEventManagerPat(userId: string): Promise<PatWithToken> {
  // Check if user has preferences
  let preferences = await prisma.userPreferences.findUnique({
    where: { userId },
    include: { eventManagerPat: true }
  })

  // Create preferences if they don't exist
  if (!preferences) {
    preferences = await prisma.userPreferences.create({
      data: { userId },
      include: { eventManagerPat: true }
    })
  }

  const now = new Date()
  const refreshThreshold = new Date(now.getTime() + PAT_REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)

  // Check if existing PAT is valid and not expiring soon
  if (preferences.eventManagerPat) {
    const pat = preferences.eventManagerPat
    
    // Check if expired
    if (pat.expiresAt && pat.expiresAt < now) {
      // Delete expired PAT
      await prisma.personalAccessToken.delete({
        where: { id: pat.id }
      })
    } else if (pat.expiresAt && pat.expiresAt < refreshThreshold) {
      // Refresh expiring PAT
      return await refreshEventManagerPat(userId, pat.id)
    } else {
      // PAT is valid and not expiring soon
      return pat
    }
  }

  // Generate new PAT
  return await createEventManagerPat(userId)
}

/**
 * Creates a new Event Manager PAT for a user
 */
async function createEventManagerPat(userId: string): Promise<PatWithToken> {
  const plainToken = generateSecureToken(32)
  const tokenHash = hashToken(plainToken)
  const expiresAt = new Date(Date.now() + PAT_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const pat = await prisma.personalAccessToken.create({
    data: {
      userId,
      tokenHash,
      name: 'Event Manager (Auto-generated)',
      scopes: ['events:manage', 'todos:manage', 'registrations:view'],
      isSystemGenerated: true,
      expiresAt,
      lastUsedAt: new Date()
    }
  })

  // Update user preferences to reference this PAT
  await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      eventManagerPatId: pat.id
    },
    update: {
      eventManagerPatId: pat.id
    }
  })

  // Return PAT with plain token (only provided on creation)
  return {
    ...pat,
    plainToken
  }
}

/**
 * Refreshes an expiring Event Manager PAT
 */
async function refreshEventManagerPat(userId: string, oldPatId: string): Promise<PatWithToken> {
  // Create new PAT
  const newPat = await createEventManagerPat(userId)

  // Delete old PAT (preferences will be updated by createEventManagerPat)
  await prisma.personalAccessToken.delete({
    where: { id: oldPatId }
  }).catch(() => {
    // Ignore if already deleted
  })

  return newPat
}

/**
 * Validates a PAT token and returns the associated user
 * Updates lastUsedAt timestamp on successful validation
 */
export async function validatePatToken(plainToken: string): Promise<User | null> {
  const tokenHash = hashToken(plainToken)

  const pat = await prisma.personalAccessToken.findFirst({
    where: {
      tokenHash,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    include: { user: true }
  })

  if (!pat) {
    return null
  }

  // Update last used timestamp
  await prisma.personalAccessToken.update({
    where: { id: pat.id },
    data: { lastUsedAt: new Date() }
  }).catch(() => {
    // Non-critical, ignore errors
  })

  return pat.user
}

/**
 * Revokes an Event Manager PAT
 */
export async function revokeEventManagerPat(userId: string): Promise<void> {
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { eventManagerPatId: true }
  })

  if (preferences?.eventManagerPatId) {
    // Delete the PAT
    await prisma.personalAccessToken.delete({
      where: { id: preferences.eventManagerPatId }
    })

    // Clear the reference in preferences
    await prisma.userPreferences.update({
      where: { userId },
      data: { eventManagerPatId: null }
    })
  }
}

/**
 * Gets the encrypted PAT for storage in client-side context
 * The encrypted token can be safely stored in localStorage or cookies
 */
export function encryptPatForStorage(plainToken: string): string {
  return encrypt(plainToken)
}

/**
 * Checks if a user has an active Event Manager PAT
 */
export async function hasActiveEventManagerPat(userId: string): Promise<boolean> {
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
    include: { eventManagerPat: true }
  })

  if (!preferences?.eventManagerPat) {
    return false
  }

  const pat = preferences.eventManagerPat
  const now = new Date()

  return !pat.expiresAt || pat.expiresAt > now
}