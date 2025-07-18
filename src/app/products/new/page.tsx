"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewProductPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const product = await response.json()
        router.push(`/products/${product.id}`)
      } else {
        const errorData = await response.json()
        if (errorData.details) {
          // Handle Zod validation errors
          const newErrors: Record<string, string> = {}
          if (Array.isArray(errorData.details)) {
            errorData.details.forEach((error: any) => {
              const field = error.path?.[0] || 'general'
              newErrors[field] = error.message
            })
          } else if (typeof errorData.details === 'object') {
            Object.entries(errorData.details).forEach(([field, message]) => {
              newErrors[field] = message as string
            })
          }
          setErrors(newErrors)
        } else {
          setErrors({ general: errorData.error || "Failed to create product" })
        }
      }
    } catch (error) {
      console.error("Error creating product:", error)
      setErrors({ general: "An error occurred. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin")
    return null
  }

  if (!session) return null

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-2">
      <div className="container mx-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/products">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Products
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-primary mb-2">Create New Product</h1>
            <p className="text-muted-foreground">
              Create a product to organize related projects and share your work
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                Provide details about your product to help others understand what you're building
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g., Islamic Prayer App"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? "border-red-500" : ""}
                    required
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe what your product does and its purpose..."
                    value={formData.description}
                    onChange={handleChange}
                    className={errors.description ? "border-red-500" : ""}
                    rows={4}
                    required
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Product URL (optional)</Label>
                  <Input
                    id="url"
                    name="url"
                    type="url"
                    placeholder="https://your-product-website.com"
                    value={formData.url}
                    onChange={handleChange}
                    className={errors.url ? "border-red-500" : ""}
                  />
                  {errors.url && (
                    <p className="text-sm text-red-600">{errors.url}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Link to your product website, demo, or repository
                  </p>
                </div>

                {errors.general && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {errors.general}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "Creating..." : "Create Product"}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/products">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}