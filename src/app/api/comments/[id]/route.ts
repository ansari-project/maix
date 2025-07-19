import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const commentUpdateSchema = z.object({
  content: z.string().min(1),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const validation = commentUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { content } = validation.data

    // Check if comment exists and user is the author
    const comment = await prisma.comment.findUnique({
      where: { id: params.id }
    })

    if (!comment) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 })
    }

    if (comment.authorId !== userId) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id: params.id },
      data: { content },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error("Error updating comment:", error)
    return NextResponse.json({ message: 'Error updating comment' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { replies: true } }
      }
    })

    if (!comment) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 })
    }

    // Authorization: only author can delete their comments
    if (comment.authorId !== userId) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    // Cannot delete comment if it has replies
    if (comment._count.replies > 0) {
      return NextResponse.json({ 
        message: 'Cannot delete comment with replies' 
      }, { status: 400 })
    }

    await prisma.comment.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error("Error deleting comment:", error)
    
    // Handle foreign key constraint error for comments with replies
    if (error instanceof Error && error.message.includes('P2003')) {
      return NextResponse.json({ 
        message: 'Cannot delete comment with replies' 
      }, { status: 400 })
    }
    
    return NextResponse.json({ message: 'Error deleting comment' }, { status: 500 })
  }
}