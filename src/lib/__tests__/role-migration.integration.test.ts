/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

import { OrgRole, UnifiedRole } from '@prisma/client'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'
import { 
  mapOrgRoleToUnified, 
  mapUnifiedToOrgRole,
  prepareDualWriteData,
  getEffectiveUnifiedRole,
  checkRoleConsistency
} from '../role-migration-utils'

describe('Role Migration Integration Tests', () => {
  let testUser: any
  let testOrg: any

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
    await disconnectDatabase()
  })

  beforeEach(async () => {
    // Create test user
    testUser = await createTestUser({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    })

    // Create test organization  
    testOrg = await prismaTest.organization.create({
      data: {
        name: `Test Org ${Date.now()}`,
        slug: `test-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        description: 'Test organization',
      }
    })
  })

  describe('Role Mapping Functions', () => {
    it('should correctly map OrgRole to UnifiedRole', () => {
      expect(mapOrgRoleToUnified('OWNER')).toBe(UnifiedRole.OWNER)
      expect(mapOrgRoleToUnified('MEMBER')).toBe(UnifiedRole.MEMBER)
    })

    it('should correctly map UnifiedRole to OrgRole', () => {
      expect(mapUnifiedToOrgRole(UnifiedRole.OWNER)).toBe('OWNER')
      expect(mapUnifiedToOrgRole(UnifiedRole.ADMIN)).toBe('MEMBER') // Degraded
      expect(mapUnifiedToOrgRole(UnifiedRole.MEMBER)).toBe('MEMBER')
      expect(mapUnifiedToOrgRole(UnifiedRole.VIEWER)).toBe('MEMBER') // Elevated
    })
  })

  describe('Dual Write Pattern', () => {
    it('should prepare dual-write data for OrgRole input', () => {
      const data = prepareDualWriteData('MEMBER', false)
      expect(data.role).toBe('MEMBER')
      expect(data.unifiedRole).toBe(UnifiedRole.MEMBER)
    })

    it('should prepare dual-write data for UnifiedRole input', () => {
      const data = prepareDualWriteData(UnifiedRole.ADMIN, true)
      expect(data.role).toBe('MEMBER') // ADMIN degrades to MEMBER in OrgRole
      expect(data.unifiedRole).toBe(UnifiedRole.ADMIN)
    })

    it('should create OrganizationMember with both role fields', async () => {
      const roleData = prepareDualWriteData('MEMBER', false)
      
      const member = await prismaTest.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: roleData.role,
          unifiedRole: roleData.unifiedRole,
        }
      })

      expect(member.role).toBe('MEMBER')
      expect(member.unifiedRole).toBe(UnifiedRole.MEMBER)
    })

    it('should handle OWNER role correctly in dual-write', async () => {
      const roleData = prepareDualWriteData('OWNER', false)
      
      const member = await prismaTest.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: roleData.role,
          unifiedRole: roleData.unifiedRole,
        }
      })

      expect(member.role).toBe('OWNER')
      expect(member.unifiedRole).toBe(UnifiedRole.OWNER)
    })
  })

  describe('Effective Role Resolution', () => {
    it('should use unifiedRole when available', () => {
      const effectiveRole = getEffectiveUnifiedRole('MEMBER', UnifiedRole.ADMIN)
      expect(effectiveRole).toBe(UnifiedRole.ADMIN)
    })

    it('should fall back to mapped OrgRole when unifiedRole is null', () => {
      const effectiveRole = getEffectiveUnifiedRole('OWNER', null)
      expect(effectiveRole).toBe(UnifiedRole.OWNER)
    })
  })

  describe('Role Consistency Checking', () => {
    let consoleWarnSpy: jest.SpyInstance

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    })

    afterEach(() => {
      consoleWarnSpy.mockRestore()
    })

    it('should not warn when roles are consistent', () => {
      checkRoleConsistency('MEMBER', UnifiedRole.MEMBER, 'test')
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should warn when roles are inconsistent', () => {
      checkRoleConsistency('MEMBER', UnifiedRole.OWNER, 'test')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Role discrepancy detected'),
        expect.objectContaining({
          orgRole: 'MEMBER',
          unifiedRole: UnifiedRole.OWNER,
          expected: UnifiedRole.MEMBER
        })
      )
    })

    it('should not warn when unifiedRole is null', () => {
      checkRoleConsistency('MEMBER', null, 'test')
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })

  describe('Database Migration Safety', () => {
    it('should handle members with only old role field', async () => {
      // Simulate legacy member without unifiedRole
      const member = await prismaTest.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'MEMBER',
          // unifiedRole is nullable, so not setting it simulates legacy data
        }
      })

      expect(member.role).toBe('MEMBER')
      expect(member.unifiedRole).toBeNull()

      // Should still work with effective role resolution
      const effectiveRole = getEffectiveUnifiedRole(member.role, member.unifiedRole)
      expect(effectiveRole).toBe(UnifiedRole.MEMBER)
    })

    it('should handle members with both role fields', async () => {
      const roleData = prepareDualWriteData('OWNER', false)
      
      const member = await prismaTest.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: roleData.role,
          unifiedRole: roleData.unifiedRole,
        }
      })

      const effectiveRole = getEffectiveUnifiedRole(member.role, member.unifiedRole)
      expect(effectiveRole).toBe(UnifiedRole.OWNER)
    })
  })

  describe('Edge Cases', () => {
    it('should handle UnifiedRole.VIEWER mapping correctly', () => {
      const roleData = prepareDualWriteData(UnifiedRole.VIEWER, true)
      expect(roleData.role).toBe('MEMBER') // VIEWER elevates to MEMBER in OrgRole
      expect(roleData.unifiedRole).toBe(UnifiedRole.VIEWER)
    })

    it('should handle UnifiedRole.ADMIN mapping correctly', () => {
      const roleData = prepareDualWriteData(UnifiedRole.ADMIN, true)
      expect(roleData.role).toBe('MEMBER') // ADMIN degrades to MEMBER in OrgRole
      expect(roleData.unifiedRole).toBe(UnifiedRole.ADMIN)
    })
  })
})