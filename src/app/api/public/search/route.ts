import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError, successResponse } from "@/lib/api-utils"
import { filterPublicData } from "@/lib/public-data-filter"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') // 'all' | 'projects' | 'products' | 'questions' | 'organizations'
    
    if (!query) {
      return successResponse({
        projects: [],
        products: [],
        questions: [],
        organizations: [],
        total: 0
      })
    }
    
    const searchFilter = {
      contains: query,
      mode: 'insensitive' as const
    }
    
    // Conditionally search based on type parameter
    const searchProjects = !type || type === 'all' || type === 'projects'
    const searchProducts = !type || type === 'all' || type === 'products'
    const searchQuestions = !type || type === 'all' || type === 'questions'
    const searchOrganizations = !type || type === 'all' || type === 'organizations'
    
    const [projects, products, questions, organizations] = await Promise.all([
      searchProjects ? prisma.project.findMany({
        where: {
          isActive: true,
          visibility: 'PUBLIC',
          OR: [
            { name: searchFilter },
            { description: searchFilter },
            { goal: searchFilter }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { applications: true } }
        }
      }) : [],
      
      searchProducts ? prisma.product.findMany({
        where: {
          visibility: 'PUBLIC',
          OR: [
            { name: searchFilter },
            { description: searchFilter }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { projects: true } }
        }
      }) : [],
      
      searchQuestions ? prisma.post.findMany({
        where: {
          type: 'QUESTION',
          parentId: null,
          content: searchFilter
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          author: { select: { id: true, name: true } },
          _count: {
            select: {
              comments: true,
              replies: { where: { type: 'ANSWER' } }
            }
          }
        }
      }) : [],

      searchOrganizations ? prisma.organization.findMany({
        where: {
          OR: [
            { name: searchFilter },
            { mission: searchFilter },
            { description: searchFilter }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          name: true,
          slug: true,
          mission: true,
          description: true,
          createdAt: true,
          _count: {
            select: {
              members: true,
              projects: true,
              products: true
            }
          }
        }
      }) : []
    ])
    
    // Filter out sensitive data
    const publicProjects = filterPublicData(projects, 'project')
    const publicProducts = filterPublicData(products, 'product')
    const publicQuestions = filterPublicData(questions, 'post')
    const publicOrganizations = filterPublicData(organizations, 'organization')
    
    return successResponse({
      projects: publicProjects,
      products: publicProducts,
      questions: publicQuestions,
      organizations: publicOrganizations,
      total: publicProjects.length + publicProducts.length + publicQuestions.length + publicOrganizations.length
    })
  } catch (error) {
    return handleApiError(error, "GET /api/public/search")
  }
}