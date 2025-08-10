"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Users, FolderOpen } from "lucide-react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"

type OrganizationWithRole = {
  id: string
  name: string
  slug: string
  _count: {
    members: number
    projects: number
  }
  userRole: 'OWNER' | 'MEMBER' | null
}

export default function OrganizationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchOrganizations()
    }
  }, [session])

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations')
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) return null

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Organizations</h1>
            <p className="text-muted-foreground mt-2">
              Collaborate with others on projects and products
            </p>
          </div>
          <Link href="/organizations/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
          </Link>
        </div>

        {organizations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No organizations yet</h2>
              <p className="text-muted-foreground mb-4">
                Create an organization to collaborate with others
              </p>
              <Link href="/organizations/new">
                <Button>Create Your First Organization</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org: OrganizationWithRole) => (
              <Link key={org.id} href={`/organizations/${org.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle>{org.name}</CardTitle>
                    <CardDescription>
                      {org._count.members} member{org._count.members !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FolderOpen className="w-4 h-4 mr-1" />
                      {org._count.projects} project{org._count.projects !== 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}