import { describe, it, expect } from '@jest/globals';
import { SearchProductsSchema } from '../searchProducts';

describe('searchProducts tool', () => {
  describe('SearchProductsSchema validation', () => {
    it('should validate valid search parameters', () => {
      const validParams = {
        query: 'AI product',
        ownerId: 'user-123',
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.000Z',
        limit: 20,
        offset: 0,
      };

      const result = SearchProductsSchema.safeParse(validParams);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('AI product');
        expect(result.data.ownerId).toBe('user-123');
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should use default values for limit and offset', () => {
      const minimalParams = {
        query: 'test product',
      };

      const result = SearchProductsSchema.safeParse(minimalParams);
      
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
      };

      const result = SearchProductsSchema.safeParse(invalidParams);
      
      expect(result.success).toBe(false);
    });

    it('should validate date format', () => {
      const validDate = {
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.000Z',
      };

      const result = SearchProductsSchema.safeParse(validDate);
      
      expect(result.success).toBe(true);
    });

    it('should reject limit above maximum', () => {
      const exceedsMax = {
        limit: 101, // max is 100
      };

      const result = SearchProductsSchema.safeParse(exceedsMax);
      
      expect(result.success).toBe(false);
    });

    it('should reject limit below minimum', () => {
      const belowMin = {
        limit: 0, // min is 1
      };

      const result = SearchProductsSchema.safeParse(belowMin);
      
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const negativeOffset = {
        offset: -5,
      };

      const result = SearchProductsSchema.safeParse(negativeOffset);
      
      expect(result.success).toBe(false);
    });

    it('should handle optional fields correctly', () => {
      const onlyQuery = {
        query: 'search term',
      };

      const result = SearchProductsSchema.safeParse(onlyQuery);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ownerId).toBeUndefined();
        expect(result.data.dateFrom).toBeUndefined();
        expect(result.data.dateTo).toBeUndefined();
      }
    });

    it('should validate empty parameters object', () => {
      const emptyParams = {};

      const result = SearchProductsSchema.safeParse(emptyParams);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20); // default
        expect(result.data.offset).toBe(0); // default
        expect(result.data.query).toBeUndefined();
        expect(result.data.ownerId).toBeUndefined();
      }
    });

    it('should validate ownerId field', () => {
      const withOwnerId = {
        ownerId: 'user-456',
      };

      const result = SearchProductsSchema.safeParse(withOwnerId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ownerId).toBe('user-456');
      }
    });

    it('should handle boundary values for limit', () => {
      const minLimit = { limit: 1 };
      const maxLimit = { limit: 100 };

      const minResult = SearchProductsSchema.safeParse(minLimit);
      const maxResult = SearchProductsSchema.safeParse(maxLimit);
      
      expect(minResult.success).toBe(true);
      expect(maxResult.success).toBe(true);
      
      if (minResult.success) {
        expect(minResult.data.limit).toBe(1);
      }
      if (maxResult.success) {
        expect(maxResult.data.limit).toBe(100);
      }
    });

    it('should handle boundary value for offset', () => {
      const zeroOffset = { offset: 0 };

      const result = SearchProductsSchema.safeParse(zeroOffset);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(0);
      }
    });

    it('should validate datetime format requirements', () => {
      const validDatetime = {
        dateFrom: '2024-01-01T00:00:00Z',
        dateTo: '2024-12-31T23:59:59.999Z',
      };

      const result = SearchProductsSchema.safeParse(validDatetime);
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid datetime formats', () => {
      const invalidDatetime = {
        dateFrom: '2024-01-01', // missing time component
        dateTo: 'not-a-date',
      };

      const result = SearchProductsSchema.safeParse(invalidDatetime);
      
      expect(result.success).toBe(false);
    });
  });
});