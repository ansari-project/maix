import { notFound } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { canViewEntity, NotFoundError, getEffectiveRole } from "@/lib/auth-utils"
import ProjectPageClient from "./components/ProjectPageClient"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const { id } = await params
  
  try {
    const { entity: project, user, role: userRole } = await canViewEntity(
      'project',
      id,
      session?.user?.id
    )
    
    return (
      <ProjectPageClient 
        project={project} 
        currentUser={user} 
        userRole={userRole}
        session={session}
      />
    )
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound() // 404 for private content
    }
    throw error
  }
}