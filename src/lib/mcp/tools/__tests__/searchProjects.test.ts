import { describe, it, expect } from '@jest/globals';
import { SearchProjectsSchema } from '../searchProjects';

describe('searchProjects tool', () => {
  describe('SearchProjectsSchema validation', () => {
    it('should validate valid search parameters', () => {
      const validParams = {
        query: 'AI project',
        helpType: ['MVP', 'PROTOTYPE'],
        ownerId: 'user-123',
        isActive: true,
        productId: 'product-123',
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.000Z',
        limit: 20,
        offset: 0,
      };

      const result = SearchProjectsSchema.safeParse(validParams);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('AI project');
        expect(result.data.helpType).toEqual(['MVP', 'PROTOTYPE']);
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should use default values for limit and offset', () => {
      const minimalParams = {
        query: 'test',
      };

      const result = SearchProjectsSchema.safeParse(minimalParams);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20); // default
        expect(result.data.offset).toBe(0); // default
      }
    });

    it('should reject invalid parameters', () => {
      const invalidParams = {
        limit: 150, // exceeds max of 100
        offset: -1, // below min of 0
        dateFrom: 'invalid-date',
        helpType: ['INVALID_TYPE'],
      };

      const result = SearchProjectsSchema.safeParse(invalidParams);
      
      expect(result.success).toBe(false);
    });

    it('should validate helpType enum values', () => {
      const validHelpTypes = {
        helpType: ['ADVICE', 'PROTOTYPE', 'MVP', 'FULL_PRODUCT'],
      };

      const result = SearchProjectsSchema.safeParse(validHelpTypes);
      
      expect(result.success).toBe(true);
    });

    it('should validate date format', () => {
      const validDate = {
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.000Z',
      };

      const result = SearchProjectsSchema.safeParse(validDate);
      
      expect(result.success).toBe(true);
    });

    it('should reject limit above maximum', () => {
      const exceedsMax = {
        limit: 101, // max is 100
      };

      const result = SearchProjectsSchema.safeParse(exceedsMax);
      
      expect(result.success).toBe(false);
    });

    it('should reject limit below minimum', () => {
      const belowMin = {
        limit: 0, // min is 1
      };

      const result = SearchProjectsSchema.safeParse(belowMin);
      
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const negativeOffset = {
        offset: -5,
      };

      const result = SearchProjectsSchema.safeParse(negativeOffset);
      
      expect(result.success).toBe(false);
    });

    it('should handle optional fields correctly', () => {
      const onlyQuery = {
        query: 'search term',
      };

      const result = SearchProjectsSchema.safeParse(onlyQuery);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.helpType).toBeUndefined();
        expect(result.data.ownerId).toBeUndefined();
        expect(result.data.isActive).toBeUndefined();
        expect(result.data.productId).toBeUndefined();
        expect(result.data.dateFrom).toBeUndefined();
        expect(result.data.dateTo).toBeUndefined();
      }
    });

    it('should validate boolean isActive field', () => {
      const withActive = {
        isActive: true,
      };

      const result = SearchProjectsSchema.safeParse(withActive);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
      }
    });
  });
});