/**
 * Role Migration Utilities for UnifiedRole transition
 * 
 * This module provides utilities for the safe migration from OrgRole to UnifiedRole.
 * It implements the expand-and-contract pattern with dual-write capabilities.
 * 
 * IMPORTANT: This is RBAC work, completely separate from the following system.
 */

import { OrgRole, UnifiedRole } from '@prisma/client'

/**
 * Maps OrgRole to UnifiedRole
 * OWNER -> OWNER
 * MEMBER -> MEMBER
 */
export function mapOrgRoleToUnified(orgRole: OrgRole): UnifiedRole {
  switch (orgRole) {
    case 'OWNER':
      return UnifiedRole.OWNER
    case 'MEMBER':
      return UnifiedRole.MEMBER
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = orgRole
      throw new Error(`Unknown OrgRole: ${orgRole}`)
  }
}

/**
 * Maps UnifiedRole to OrgRole for backwards compatibility
 * OWNER -> OWNER
 * ADMIN -> MEMBER (degraded for compatibility)
 * MEMBER -> MEMBER
 * VIEWER -> MEMBER (elevated for safety)
 */
export function mapUnifiedToOrgRole(unifiedRole: UnifiedRole): OrgRole {
  switch (unifiedRole) {
    case UnifiedRole.OWNER:
      return 'OWNER'
    case UnifiedRole.ADMIN:
      // ADMIN doesn't exist in OrgRole, map to MEMBER
      return 'MEMBER'
    case UnifiedRole.MEMBER:
      return 'MEMBER'
    case UnifiedRole.VIEWER:
      // VIEWER doesn't exist in OrgRole, map to MEMBER for safety
      return 'MEMBER'
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = unifiedRole
      throw new Error(`Unknown UnifiedRole: ${unifiedRole}`)
  }
}

/**
 * Feature flag for role migration
 * Can be controlled via environment variable
 */
export function isRoleMigrationEnabled(): boolean {
  return process.env.ENABLE_ROLE_MIGRATION !== 'false'
}

/**
 * Monitoring function to detect role discrepancies
 * Logs warnings when role and unifiedRole don't match expected mapping
 */
export function checkRoleConsistency(
  role: OrgRole,
  unifiedRole: UnifiedRole | null,
  context: string
): void {
  if (!unifiedRole) {
    // unifiedRole not set yet, expected during migration
    return
  }

  const expectedUnified = mapOrgRoleToUnified(role)
  if (unifiedRole !== expectedUnified) {
    console.warn(`Role discrepancy detected in ${context}:`, {
      orgRole: role,
      unifiedRole,
      expected: expectedUnified,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * Prepares dual-write data for OrganizationMember creation/update
 * Ensures both role and unifiedRole are set correctly
 */
export function prepareDualWriteData(
  role: OrgRole | UnifiedRole,
  isUnifiedRole: boolean = false
): { role: OrgRole; unifiedRole: UnifiedRole } {
  if (!isRoleMigrationEnabled()) {
    // Migration not enabled, only set old role
    const orgRole = isUnifiedRole 
      ? mapUnifiedToOrgRole(role as UnifiedRole)
      : role as OrgRole
    return { 
      role: orgRole, 
      unifiedRole: mapOrgRoleToUnified(orgRole) 
    }
  }

  if (isUnifiedRole) {
    // Input is UnifiedRole, map backwards to OrgRole
    const unifiedRole = role as UnifiedRole
    return {
      role: mapUnifiedToOrgRole(unifiedRole),
      unifiedRole
    }
  } else {
    // Input is OrgRole, map forwards to UnifiedRole
    const orgRole = role as OrgRole
    return {
      role: orgRole,
      unifiedRole: mapOrgRoleToUnified(orgRole)
    }
  }
}

/**
 * Gets the effective role for permission checks
 * During migration, prefers unifiedRole if available
 */
export function getEffectiveUnifiedRole(
  role: OrgRole,
  unifiedRole: UnifiedRole | null
): UnifiedRole {
  if (isRoleMigrationEnabled() && unifiedRole) {
    return unifiedRole
  }
  return mapOrgRoleToUnified(role)
}