import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { MaixMcpContext } from './managePost';

// Interface for MCP responses
interface MaixMcpResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

/**
 * Schema for manageProduct tool parameters
 */
export const manageProductParameters = z.object({
  action: z.enum(['create', 'update', 'delete', 'get', 'list']).describe("The operation to perform"),
  productId: z.string().optional().describe("The ID of the product (required for update, delete, get actions)"),
  name: z.string().min(1).max(255).optional().describe("The product name"),
  description: z.string().min(10).max(5000).optional().describe("The product description"),
  url: z.string().url().optional().or(z.literal('')).describe("The product website/demo URL"),
  organizationId: z.string().optional().describe("Organization ID to create product under"),
});

/**
 * Tool definition for managing products
 */
export const manageProductTool = {
  name: 'maix_manage_product',
  description: 'Manages user products with CRUD operations: create, update, delete, get, and list products',
  parameters: manageProductParameters,
  
  handler: async (
    params: z.infer<typeof manageProductParameters>,
    context: MaixMcpContext
  ): Promise<MaixMcpResponse> => {
    try {
      const validatedParams = manageProductParameters.parse(params);
      const { action, productId, ...productData } = validatedParams;
      
      switch (action) {
        case 'create':
          return await createProduct(productData, context);
        case 'update':
          return await updateProduct(productId, productData, context);
        case 'delete':
          return await deleteProduct(productId, context);
        case 'get':
          return await getProduct(productId, context);
        case 'list':
          return await listProducts(context);
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      console.error('MCP Tool Error: Failed to manage product', error);
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        };
      }
      
      return {
        success: false,
        error: 'An internal error occurred while managing the product',
      };
    }
  },
};

/**
 * Create a new product
 */
async function createProduct(
  productData: any,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  // Validate required fields for creation
  if (!productData.name) {
    return { success: false, error: "Name is required to create a product" };
  }
  if (!productData.description) {
    return { success: false, error: "Description is required to create a product" };
  }
  
  // If organizationId is provided, validate user is a member
  if (productData.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: productData.organizationId,
          userId: context.user.id,
        }
      }
    });
    
    if (!membership) {
      return {
        success: false,
        error: "You are not a member of the specified organization",
      };
    }
  }
  
  const newProduct = await prisma.product.create({
    data: {
      name: productData.name,
      description: productData.description,
      url: productData.url || null,
      // Dual ownership: Either user OR organization owns it, never both
      ownerId: productData.organizationId ? null : context.user.id,
      organizationId: productData.organizationId,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      organization: {
        select: { id: true, name: true, slug: true }
      }
    }
  });
  
  return {
    success: true,
    data: newProduct,
    message: `Product "${newProduct.name}" created successfully`,
  };
}

/**
 * Update an existing product
 */
async function updateProduct(
  productId: string | undefined,
  productData: any,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  if (!productId) {
    return { success: false, error: "Product ID is required for update action" };
  }
  
  // Prepare update data (only include fields that were provided)
  const updateData: any = {};
  
  // If organizationId is being changed, validate membership
  if (productData.organizationId !== undefined) {
    if (productData.organizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: productData.organizationId,
            userId: context.user.id,
          }
        }
      });
      
      if (!membership) {
        return {
          success: false,
          error: "You are not a member of the specified organization",
        };
      }
    }
  }

  if (productData.name !== undefined) updateData.name = productData.name;
  if (productData.description !== undefined) updateData.description = productData.description;
  if (productData.url !== undefined) updateData.url = productData.url || null;
  
  // Handle dual ownership change
  if (productData.organizationId !== undefined) {
    updateData.organizationId = productData.organizationId;
    updateData.ownerId = productData.organizationId ? null : context.user.id;
  }
  
  try {
    const updatedProduct = await prisma.product.update({
      where: { 
        id: productId,
        OR: [
          { ownerId: context.user.id }, // User-owned product
          { 
            organizationId: { not: null },
            organization: {
              members: {
                some: { userId: context.user.id }
              }
            }
          } // Organization-owned product where user is member
        ]
      },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true, slug: true }
        }
      }
    });
    
    return {
      success: true,
      data: updatedProduct,
      message: `Product "${updatedProduct.name}" updated successfully`,
    };
  } catch (error: any) {
    if (error.code === 'P2025') {
      return {
        success: false,
        error: "Product not found or you don't have permission to update it",
      };
    }
    throw error;
  }
}

/**
 * Delete a product
 */
async function deleteProduct(
  productId: string | undefined,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  if (!productId) {
    return { success: false, error: "Product ID is required for delete action" };
  }
  
  try {
    await prisma.product.delete({
      where: { 
        id: productId,
        OR: [
          { ownerId: context.user.id }, // User-owned product
          { 
            organizationId: { not: null },
            organization: {
              members: {
                some: { userId: context.user.id }
              }
            }
          } // Organization-owned product where user is member
        ]
      },
    });
    
    return {
      success: true,
      message: `Product deleted successfully`,
    };
  } catch (error: any) {
    if (error.code === 'P2025') {
      return {
        success: false,
        error: "Product not found or you don't have permission to delete it",
      };
    }
    throw error;
  }
}

/**
 * Get a specific product
 */
async function getProduct(
  productId: string | undefined,
  context: MaixMcpContext
): Promise<MaixMcpResponse> {
  if (!productId) {
    return { success: false, error: "Product ID is required for get action" };
  }
  
  const product = await prisma.product.findFirst({
    where: { 
      id: productId,
      OR: [
        { ownerId: context.user.id }, // User-owned product
        { 
          organizationId: { not: null },
          organization: {
            members: {
              some: { userId: context.user.id }
            }
          }
        } // Organization-owned product where user is member
      ]
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      organization: {
        select: { id: true, name: true, slug: true }
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
  
  if (!product) {
    return {
      success: false,
      error: "Product not found or you don't have permission to access it",
    };
  }
  
  return {
    success: true,
    data: product,
  };
}

/**
 * List all products for the authenticated user
 */
async function listProducts(context: MaixMcpContext): Promise<MaixMcpResponse> {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { ownerId: context.user.id }, // User-owned products
        { 
          organizationId: { not: null },
          organization: {
            members: {
              some: { userId: context.user.id }
            }
          }
        } // Organization-owned products where user is member
      ]
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      organization: {
        select: { id: true, name: true, slug: true }
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
  
  return {
    success: true,
    data: products,
    message: `Found ${products.length} products`,
  };
}

// Export handler function for route integration
export async function handleManageProduct(params: z.infer<typeof manageProductParameters>, context: MaixMcpContext): Promise<string> {
  const result = await manageProductTool.handler(params, context);
  
  if (result.success) {
    if (result.data && typeof result.data === 'object') {
      return result.message + '\n\n' + JSON.stringify(result.data, null, 2);
    }
    return result.message || 'Operation completed successfully';
  } else {
    throw new Error(result.error || 'Product operation failed');
  }
}