"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, ExternalLink, Package, Users, Lock, Globe } from "lucide-react"
import { Markdown } from "@/components/ui/markdown"

interface Product {
  id: string
  name: string
  description: string
  url: string | null
  createdAt: string
  visibility?: "PUBLIC" | "PRIVATE"  // Added visibility field
  owner: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    projects: number
  }
}

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showMyProducts, setShowMyProducts] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchProducts()
    }
  }, [session])

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
    setLoading(false)
  }

  if (status === "loading" || loading) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-2">
        <div className="container mx-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border rounded-lg p-6 space-y-4">
                  <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) return null

  const userProducts = products.filter(product => product.owner?.email === session.user?.email)
  const displayProducts = showMyProducts ? userProducts : products

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-2">
      <div className="container mx-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">Products</h1>
                <p className="text-muted-foreground">
                  Discover and manage products in the Maix community
                </p>
              </div>
              <Button asChild>
                <Link href="/products/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Product
                </Link>
              </Button>
            </div>
          </div>

          {/* Toggle between My Products and All Products */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={!showMyProducts ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMyProducts(false)}
              >
                All Products ({products.length})
              </Button>
              <Button
                variant={showMyProducts ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMyProducts(true)}
              >
                My Products ({userProducts.length})
              </Button>
            </div>
          </div>

          {displayProducts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {showMyProducts ? "No products yet" : "No other products"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {showMyProducts 
                    ? "Create your first product to organize your projects" 
                    : "Be the first to create a product in the community"
                  }
                </p>
                {showMyProducts && (
                  <Button asChild>
                    <Link href="/products/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Product
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {displayProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <CardTitle className="text-lg line-clamp-2">
                            <Link href={`/products/${product.id}`} className="hover:underline">
                              {product.name}
                            </Link>
                          </CardTitle>
                          {product.visibility === "PRIVATE" && (
                            <Lock className="h-4 w-4 text-amber-600 mt-1" aria-label="Private product" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {product._count.projects}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm mb-4">
                      <Link href={`/products/${product.id}`} className="block hover:text-primary transition-colors">
                        <Markdown content={product.description} className="prose-sm line-clamp-4" />
                      </Link>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {product._count.projects} {product._count.projects === 1 ? 'project' : 'projects'}
                        </Badge>
                        {product.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs p-2 h-auto"
                            asChild
                          >
                            <Link href={product.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/products/${product.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}