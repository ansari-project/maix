import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderOpen, Users, Settings, LogOut, Globe } from "lucide-react"
import Link from "next/link"
import { Markdown } from "@/components/ui/markdown"
import OrganizationProjectsList from "./components/OrganizationProjectsList"
import OrganizationMembersWithInvites from "./components/OrganizationMembersWithInvites"
import LeaveOrganizationButton from "./components/LeaveOrganizationButton"
import { getOrganizationBySlug } from "@/lib/organization-service"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function OrganizationPage({ params }: PageProps) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const organization = await getOrganizationBySlug(slug, session.user.id)

  if (!organization) {
    notFound()
  }

  // Check if current user is owner or admin
  const currentMember = organization.members?.find((m: any) => m.userId === session.user.id)
  const isOwner = currentMember?.role === 'OWNER'
  const isAdmin = isOwner // In organizations, only OWNER has admin rights

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            {organization.mission && (
              <p className="text-lg text-muted-foreground mt-2 mb-4">
                {organization.mission}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {organization._count?.members || 0} member{organization._count?.members !== 1 ? 's' : ''}
              </span>
              <span>•</span>
              <span>
                {organization._count?.projects || 0} project{organization._count?.projects !== 1 ? 's' : ''}
              </span>
              {organization.url && (
                <>
                  <span>•</span>
                  <a 
                    href={organization.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <Globe className="w-3 h-3" />
                    Website
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <Link href={`/organizations/${slug}/edit`}>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
            {!isOwner && (
              <LeaveOrganizationButton organizationId={organization.id} />
            )}
          </div>
        </div>
      </div>

      {organization.description && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <Markdown content={organization.description} />
          </CardContent>
        </Card>
      )}

      {organization.aiEngagement && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>AI Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown content={organization.aiEngagement} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="projects">
            <FolderOpen className="w-4 h-4 mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="mt-6">
          <OrganizationProjectsList 
            organizationId={organization.id} 
            organizationSlug={slug}
          />
        </TabsContent>
        
        <TabsContent value="members" className="mt-6">
          <OrganizationMembersWithInvites 
            organizationId={organization.id}
            organizationName={organization.name}
            members={organization.members || []}
            isOwner={isOwner}
            isAdmin={isAdmin}
            currentUserId={session.user.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}