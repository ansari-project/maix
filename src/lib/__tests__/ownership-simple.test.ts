// Simple test for ownership utilities
import { describe, it, expect } from '@jest/globals'
import { validateOwnership } from '../ownership-utils'

describe('Ownership Utilities', () => {
  describe('validateOwnership', () => {
    it('should enforce exactly one owner', () => {
      // Valid cases
      expect(() => validateOwnership({ ownerId: 'user1', organizationId: null })).not.toThrow()
      expect(() => validateOwnership({ ownerId: null, organizationId: 'org1' })).not.toThrow()
      
      // Invalid cases
      expect(() => validateOwnership({ ownerId: 'user1', organizationId: 'org1' }))
        .toThrow('exactly one user OR one organization')
      expect(() => validateOwnership({ ownerId: null, organizationId: null }))
        .toThrow('must have an owner')
    })
  })
})