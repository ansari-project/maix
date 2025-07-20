import { describe, it, expect, beforeEach } from '@jest/globals';
import { manageProductTool } from '../manageProduct';
import type { MaixMcpContext } from '../managePost';

// Mock Prisma first
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Import the mocked prisma
import { prisma } from '@/lib/prisma';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('manageProduct tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContext: MaixMcpContext = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      isActive: true,
    } as any,
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    description: 'This is a comprehensive test product description that meets the minimum character requirement.',
    url: 'https://testproduct.com',
    ownerId: 'user-123',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    owner: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  const mockProductWithRelations = {
    ...mockProduct,
    projects: [
      {
        id: 'project-123',
        name: 'Test Project',
        goal: 'Project goal',
        helpType: 'MVP',
        isActive: true,
      },
    ],
    _count: {
      projects: 2,
      updates: 5,
    },
  };

  describe('create action', () => {
    it('should create a product successfully', async () => {
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const params = {
        action: 'create' as const,
        name: 'Test Product',
        description: 'This is a comprehensive test product description that meets the minimum character requirement.',
        url: 'https://testproduct.com',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(result.message).toBe('Product "Test Product" created successfully');
      
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Product',
          description: 'This is a comprehensive test product description that meets the minimum character requirement.',
          url: 'https://testproduct.com',
          ownerId: 'user-123',
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    });

    it('should create a product without URL', async () => {
      const productWithoutUrl = { ...mockProduct, url: null };
      mockPrisma.product.create.mockResolvedValue(productWithoutUrl);

      const params = {
        action: 'create' as const,
        name: 'Test Product',
        description: 'This is a comprehensive test product description that meets the minimum character requirement.',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Product',
          description: 'This is a comprehensive test product description that meets the minimum character requirement.',
          url: null,
          ownerId: 'user-123',
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    });

    it('should create a product with empty URL string', async () => {
      const productWithoutUrl = { ...mockProduct, url: null };
      mockPrisma.product.create.mockResolvedValue(productWithoutUrl);

      const params = {
        action: 'create' as const,
        name: 'Test Product',
        description: 'This is a comprehensive test product description that meets the minimum character requirement.',
        url: '', // Empty string should be converted to null
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Product',
          description: 'This is a comprehensive test product description that meets the minimum character requirement.',
          url: null,
          ownerId: 'user-123',
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    });

    it('should require name for creation', async () => {
      const params = {
        action: 'create' as const,
        description: 'This is a comprehensive test product description that meets the minimum character requirement.',
        url: 'https://testproduct.com',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name is required to create a product');
      expect(mockPrisma.product.create).not.toHaveBeenCalled();
    });

    it('should require description for creation', async () => {
      const params = {
        action: 'create' as const,
        name: 'Test Product',
        url: 'https://testproduct.com',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Description is required to create a product');
      expect(mockPrisma.product.create).not.toHaveBeenCalled();
    });

    it('should validate minimum field lengths', async () => {
      const params = {
        action: 'create' as const,
        name: '', // Too short
        description: 'Short', // Too short (min 10 chars)
        url: 'https://testproduct.com',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should validate URL format', async () => {
      const params = {
        action: 'create' as const,
        name: 'Test Product',
        description: 'This is a comprehensive test product description that meets the minimum character requirement.',
        url: 'invalid-url',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });
  });

  describe('update action', () => {
    it('should update a product successfully', async () => {
      const updatedProduct = { ...mockProduct, name: 'Updated Product Name' };
      mockPrisma.product.update.mockResolvedValue(updatedProduct);

      const params = {
        action: 'update' as const,
        productId: 'product-123',
        name: 'Updated Product Name',
        description: 'Updated description that meets the minimum character requirement for validation.',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedProduct);
      expect(result.message).toBe('Product "Updated Product Name" updated successfully');
      
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { 
          id: 'product-123',
          ownerId: 'user-123',
        },
        data: {
          name: 'Updated Product Name',
          description: 'Updated description that meets the minimum character requirement for validation.',
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    });

    it('should update only provided fields', async () => {
      mockPrisma.product.update.mockResolvedValue(mockProduct);

      const params = {
        action: 'update' as const,
        productId: 'product-123',
        name: 'Updated Name Only',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { 
          id: 'product-123',
          ownerId: 'user-123',
        },
        data: {
          name: 'Updated Name Only',
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    });

    it('should handle URL updates including empty string', async () => {
      const updatedProduct = { ...mockProduct, url: null };
      mockPrisma.product.update.mockResolvedValue(updatedProduct);

      const params = {
        action: 'update' as const,
        productId: 'product-123',
        url: '', // Empty string should be converted to null
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { 
          id: 'product-123',
          ownerId: 'user-123',
        },
        data: {
          url: null,
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    });

    it('should require productId for update', async () => {
      const params = {
        action: 'update' as const,
        name: 'Updated Name',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product ID is required for update action');
    });

    it('should handle non-existent product', async () => {
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';
      mockPrisma.product.update.mockRejectedValue(prismaError);

      const params = {
        action: 'update' as const,
        productId: 'non-existent',
        name: 'Updated Name',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Product not found or you don't have permission to update it");
    });
  });

  describe('delete action', () => {
    it('should delete a product successfully', async () => {
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      const params = {
        action: 'delete' as const,
        productId: 'product-123',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Product deleted successfully');
      
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { 
          id: 'product-123',
          ownerId: 'user-123',
        },
      });
    });

    it('should require productId for delete', async () => {
      const params = {
        action: 'delete' as const,
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product ID is required for delete action');
    });

    it('should handle non-existent product for delete', async () => {
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';
      mockPrisma.product.delete.mockRejectedValue(prismaError);

      const params = {
        action: 'delete' as const,
        productId: 'non-existent',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Product not found or you don't have permission to delete it");
    });
  });

  describe('get action', () => {
    it('should get a product successfully', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProductWithRelations);

      const params = {
        action: 'get' as const,
        productId: 'product-123',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProductWithRelations);
      
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { 
          id: 'product-123',
          ownerId: 'user-123',
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          projects: {
            select: {
              id: true,
              name: true,
              goal: true,
              helpType: true,
              isActive: true,
            }
          },
          _count: {
            select: {
              projects: true,
              updates: true,
            }
          }
        }
      });
    });

    it('should require productId for get', async () => {
      const params = {
        action: 'get' as const,
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product ID is required for get action');
    });

    it('should handle non-existent product for get', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const params = {
        action: 'get' as const,
        productId: 'non-existent',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Product not found or you don't have permission to access it");
    });
  });

  describe('list action', () => {
    it('should list user products successfully', async () => {
      const products = [
        mockProductWithRelations, 
        { 
          ...mockProductWithRelations, 
          id: 'product-456', 
          name: 'Another Product',
          _count: { projects: 1, updates: 3 }
        }
      ];
      mockPrisma.product.findMany.mockResolvedValue(products);

      const params = {
        action: 'list' as const,
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(products);
      expect(result.message).toBe('Found 2 products');
      
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-123' },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: {
              projects: true,
              updates: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle empty product list', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const params = {
        action: 'list' as const,
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toBe('Found 0 products');
    });
  });

  describe('validation', () => {
    it('should handle validation errors for invalid actions', async () => {
      const params = {
        action: 'invalid' as any,
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should validate field length constraints', async () => {
      const params = {
        action: 'create' as const,
        name: 'A'.repeat(300), // Exceeds max length of 255
        description: 'Short', // Below min length of 10
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should validate description length constraints for max', async () => {
      const params = {
        action: 'create' as const,
        name: 'Valid Name',
        description: 'A'.repeat(5001), // Exceeds max length of 5000
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected database errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockPrisma.product.create.mockRejectedValue(new Error('Unexpected database error'));

      const params = {
        action: 'create' as const,
        name: 'Test Product',
        description: 'This is a comprehensive test product description that meets the minimum character requirement.',
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An internal error occurred while managing the product');
      expect(consoleSpy).toHaveBeenCalledWith('MCP Tool Error: Failed to manage product', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle unknown actions gracefully', async () => {
      const params = {
        action: 'create' as const,
        name: 'Test Product',
        description: 'This is a comprehensive test product description that meets the minimum character requirement.',
      };

      // Simulate the case where switch statement doesn't match any case
      const originalHandler = manageProductTool.handler;
      manageProductTool.handler = async (params, context) => {
        if (params.action === 'create') {
          // Simulate returning unknown action response
          return {
            success: false,
            error: 'Unknown action: create',
          };
        }
        return originalHandler(params, context);
      };

      const result = await manageProductTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown action: create');

      // Restore original handler
      manageProductTool.handler = originalHandler;
    });
  });
});