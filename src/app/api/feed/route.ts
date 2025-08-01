import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, successResponse } from "@/lib/api-utils"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuth()

    // Query existing models directly as per the simplified approach
    const [projects, productUpdates, products, posts] = await Promise.all([
      prisma.project.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: { 
          owner: { select: { id: true, name: true } }
        }
      }),
      prisma.post.findMany({
        where: { type: 'PRODUCT_UPDATE' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
          product: { select: { id: true, name: true } }
        }
      }),
      prisma.product.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { 
          owner: { select: { id: true, name: true } },
          _count: { select: { projects: true } }
        }
      }),
      prisma.post.findMany({
        take: 10,
        where: {
          type: { in: ['QUESTION', 'ANSWER'] }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
          parent: {
            select: { 
              id: true, 
              content: true,
              author: { select: { id: true, name: true } }
            }
          }
        }
      })
    ])

    // Transform to unified format
    const feedItems = [
      ...projects.map(p => ({
        id: p.id,
        type: 'project_created' as const,
        title: p.status === 'COMPLETED' ? `Completed: ${p.name}` : `New project: ${p.name}`,
        timestamp: p.updatedAt,
        user: p.owner,
        data: p
      })),
      ...productUpdates.map(p => ({
        id: p.id,
        type: 'product_update' as const,
        title: `Product update: ${p.product?.name || 'Unknown Product'}`,
        timestamp: p.createdAt,
        user: p.author,
        data: {
          ...p,
          content: p.content
        }
      })),
      ...products.map(p => ({
        id: p.id,
        type: 'product_created' as const,
        title: `New product: ${p.name}`,
        timestamp: p.createdAt,
        user: p.owner,
        data: p
      })),
      ...posts
        .filter(p => p.author) // Filter out posts without authors
        .map(p => ({
          id: p.id,
          type: p.type === 'QUESTION' ? 'question_asked' as const : 'answer_posted' as const,
          title: p.type === 'QUESTION' 
            ? `${p.author!.name} asked: ${p.content.substring(0, 100)}${p.content.length > 100 ? '...' : ''}`
            : `${p.author!.name} answered a question`,
          timestamp: p.createdAt,
          user: p.author!,
          data: p
        }))
    ]

    // Sort by timestamp
    const sortedItems = feedItems.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    )

    return successResponse({
      items: sortedItems.slice(0, 20) // Return top 20 items
    })
  } catch (error) {
    return handleApiError(error, "GET /api/feed")
  }
}