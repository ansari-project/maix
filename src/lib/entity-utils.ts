/**
 * Shared utilities for entity type handling in Following system
 */

import { FollowableType } from '@prisma/client'

/**
 * Get display label for entity type
 */
export function getEntityTypeLabel(entityType: FollowableType): string {
  switch (entityType) {
    case FollowableType.ORGANIZATION:
      return 'Organization'
    case FollowableType.PROJECT:
      return 'Project'
    case FollowableType.PRODUCT:
      return 'Product'
    default:
      return 'Item'
  }
}

/**
 * Get plural label for entity type
 */
export function getEntityTypePluralLabel(entityType: FollowableType): string {
  switch (entityType) {
    case FollowableType.ORGANIZATION:
      return 'Organizations'
    case FollowableType.PROJECT:
      return 'Projects'
    case FollowableType.PRODUCT:
      return 'Products'
    default:
      return 'Items'
  }
}

/**
 * Get user initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format relative time from date string
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 60) {
    return `${minutes} min ago`
  } else if (hours < 24) {
    return `${hours}h ago`
  } else if (days < 7) {
    return `${days}d ago`
  } else {
    return date.toLocaleDateString()
  }
}