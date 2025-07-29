import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError, successResponse } from "@/lib/api-utils"
import { filterPublicUser } from "@/lib/public-data-filter"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Query public data only - no authentication required
    const [projects, products, productUpdates, questions, answers] = await Promise.all([
      // Recent projects
      prisma.project.findMany({
        where: { 
          isActive: true,
          visibility: 'PUBLIC'  // Only show public projects
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { 
          owner: { select: { id: true, name: true } }
        }
      }),
      // Recent products
      prisma.product.findMany({
        where: { visibility: 'PUBLIC' },  // Only show public products
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { 
          owner: { select: { id: true, name: true } },
          _count: { select: { projects: true } }
        }
      }),
      // Product updates (only for public products)
      prisma.post.findMany({
        where: { 
          type: 'PRODUCT_UPDATE',
          product: {
            visibility: 'PUBLIC'
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
          product: { select: { id: true, name: true } }
        }
      }),
      // Recent questions (only standalone or from public projects/products)
      prisma.post.findMany({
        where: { 
          type: 'QUESTION',
          parentId: null,
          OR: [
            // Standalone questions (no project/product association)
            { 
              projectId: null,
              productId: null 
            },
            // Questions from public projects
            {
              project: {
                visibility: 'PUBLIC'
              }
            },
            // Questions from public products
            {
              product: {
                visibility: 'PUBLIC'
              }
            }
          ]
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, visibility: true } },
          product: { select: { id: true, name: true, visibility: true } }
        }
      }),
      // Recent answers (only for public questions)
      prisma.post.findMany({
        where: { 
          type: 'ANSWER',
          parent: {
            type: 'QUESTION',
            OR: [
              // Answers to standalone questions
              { 
                projectId: null,
                productId: null 
              },
              // Answers to questions from public projects
              {
                project: {
                  visibility: 'PUBLIC'
                }
              },
              // Answers to questions from public products
              {
                product: {
                  visibility: 'PUBLIC'
                }
              }
            ]
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
          parent: {
            select: { 
              id: true, 
              content: true,
              author: { select: { id: true, name: true } },
              project: { select: { id: true, name: true, visibility: true } },
              product: { select: { id: true, name: true, visibility: true } }
            }
          }
        }
      })
    ])

    // Transform to unified format with filtered data
    const feedItems = [
      ...projects.map(p => ({
        id: p.id,
        type: 'project_created' as const,
        title: `New project: ${p.name}`,
        timestamp: p.createdAt,
        user: filterPublicUser(p.owner),
        data: {
          id: p.id,
          name: p.name,
          description: p.description,
          helpType: p.helpType
        }
      })),
      ...products.map(p => ({
        id: p.id,
        type: 'product_created' as const,
        title: `New product: ${p.name}`,
        timestamp: p.createdAt,
        user: filterPublicUser(p.owner),
        data: {
          id: p.id,
          name: p.name,
          description: p.description,
          _count: p._count
        }
      })),
      ...productUpdates.map(p => ({
        id: p.id,
        type: 'product_update' as const,
        title: `Product update: ${p.product?.name || 'Unknown Product'}`,
        timestamp: p.createdAt,
        user: filterPublicUser(p.author),
        data: {
          id: p.id,
          content: p.content,
          productId: p.productId,
          productName: p.product?.name
        }
      })),
      ...questions.map(q => ({
        id: q.id,
        type: 'question_asked' as const,
        title: `${filterPublicUser(q.author).name} asked: ${q.content.substring(0, 100)}${q.content.length > 100 ? '...' : ''}`,
        timestamp: q.createdAt,
        user: filterPublicUser(q.author),
        data: {
          id: q.id,
          content: q.content
        }
      })),
      ...answers
        .filter(a => a.author && a.parent) // Filter out incomplete answers
        .map(a => ({
          id: a.id,
          type: 'answer_posted' as const,
          title: `${filterPublicUser(a.author!).name} answered: ${a.parent!.content.substring(0, 60)}${a.parent!.content.length > 60 ? '...' : ''}`,
          timestamp: a.createdAt,
          user: filterPublicUser(a.author!),
          data: {
            id: a.id,
            content: a.content,
            questionId: a.parentId
          }
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
    return handleApiError(error, "GET /api/public/feed")
  }
}