import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CreatePostForm } from '@/components/posts/CreatePostForm'
import { prisma } from '@/lib/prisma'

export default async function NewPostPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch user's projects and products
  const [projects, products] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          // Direct project membership
          {
            members: {
              some: { 
                userId: session.user.id,
                role: { in: ['ADMIN', 'MEMBER'] }
              }
            }
          },
          // Organization membership
          {
            organization: {
              members: {
                some: { userId: session.user.id }
              }
            }
          }
        ],
        isActive: true
      },
      select: {
        id: true,
        name: true,
        status: true,
        members: {
          where: { userId: session.user.id },
          select: { role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.findMany({
      where: {
        OR: [
          // Direct product membership
          {
            members: {
              some: { 
                userId: session.user.id,
                role: { in: ['ADMIN', 'MEMBER'] }
              }
            }
          },
          // Organization membership
          {
            organization: {
              members: {
                some: { userId: session.user.id }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        name: true
      },
      orderBy: { createdAt: 'desc' }
    })
  ])

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create a Post
          </h1>
          <p className="text-muted-foreground">
            Ask a question, share an update, or start a discussion
          </p>
        </div>
        
        <CreatePostForm 
          projects={projects}
          products={products}
          currentUserId={session.user.id}
        />
      </div>
    </main>
  )
}