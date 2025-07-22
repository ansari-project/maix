"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Search, Package, Calendar, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { Markdown } from "@/components/ui/markdown"

interface Product {
  id: string
  name: string
  description: string
  url: string | null
  createdAt: string
  owner: {
    id: string
    name: string | null
  }
  _count: {
    projects: number
  }
}

export default function PublicProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(`/api/public/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-gray-200 rounded"></div>
            <div className="h-4 w-96 bg-gray-200 rounded"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border rounded-lg p-6 space-y-3">
                  <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Browse Products</h1>
          <p className="text-muted-foreground">
            Explore innovative products built by the tech community
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No products found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription>
                    by {product.owner.name || 'Anonymous'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  <div className="flex-1">
                    <Markdown content={product.description} />
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t">
                    {product.url && (
                      <Link 
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visit Website
                      </Link>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(product.createdAt), "MMM dd, yyyy")}
                      </span>
                      {product._count.projects > 0 && (
                        <Badge variant="secondary">
                          {product._count.projects} project{product._count.projects === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/public/products/${product.id}`}>
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
  )
}