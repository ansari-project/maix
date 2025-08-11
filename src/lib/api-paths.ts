/**
 * Centralized API path utilities for Following system
 * 
 * This ensures consistency between frontend API calls and backend routes.
 * All Following API endpoints are under /api/following/ (not /api/v1/).
 */

import { FollowableType } from '@prisma/client'

/**
 * Map FollowableType enum to URL path segment
 */
function mapTypeToPath(type: FollowableType): string {
  switch (type) {
    case FollowableType.ORGANIZATION:
      return 'organization'
    case FollowableType.PROJECT:
      return 'project'
    case FollowableType.PRODUCT:
      return 'product'
    default:
      throw new Error(`Unsupported entity type: ${type}`)
  }
}

/**
 * Following system API paths
 */
export const followingApiPaths = {
  /**
   * Get followers for an entity or create new subscription
   * GET/POST /api/following/{type}/{id}/followers
   */
  followers: (type: FollowableType, id: string) => 
    `/api/following/${mapTypeToPath(type)}/${id}/followers`,

  /**
   * Get/Update/Delete current user's subscription to an entity
   * GET/PATCH/DELETE /api/following/{type}/{id}/followers/me
   */
  mySubscription: (type: FollowableType, id: string) => 
    `/api/following/${mapTypeToPath(type)}/${id}/followers/me`,

  /**
   * Get following status for current user
   * GET /api/following/{type}/{id}/followers/me/status
   */
  myStatus: (type: FollowableType, id: string) => 
    `/api/following/${mapTypeToPath(type)}/${id}/followers/me/status`,

  /**
   * Get current user's subscriptions
   * GET /api/following/user
   */
  userSubscriptions: () => '/api/following/user',

  /**
   * Batch check following status for multiple entities
   * POST /api/following/batch-check
   */
  batchCheck: () => '/api/following/batch-check',
} as const