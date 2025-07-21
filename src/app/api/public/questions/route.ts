import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError, successResponse } from "@/lib/api-utils"
import { filterPublicData } from "@/lib/public-data-filter"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    
    // Build where clause for filtering
    const where: any = {
      type: 'QUESTION',
      parentId: null
    }
    
    if (search) {
      where.content = { contains: search, mode: 'insensitive' }
    }
    
    const questions = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true }
        },
        _count: {
          select: { 
            comments: true,
            replies: {
              where: { type: 'ANSWER' }
            }
          }
        }
      }
    })
    
    // Filter out sensitive data
    const publicQuestions = filterPublicData(questions, 'post')
    
    return successResponse({ questions: publicQuestions })
  } catch (error) {
    return handleApiError(error, "GET /api/public/questions")
  }
}