"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
})

type FormData = z.infer<typeof formSchema>

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function EditOrganizationPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const [slug, setSlug] = useState<string>("")
  const [organization, setOrganization] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  })

  useEffect(() => {
    async function loadParams() {
      const { slug: paramSlug } = await params
      setSlug(paramSlug)
    }
    loadParams()
  }, [params])

  useEffect(() => {
    async function fetchOrganization() {
      if (!slug || !session) return

      try {
        // First get org by slug
        const response = await fetch(`/api/organizations?slug=${slug}`)
        if (!response.ok) {
          throw new Error('Organization not found')
        }

        const orgs = await response.json()
        if (!orgs || orgs.length === 0) {
          throw new Error('Organization not found')
        }

        const org = orgs[0]
        
        // Check if user is owner
        const detailResponse = await fetch(`/api/organizations/${org.id}`)
        if (!detailResponse.ok) {
          throw new Error('Not authorized')
        }

        const fullOrg = await detailResponse.json()
        const isOwner = fullOrg.members?.some((m: any) => 
          m.userId === session.user.id && m.role === 'OWNER'
        )

        if (!isOwner) {
          router.push(`/organizations/${slug}`)
          return
        }

        setOrganization(fullOrg)
        form.setValue('name', fullOrg.name)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load organization",
          variant: "destructive",
        })
        router.push('/organizations')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrganization()
  }, [slug, session, router, toast, form])

  async function onSubmit(values: FormData) {
    if (!organization) return

    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update organization')
      }

      toast({
        title: "Organization updated",
        description: "Your changes have been saved.",
      })

      router.push(`/organizations/${slug}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update organization",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!organization) return

    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete organization')
      }

      toast({
        title: "Organization deleted",
        description: "The organization has been permanently deleted.",
      })

      router.push('/organizations')
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete organization",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!organization) {
    return null
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Organization</CardTitle>
          <CardDescription>
            Update your organization&apos;s details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <FormDescription>
                      The display name for your organization
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-2">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once deleted, this organization and all its data cannot be recovered.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Organization
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        organization <strong>{organization.name}</strong> and remove all
                        associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}