import { prisma } from "@/lib/prisma"

export async function verifyProductOwnership(productId: string, userId: string): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { ownerId: true }
  })
  
  return product?.ownerId === userId || false
}

export async function getProductWithProjects(productId: string) {
  return await prisma.product.findUnique({
    where: { id: productId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      projects: {
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        }
      }
    }
  })
}

export async function deleteProductIfNoProjects(productId: string, userId: string) {
  // Check ownership and project count in one query
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      _count: {
        select: { projects: true }
      }
    }
  })

  if (!product) {
    throw new Error("Product not found")
  }

  if (product.ownerId !== userId) {
    throw new Error("Unauthorized")
  }

  if (product._count.projects > 0) {
    throw new Error("Cannot delete product with associated projects")
  }

  await prisma.product.delete({
    where: { id: productId }
  })

  return true
}