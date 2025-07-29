"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Lock, Globe } from "lucide-react"
import OrganizationSelector from "@/components/forms/OrganizationSelector"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: string
  name: string
}

function NewProjectForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [project, setProject] = useState({
    name: "",
    goal: "",
    description: "",
    helpType: "",
    contactEmail: "",
    targetCompletionDate: "",
    productId: "",
    organizationId: "",
    visibility: "PUBLIC" as "PUBLIC" | "PRIVATE"  // Default to PUBLIC
  })

  const fetchUserProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        // The API already returns the correct list of products for the user
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
    setProductsLoading(false)
  }, [])

  useEffect(() => {
    if (session) {
      fetchUserProducts()
      // Set productId from query params if present
      const productId = searchParams.get('productId')
      if (productId) {
        setProject(prev => ({ ...prev, productId }))
      }
      // Set organizationId from query params if present
      const organizationId = searchParams.get('organizationId')
      if (organizationId) {
        setProject(prev => ({ ...prev, organizationId }))
      }
    }
  }, [session, searchParams, fetchUserProducts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const requestData = {
        ...project,
        productId: project.productId || undefined,
        organizationId: project.organizationId || undefined
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Project created",
          description: "Your project has been successfully created.",
        })
        router.push(`/projects/${data.id}`)
      } else {
        const errorData = await response.json().catch(() => null)
        toast({
          title: "Error creating project",
          description: errorData?.error || "Failed to create project. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      console.error("Error creating project:", error)
    }
    setLoading(false)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent p-6">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Post a New Project</CardTitle>
            <CardDescription>
              Share your AI/tech project with the volunteer community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <OrganizationSelector
                value={project.organizationId}
                onChange={(value) => setProject({...project, organizationId: value || ""})}
              />

              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={project.name}
                  onChange={(e) => setProject({...project, name: e.target.value})}
                  placeholder="Brief, descriptive name for your project"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Project Goal *</Label>
                <Textarea
                  id="goal"
                  value={project.goal}
                  onChange={(e) => setProject({...project, goal: e.target.value})}
                  placeholder="What is the main goal or objective of this project?"
                  rows={2}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  value={project.description}
                  onChange={(e) => setProject({...project, description: e.target.value})}
                  placeholder="Detailed description of your project and what you're trying to achieve..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="helpType">Type of Help Needed *</Label>
                <Select value={project.helpType} onValueChange={(value) => setProject({...project, helpType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select help type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADVICE">Advice & Consultation</SelectItem>
                    <SelectItem value="PROTOTYPE">Prototype Development</SelectItem>
                    <SelectItem value="MVP">MVP Development</SelectItem>
                    <SelectItem value="FULL_PRODUCT">Full Product Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productId">Associated Product (optional)</Label>
                <Select value={project.productId} onValueChange={(value) => setProject({...project, productId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={productsLoading ? "Loading products..." : "Select a product (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No product association</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Associate this project with one of your products to organize related work
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetCompletionDate">Target Completion Date</Label>
                <Input
                  id="targetCompletionDate"
                  type="datetime-local"
                  value={project.targetCompletionDate}
                  onChange={(e) => setProject({...project, targetCompletionDate: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={project.contactEmail}
                  onChange={(e) => setProject({...project, contactEmail: e.target.value})}
                  placeholder="Email for volunteers to contact you"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Project Visibility</Label>
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {project.visibility === "PUBLIC" ? (
                        <Globe className="h-4 w-4 text-green-600" />
                      ) : (
                        <Lock className="h-4 w-4 text-amber-600" />
                      )}
                      <span className="font-medium">
                        {project.visibility === "PUBLIC" ? "Public" : "Private"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {project.visibility === "PUBLIC" 
                        ? "Anyone can view this project" 
                        : "Only you can view this project"}
                    </p>
                  </div>
                  <Switch
                    id="visibility"
                    checked={project.visibility === "PRIVATE"}
                    onCheckedChange={(checked) => 
                      setProject({...project, visibility: checked ? "PRIVATE" : "PUBLIC"})
                    }
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating..." : "Post Project"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/projects")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Main page component with Suspense wrapper
export default function NewProjectPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-2xl py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    }>
      <NewProjectForm />
    </Suspense>
  )
}