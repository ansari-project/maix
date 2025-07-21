"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Edit3, Trash2, Plus, Package, Calendar, User, Users } from "lucide-react"
import { format } from "date-fns"
import { Markdown } from "@/components/ui/markdown"

function formatProjectStatus(status: string): { label: string; color: string } {
  switch (status) {
    case 'AWAITING_VOLUNTEERS':
      return { label: 'Awaiting Volunteers', color: 'bg-blue-100 text-blue-800' }
    case 'PLANNING':
      return { label: 'Planning', color: 'bg-purple-100 text-purple-800' }
    case 'IN_PROGRESS':
      return { label: 'In Progress', color: 'bg-green-100 text-green-800' }
    case 'ON_HOLD':
      return { label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' }
    case 'COMPLETED':
      return { label: 'Completed', color: 'bg-gray-100 text-gray-800' }
    case 'CANCELLED':
      return { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
    default:
      return { label: status, color: 'bg-gray-100 text-gray-800' }
  }
}

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
    email: string
  }
  projects: Project[]
}

interface Project {
  id: string
  name: string
  description: string
  helpType: string
  status: string
  isActive: boolean
  createdAt: string
  owner: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    applications: number
  }
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [productId, setProductId] = useState<string | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // Resolve async params
  useEffect(() => {
    params.then(({ id }) => setProductId(id))
  }, [params])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  const fetchProduct = useCallback(async () => {
    if (!productId) return
    try {
      const response = await fetch(`/api/products/${productId}`)
      if (response.ok) {
        const data = await response.json()
        setProduct(data)
      } else if (response.status === 404) {
        router.push("/products")
      }
    } catch (error) {
      console.error("Error fetching product:", error)
    }
    setLoading(false)
  }, [productId, router])

  useEffect(() => {
    if (session) {
      fetchProduct()
    }
  }, [session, fetchProduct])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        router.push("/products")
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to delete product")
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      alert("An error occurred while deleting the product")
    } finally {
      setDeleting(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-2">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6 space-y-4">
                <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              
              <div className="border rounded-lg p-6 space-y-4">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-2">
                      <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session || !product) return null

  const isOwner = session.user?.email === product.owner.email

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-2">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/products">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Products
              </Link>
            </Button>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-primary">{product.name}</h1>
              </div>
              
              <div className="flex items-center gap-2">
                {product.url && (
                  <Button variant="outline" asChild>
                    <Link href={product.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit Product
                    </Link>
                  </Button>
                )}
                
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/products/${product.id}/edit`}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={deleting}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Product</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{product.name}&quot;? This action cannot be undone.
                            {product.projects.length > 0 && (
                              <span className="block mt-2 text-red-600">
                                This product has {product.projects.length} associated project{product.projects.length === 1 ? '' : 's'}. You cannot delete it until all projects are removed.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            disabled={product.projects.length > 0 || deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleting ? "Deleting..." : "Delete Product"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
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
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Related Projects ({product.projects.length})
                  </CardTitle>
                  
                  {isOwner && (
                    <Button asChild size="sm">
                      <Link href={`/projects/new?productId=${product.id}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Project
                      </Link>
                    </Button>
                  )}
                </div>
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
                      {isOwner 
                        ? "Start by creating your first project for this product"
                        : "No projects have been associated with this product yet"
                      }
                    </p>
                    {isOwner && (
                      <Button asChild>
                        <Link href={`/projects/new?productId=${product.id}`}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Project
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {product.projects.map((project) => (
                      <Card key={project.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg line-clamp-1">
                                {project.name}
                              </CardTitle>
                              <CardDescription className="text-sm">
                                by {project.owner.name || project.owner.email}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${formatProjectStatus(project.status).color}`}
                              >
                                {formatProjectStatus(project.status).label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {project.helpType.toLowerCase().replace('_', ' ')}
                              </Badge>
                              {!project.isActive && (
                                <Badge variant="destructive" className="text-xs">
                                  Not Recruiting
                                </Badge>
                              )}
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
                              <Link href={`/projects/${project.id}`}>
                                View Project
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}