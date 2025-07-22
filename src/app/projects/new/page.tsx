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

interface Product {
  id: string
  name: string
}

function NewProjectForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
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
    productId: ""
  })

  const fetchUserProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        // Only show products owned by the current user
        const userProducts = data.filter((product: any) => product.owner.email === session?.user?.email)
        setProducts(userProducts)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
    setProductsLoading(false)
  }, [session?.user?.email])

  useEffect(() => {
    if (session) {
      fetchUserProducts()
      // Set productId from query params if present
      const productId = searchParams.get('productId')
      if (productId) {
        setProject(prev => ({ ...prev, productId }))
      }
    }
  }, [session, searchParams, fetchUserProducts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const requestData = {
        ...project,
        productId: project.productId || undefined
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
        router.push(`/projects/${data.id}`)
      } else {
        console.error("Error creating project")
      }
    } catch (error) {
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