import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError, successResponse } from "@/lib/api-utils"
import { filterPublicPost } from "@/lib/public-data-filter"

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const question = await prisma.post.findFirst({
      where: { 
        id,
        type: 'QUESTION',
        parentId: null
      },
      include: {
        author: {
          select: { id: true, name: true }
        },
        replies: {
          where: { type: 'ANSWER' },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, name: true }
            },
            _count: {
              select: { comments: true }
            }
          }
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
    
    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      )
    }
    
    // Filter out sensitive data
    const publicQuestion = filterPublicPost(question)
    const publicAnswers = question.replies.map(filterPublicPost)
    
    return successResponse({
      ...publicQuestion,
      answers: publicAnswers
    })
  } catch (error) {
    return handleApiError(error, "GET /api/public/questions/[id]")
  }
}