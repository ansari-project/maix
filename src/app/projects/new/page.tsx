"use client"

import { useState, useEffect } from "react"
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

export default function NewProjectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [project, setProject] = useState({
    title: "",
    description: "",
    projectType: "",
    helpType: "",
    budgetRange: "",
    maxVolunteers: "1",
    contactEmail: "",
    organizationUrl: "",
    timeline: "",
    requiredSkills: "",
    productId: ""
  })

  useEffect(() => {
    if (session) {
      fetchUserProducts()
      // Set productId from query params if present
      const productId = searchParams.get('productId')
      if (productId) {
        setProject(prev => ({ ...prev, productId }))
      }
    }
  }, [session, searchParams])

  const fetchUserProducts = async () => {
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const timelineData = project.timeline ? { description: project.timeline } : {}
      const skillsData = project.requiredSkills 
        ? project.requiredSkills.split(",").map(skill => skill.trim()).filter(skill => skill)
        : []

      const requestData = {
        ...project,
        maxVolunteers: parseInt(project.maxVolunteers),
        timeline: timelineData,
        requiredSkills: skillsData,
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
              Share your AI/tech project with the Muslim volunteer community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={project.title}
                  onChange={(e) => setProject({...project, title: e.target.value})}
                  placeholder="Brief, descriptive title for your project"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  value={project.description}
                  onChange={(e) => setProject({...project, description: e.target.value})}
                  placeholder="Detailed description of your project, goals, and what you're trying to achieve..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectType">Project Type *</Label>
                  <Select value={project.projectType} onValueChange={(value) => setProject({...project, projectType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESEARCH">Research</SelectItem>
                      <SelectItem value="STARTUP">Startup</SelectItem>
                      <SelectItem value="NON_PROFIT">Non-Profit</SelectItem>
                      <SelectItem value="OPEN_SOURCE">Open Source</SelectItem>
                      <SelectItem value="CORPORATE">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Label htmlFor="requiredSkills">Required Skills</Label>
                <Input
                  id="requiredSkills"
                  value={project.requiredSkills}
                  onChange={(e) => setProject({...project, requiredSkills: e.target.value})}
                  placeholder="React, Python, Machine Learning, etc. (comma-separated)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <Textarea
                  id="timeline"
                  value={project.timeline}
                  onChange={(e) => setProject({...project, timeline: e.target.value})}
                  placeholder="Expected timeline, milestones, deadlines..."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetRange">Budget Range</Label>
                  <Select value={project.budgetRange} onValueChange={(value) => setProject({...project, budgetRange: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volunteer">Volunteer (No budget)</SelectItem>
                      <SelectItem value="$1-500">$1 - $500</SelectItem>
                      <SelectItem value="$500-2000">$500 - $2,000</SelectItem>
                      <SelectItem value="$2000-5000">$2,000 - $5,000</SelectItem>
                      <SelectItem value="$5000+">$5,000+</SelectItem>
                      <SelectItem value="equity">Equity/Revenue Share</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxVolunteers">Max Volunteers</Label>
                  <Select value={project.maxVolunteers} onValueChange={(value) => setProject({...project, maxVolunteers: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 volunteer</SelectItem>
                      <SelectItem value="2">2 volunteers</SelectItem>
                      <SelectItem value="3">3 volunteers</SelectItem>
                      <SelectItem value="5">5 volunteers</SelectItem>
                      <SelectItem value="10">10 volunteers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <Label htmlFor="organizationUrl">Organization URL</Label>
                <Input
                  id="organizationUrl"
                  type="url"
                  value={project.organizationUrl}
                  onChange={(e) => setProject({...project, organizationUrl: e.target.value})}
                  placeholder="https://yourorganization.com"
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