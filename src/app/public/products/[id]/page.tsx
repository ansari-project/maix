"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Package, Calendar, Users } from "lucide-react"
import { format } from "date-fns"
import { Markdown } from "@/components/ui/markdown"

interface Product {
  id: string
  name: string
  description: string
  url: string | null
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string | null
  }
  projects: any[]
  _count: {
    projects: number
  }
}

export default function PublicProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/public/products/${id}`)
      if (response.ok) {
        const data = await response.json()
        setProduct(data)
      } else if (response.status === 404) {
        router.push("/public/products")
      }
    } catch (error) {
      console.error("Error fetching product:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchProduct(params.id as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-32 bg-gray-200 rounded"></div>
            <div className="h-8 w-64 bg-gray-200 rounded"></div>
            <div className="space-y-6">
              <div className="border rounded-lg p-6 space-y-4">
                <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">{product.name}</h1>
          <p className="text-muted-foreground">by {product.owner.name || 'Anonymous'}</p>
        </div>

        <div className="space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <Markdown content={product.description} />
                </div>
                
                {product.url && (
                  <div>
                    <h3 className="font-semibold mb-2">Website</h3>
                    <Link 
                      href={product.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {product.url}
                    </Link>
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created {format(new Date(product.createdAt), "MMM dd, yyyy")}
                  </span>
                  {product.updatedAt !== product.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Updated {format(new Date(product.updatedAt), "MMM dd, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Related Projects ({product.projects.length})
              </CardTitle>
              {product.projects.length > 0 && (
                <CardDescription>
                  Projects associated with this product
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {product.projects.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">
                    No projects have been associated with this product yet
                  </p>
                  <Button asChild>
                    <Link href="/auth/signin">Sign In to Create Project</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {product.projects.map((project: any) => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <CardDescription className="text-sm">
                              by {project.owner.name || 'Anonymous'}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {project.projectType.toLowerCase().replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {project.helpType.toLowerCase().replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm mb-3">
                          <Markdown content={project.description} className="prose-sm" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(project.createdAt), "MMM dd, yyyy")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {project._count.applications} volunteers
                            </span>
                          </div>
                          
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/auth/signin">Sign In to View</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card>
            <CardContent className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Want to contribute?</h3>
              <p className="text-muted-foreground mb-4">
                Join MAIX to collaborate on projects and connect with the community
              </p>
              <Button asChild>
                <Link href="/auth/signup">Join MAIX</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}