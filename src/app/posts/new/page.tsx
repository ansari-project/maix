import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CreatePostForm } from '@/components/posts/CreatePostForm'

export default async function NewPostPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Ask a Question
          </h1>
          <p className="text-muted-foreground">
            Get help from the MAIX community on your AI projects and challenges
          </p>
        </div>
        
        <CreatePostForm />
      </div>
    </main>
  )
}