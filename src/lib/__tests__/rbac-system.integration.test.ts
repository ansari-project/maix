/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'

/**
 * RBAC System Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test:
 *   - Creates real users, organizations, projects, and products in test database
 *   - Tests actual role-based access control with real data
 *   - Validates permission checks with database relationships
 *   - Verifies effective role calculations across entities
 * 
 * Run with: npm run test:integration
 * Run safely with: npm run test:integration:safe (auto-starts DB)
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

import { getEffectiveRole, requirePermission, hasPermission, can, ROLE_HIERARCHY } from '../auth-utils'
import { AuthError } from '../errors'
import { UnifiedRole, Visibility } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

describe('RBAC System Integration Tests', () => {
  let owner: any
  let admin: any
  let member: any
  let viewer: any
  let nonMember: any
  let testOrg: any
  let testProject: any
  let testProduct: any

  beforeAll(async () => {
    await setupTestDatabase()
  }, 30000)

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    jest.clearAllMocks()
    
    // Create test users
    owner = await createTestUser({
      name: 'Owner User',
      email: 'owner@example.com'
    })
    
    admin = await createTestUser({
      name: 'Admin User',
      email: 'admin@example.com'
    })
    
    member = await createTestUser({
      name: 'Member User',
      email: 'member@example.com'
    })
    
    viewer = await createTestUser({
      name: 'Viewer User',
      email: 'viewer@example.com'
    })
    
    nonMember = await createTestUser({
      name: 'Non-Member User',
      email: 'nonmember@example.com'
    })
    
    // Create test organization with members
    testOrg = await prismaTest.organization.create({
      data: {
        name: 'Test Organization',
        slug: 'test-org-' + Date.now(),
        description: 'Test organization for RBAC',
        members: {
          create: [
            { userId: owner.id, role: 'OWNER' as const },
            { userId: admin.id, role: 'MEMBER' as const },
            { userId: member.id, role: 'MEMBER' as const },
            { userId: viewer.id, role: 'MEMBER' as const }
          ]
        }
      }
    })
    
    // Create test product
    testProduct = await prismaTest.product.create({
      data: {
        name: 'Test Product',
        description: 'Test product for RBAC',
        organizationId: testOrg.id,
        ownerId: owner.id,
        members: {
          create: [
            { userId: admin.id, role: 'ADMIN' as const },
            { userId: member.id, role: 'MEMBER' as const }
          ]
        }
      }
    })
    
    // Create test project
    testProject = await prismaTest.project.create({
      data: {
        name: 'Test Project',
        description: 'Test project for RBAC',
        ownerId: owner.id,
        organizationId: testOrg.id,
        status: 'AWAITING_VOLUNTEERS',
        members: {
          create: [
            { userId: admin.id, role: 'ADMIN' as const },
            { userId: member.id, role: 'MEMBER' as const },
            { userId: viewer.id, role: 'VIEWER' as const }
          ]
        }
      }
    })
  })

  describe('Role Hierarchy', () => {
    it('should have correct role hierarchy values', () => {
      expect(ROLE_HIERARCHY.VIEWER).toBe(1)
      expect(ROLE_HIERARCHY.MEMBER).toBe(2)
      expect(ROLE_HIERARCHY.ADMIN).toBe(3)
      expect(ROLE_HIERARCHY.OWNER).toBe(4)
    })
  })

  // Helper wrapper to adapt test calls to actual can function signature
  async function testCan(
    userId: string,
    action: string,
    entityId: string,
    entityType: 'organization' | 'product' | 'project'
  ): Promise<boolean> {
    // Map test actions to actual can actions
    const actionMap: Record<string, 'read' | 'update' | 'delete' | 'invite' | 'manage_members'> = {
      'view': 'read',
      'edit': 'update',
      'manage': 'manage_members',  // 'manage' should map to 'manage_members' not 'update'
      'delete': 'delete',
      'invite': 'invite'
    }
    
    const mappedAction = actionMap[action] || action as any
    
    // Get visibility for the entity if needed
    let visibility: Visibility | undefined = undefined
    if (entityType === 'project') {
      const project = await prismaTest.project.findUnique({
        where: { id: entityId },
        select: { visibility: true }
      })
      visibility = project?.visibility
    } else if (entityType === 'product') {
      const product = await prismaTest.product.findUnique({
        where: { id: entityId },
        select: { visibility: true }
      })
      visibility = product?.visibility
    }
    
    return can(
      { id: userId },
      mappedAction,
      { id: entityId, type: entityType, visibility }
    )
  }

  describe('hasPermission', () => {
    it('should return true when user role meets required role', () => {
      expect(hasPermission('ADMIN' as UnifiedRole, 'MEMBER' as UnifiedRole)).toBe(true)
      expect(hasPermission('OWNER' as UnifiedRole, 'ADMIN' as UnifiedRole)).toBe(true)
      expect(hasPermission('MEMBER' as UnifiedRole, 'MEMBER' as UnifiedRole)).toBe(true)
    })

    it('should return false when user role is insufficient', () => {
      expect(hasPermission('VIEWER' as UnifiedRole, 'MEMBER' as UnifiedRole)).toBe(false)
      expect(hasPermission('MEMBER' as UnifiedRole, 'ADMIN' as UnifiedRole)).toBe(false)
      expect(hasPermission('ADMIN' as UnifiedRole, 'OWNER' as UnifiedRole)).toBe(false)
    })

    it('should return false when role is null', () => {
      expect(hasPermission(null, 'VIEWER' as UnifiedRole)).toBe(false)
    })
  })

  describe('getEffectiveRole', () => {
    describe('Organization roles', () => {
      it('should return OWNER role for organization owner', async () => {
        const role = await getEffectiveRole(owner.id, 'organization', testOrg.id)
        expect(role).toBe('OWNER')
      })

      it('should return MEMBER role for organization member (admin)', async () => {
        const role = await getEffectiveRole(admin.id, 'organization', testOrg.id)
        expect(role).toBe('MEMBER')
      })

      it('should return MEMBER role for organization member', async () => {
        const role = await getEffectiveRole(member.id, 'organization', testOrg.id)
        expect(role).toBe('MEMBER')
      })

      it('should return MEMBER role for organization member (viewer)', async () => {
        const role = await getEffectiveRole(viewer.id, 'organization', testOrg.id)
        expect(role).toBe('MEMBER')
      })

      it('should return null for non-member', async () => {
        const role = await getEffectiveRole(nonMember.id, 'organization', testOrg.id)
        expect(role).toBeNull()
      })
    })

    describe('Product roles', () => {
      it('should inherit ADMIN role from organization owner', async () => {
        const role = await getEffectiveRole(owner.id, 'product', testProduct.id)
        // Organization OWNER becomes ADMIN for products
        expect(role).toBe('ADMIN')
      })

      it('should use product-specific ADMIN role', async () => {
        const role = await getEffectiveRole(admin.id, 'product', testProduct.id)
        expect(role).toBe('ADMIN')
      })

      it('should use product-specific MEMBER role', async () => {
        const role = await getEffectiveRole(member.id, 'product', testProduct.id)
        expect(role).toBe('MEMBER')
      })

      it('should inherit VIEWER role from organization member', async () => {
        const role = await getEffectiveRole(viewer.id, 'product', testProduct.id)
        // Organization MEMBER becomes VIEWER for products
        expect(role).toBe('VIEWER')
      })

      it('should return null for non-member', async () => {
        const role = await getEffectiveRole(nonMember.id, 'product', testProduct.id)
        expect(role).toBeNull()
      })
    })

    describe('Project roles', () => {
      it('should return OWNER for project owner', async () => {
        const role = await getEffectiveRole(owner.id, 'project', testProject.id)
        expect(role).toBe('OWNER')
      })

      it('should use project-specific ADMIN role', async () => {
        const role = await getEffectiveRole(admin.id, 'project', testProject.id)
        expect(role).toBe('ADMIN')
      })

      it('should use project-specific MEMBER role', async () => {
        const role = await getEffectiveRole(member.id, 'project', testProject.id)
        expect(role).toBe('MEMBER')
      })

      it('should use project-specific VIEWER role', async () => {
        const role = await getEffectiveRole(viewer.id, 'project', testProject.id)
        expect(role).toBe('VIEWER')
      })

      it('should return null for non-member', async () => {
        const role = await getEffectiveRole(nonMember.id, 'project', testProject.id)
        expect(role).toBeNull()
      })
    })
  })


  describe('can helper function', () => {
    describe('Organization permissions', () => {
      it('should correctly check organization permissions', async () => {
        // Owner can do everything
        expect(await testCan(owner.id, 'delete', testOrg.id, 'organization')).toBe(true)
        expect(await testCan(owner.id, 'manage', testOrg.id, 'organization')).toBe(true)
        expect(await testCan(owner.id, 'edit', testOrg.id, 'organization')).toBe(true)
        expect(await testCan(owner.id, 'view', testOrg.id, 'organization')).toBe(true)
        
        // Admin (org member) can edit but not manage/delete
        expect(await testCan(admin.id, 'delete', testOrg.id, 'organization')).toBe(false)
        expect(await testCan(admin.id, 'manage', testOrg.id, 'organization')).toBe(false)
        expect(await testCan(admin.id, 'edit', testOrg.id, 'organization')).toBe(true)
        expect(await testCan(admin.id, 'view', testOrg.id, 'organization')).toBe(true)
        
        // Member can edit and view
        expect(await testCan(member.id, 'delete', testOrg.id, 'organization')).toBe(false)
        expect(await testCan(member.id, 'manage', testOrg.id, 'organization')).toBe(false)
        expect(await testCan(member.id, 'edit', testOrg.id, 'organization')).toBe(true)
        expect(await testCan(member.id, 'view', testOrg.id, 'organization')).toBe(true)
        
        // Viewer (org member) can edit and view
        expect(await testCan(viewer.id, 'delete', testOrg.id, 'organization')).toBe(false)
        expect(await testCan(viewer.id, 'manage', testOrg.id, 'organization')).toBe(false)
        expect(await testCan(viewer.id, 'edit', testOrg.id, 'organization')).toBe(true)
        expect(await testCan(viewer.id, 'view', testOrg.id, 'organization')).toBe(true)
        
        // Non-member cannot do anything
        expect(await testCan(nonMember.id, 'view', testOrg.id, 'organization')).toBe(false)
      })
    })

    describe('Product permissions', () => {
      it('should correctly check product permissions with inheritance', async () => {
        // Owner (becomes ADMIN from org) can delete and manage
        expect(await testCan(owner.id, 'delete', testProduct.id, 'product')).toBe(true)
        expect(await testCan(owner.id, 'manage', testProduct.id, 'product')).toBe(true)
        
        // Admin can delete and manage  
        expect(await testCan(admin.id, 'delete', testProduct.id, 'product')).toBe(true)
        expect(await testCan(admin.id, 'manage', testProduct.id, 'product')).toBe(true)
        
        // Member can edit
        expect(await testCan(member.id, 'manage', testProduct.id, 'product')).toBe(false)
        expect(await testCan(member.id, 'edit', testProduct.id, 'product')).toBe(true)
        
        // Viewer (org member becomes viewer) can only view
        expect(await testCan(viewer.id, 'edit', testProduct.id, 'product')).toBe(false)
        expect(await testCan(viewer.id, 'view', testProduct.id, 'product')).toBe(true)
      })
    })

    describe('Project permissions', () => {
      it('should correctly check project permissions', async () => {
        // Owner can do everything
        expect(await testCan(owner.id, 'delete', testProject.id, 'project')).toBe(true)
        
        // Admin can manage
        expect(await testCan(admin.id, 'manage', testProject.id, 'project')).toBe(true)
        
        // Member can edit
        expect(await testCan(member.id, 'edit', testProject.id, 'project')).toBe(true)
        
        // Viewer can only view
        expect(await testCan(viewer.id, 'view', testProject.id, 'project')).toBe(true)
        expect(await testCan(viewer.id, 'edit', testProject.id, 'project')).toBe(false)
      })
    })

    describe('Public project permissions', () => {
      it('should allow viewing public projects for non-members', async () => {
        // Create a public project
        const publicProject = await prismaTest.project.create({
          data: {
            name: 'Public Project',
            description: 'Public project for testing',
            ownerId: owner.id,
            visibility: 'PUBLIC',
            status: 'AWAITING_VOLUNTEERS'
          }
        })
        
        // Non-member can view public project
        expect(await testCan(nonMember.id, 'view', publicProject.id, 'project')).toBe(true)
        
        // But cannot edit
        expect(await testCan(nonMember.id, 'edit', publicProject.id, 'project')).toBe(false)
      })

      it('should not allow viewing private projects for non-members', async () => {
        // Create a private project
        const privateProject = await prismaTest.project.create({
          data: {
            name: 'Private Project',
            description: 'Private project for testing',
            ownerId: owner.id,
            visibility: 'PRIVATE',
            status: 'AWAITING_VOLUNTEERS'
          }
        })
        
        // Non-member cannot view private project
        expect(await testCan(nonMember.id, 'view', privateProject.id, 'project')).toBe(false)
      })
    })
  })

  describe('Complex permission scenarios', () => {
    it('should handle user with multiple conflicting roles correctly', async () => {
      // Create a product where admin is a VIEWER at product level but ADMIN at org level
      const conflictProduct = await prismaTest.product.create({
        data: {
          name: 'Conflict Product',
          description: 'Product with conflicting roles',
          organizationId: testOrg.id,
          ownerId: owner.id,
          members: {
            create: [
              { userId: admin.id, role: 'VIEWER' as const } // Lower than org role
            ]
          }
        }
      })
      
      // Should use product-specific role (VIEWER) not org role (ADMIN)
      const role = await getEffectiveRole(admin.id, 'product', conflictProduct.id)
      expect(role).toBe('VIEWER')
      
      // So admin cannot edit this specific product
      expect(await testCan(admin.id, 'edit', conflictProduct.id, 'product')).toBe(false)
      expect(await testCan(admin.id, 'view', conflictProduct.id, 'product')).toBe(true)
    })

    it('should handle cascade of permissions through organization hierarchy', async () => {
      // Create nested structure
      const childProduct = await prismaTest.product.create({
        data: {
          name: 'Child Product',
          description: 'Product without explicit members',
          organizationId: testOrg.id,
          ownerId: owner.id,
          visibility: 'PRIVATE'
          // No explicit members
        }
      })
      
      // Organization members inherit access
      // admin (org member) becomes viewer for products
      expect(await testCan(admin.id, 'manage', childProduct.id, 'product')).toBe(false)
      expect(await testCan(admin.id, 'view', childProduct.id, 'product')).toBe(true)
      // member (org member) becomes viewer  
      expect(await testCan(member.id, 'edit', childProduct.id, 'product')).toBe(false)
      expect(await testCan(member.id, 'view', childProduct.id, 'product')).toBe(true)
      // viewer (org member) becomes viewer
      expect(await testCan(viewer.id, 'view', childProduct.id, 'product')).toBe(true)
      expect(await testCan(nonMember.id, 'view', childProduct.id, 'product')).toBe(false)
    })
  })
})