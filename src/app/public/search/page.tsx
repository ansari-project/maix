"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Search, Package, Folder, MessageSquare, Calendar, Users, ExternalLink } from "lucide-react"
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

interface SearchResults {
  projects: any[]
  products: any[]
  questions: any[]
  total: number
}

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResults>({
    projects: [],
    products: [],
    questions: [],
    total: 0
  })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery])

  const performSearch = async (query: string) => {
    if (!query.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/public/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      }
    } catch (error) {
      console.error("Error searching:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Update URL with search query
      window.history.pushState({}, '', `/public/search?q=${encodeURIComponent(searchQuery)}`)
      performSearch(searchQuery)
    }
  }

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'projects': return results.projects.length
      case 'products': return results.products.length
      case 'questions': return results.questions.length
      default: return results.total
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Search Maix</h1>
          <p className="text-muted-foreground">
            Find projects, products, and answers across the platform
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="search"
              placeholder="Search everything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </form>

        {/* Results */}
        {results.total > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({results.total})
              </TabsTrigger>
              <TabsTrigger value="projects">
                Projects ({results.projects.length})
              </TabsTrigger>
              <TabsTrigger value="products">
                Products ({results.products.length})
              </TabsTrigger>
              <TabsTrigger value="questions">
                Q&A ({results.questions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {/* Projects */}
              {results.projects.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Projects
                  </h2>
                  {results.projects.slice(0, 3).map((project) => (
                    <Card key={project.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription>
                          {project.owner.name} • {format(new Date(project.createdAt), "MMM dd, yyyy")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Markdown content={project.description} className="line-clamp-3 mb-4" />
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${formatProjectStatus(project.status).color}`}
                            >
                              {formatProjectStatus(project.status).label}
                            </Badge>
                            <Badge variant="outline">
                              {project.helpType?.toLowerCase().replace('_', ' ') || 'no type'}
                            </Badge>
                            {!project.isActive && (
                              <Badge variant="destructive" className="text-xs">
                                Not Recruiting
                              </Badge>
                            )}
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/auth/signin">View Project</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {results.projects.length > 3 && (
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setActiveTab('projects')}
                    >
                      View all {results.projects.length} projects
                    </Button>
                  )}
                </>
              )}

              {/* Products */}
              {results.products.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mt-6">
                    <Package className="h-5 w-5" />
                    Products
                  </h2>
                  {results.products.slice(0, 3).map((product) => (
                    <Card key={product.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription>
                          {product.owner.name} • {format(new Date(product.createdAt), "MMM dd, yyyy")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Markdown content={product.description} className="line-clamp-3 mb-4" />
                        <div className="flex items-center justify-between">
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
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/public/products/${product.id}`}>View Product</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {results.products.length > 3 && (
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setActiveTab('products')}
                    >
                      View all {results.products.length} products
                    </Button>
                  )}
                </>
              )}

              {/* Questions */}
              {results.questions.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mt-6">
                    <MessageSquare className="h-5 w-5" />
                    Questions & Answers
                  </h2>
                  {results.questions.slice(0, 3).map((question) => (
                    <Card key={question.id}>
                      <CardHeader>
                        <CardDescription>
                          {question.author.name} • {format(new Date(question.createdAt), "MMM dd, yyyy")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Markdown content={question.content} className="line-clamp-3 mb-4" />
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">
                            {question._count.replies || 0} answers
                          </Badge>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/public/questions/${question.id}`}>View Answers</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {results.questions.length > 3 && (
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setActiveTab('questions')}
                    >
                      View all {results.questions.length} questions
                    </Button>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              {results.projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      {project.owner.name} • {format(new Date(project.createdAt), "MMM dd, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Markdown content={project.description} />
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex gap-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${formatProjectStatus(project.status).color}`}
                        >
                          {formatProjectStatus(project.status).label}
                        </Badge>
                        <Badge variant="outline">
                          {project.helpType?.toLowerCase().replace('_', ' ') || 'no type'}
                        </Badge>
                        {!project.isActive && (
                          <Badge variant="destructive" className="text-xs">
                            Not Recruiting
                          </Badge>
                        )}
                      </div>
                      <Button asChild>
                        <Link href="/auth/signin">Sign In to Apply</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              {results.products.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription>
                      {product.owner.name} • {format(new Date(product.createdAt), "MMM dd, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Markdown content={product.description} />
                    <div className="flex items-center justify-between pt-4 border-t">
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
                      <Button variant="outline" asChild>
                        <Link href={`/public/products/${product.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              {results.questions.map((question) => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardDescription>
                      {question.author.name} • {format(new Date(question.createdAt), "MMM dd, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Markdown content={question.content} />
                    <div className="flex items-center justify-between pt-4 border-t">
                      <Badge variant="secondary">
                        {question._count.children || 0} answers
                      </Badge>
                      <Button variant="outline" asChild>
                        <Link href={`/public/questions/${question.id}`}>View Answers</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        ) : searchQuery && !loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try searching with different keywords
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

export default function PublicSearchPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-gray-200 rounded"></div>
            <div className="h-4 w-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}