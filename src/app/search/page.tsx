"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Users, FolderOpen, MessageCircle, Package } from 'lucide-react'
import Link from 'next/link'

interface SearchResult {
  id: string
  type: 'project' | 'product' | 'question' | 'user' | 'organization'
  title: string
  description: string
  owner?: {
    name: string
    email: string
  }
  slug?: string // For organizations
  tags?: string[]
  createdAt: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/public/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        // Transform API response into SearchResult format
        const transformedResults: SearchResult[] = [
          ...data.projects.map((project: any) => ({
            id: project.id,
            type: 'project' as const,
            title: project.name,
            description: project.description,
            owner: project.owner,
            createdAt: project.createdAt
          })),
          ...data.products.map((product: any) => ({
            id: product.id,
            type: 'product' as const,
            title: product.name,
            description: product.description,
            owner: product.owner,
            createdAt: product.createdAt
          })),
          ...data.questions.map((question: any) => ({
            id: question.id,
            type: 'question' as const,
            title: question.content.substring(0, 100) + (question.content.length > 100 ? '...' : ''),
            description: question.content,
            owner: question.author,
            createdAt: question.createdAt
          })),
          ...data.organizations.map((org: any) => ({
            id: org.id,
            type: 'organization' as const,
            title: org.name,
            description: org.mission || org.description || 'No description available',
            createdAt: org.createdAt
          }))
        ]
        setResults(transformedResults)
      } else {
        console.error('Search failed:', response.statusText)
        setResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'project': return <FolderOpen className="w-4 h-4" />
      case 'product': return <Package className="w-4 h-4" />
      case 'question': return <MessageCircle className="w-4 h-4" />
      case 'user': return <Users className="w-4 h-4" />
      case 'organization': return <Users className="w-4 h-4" />
      default: return <Search className="w-4 h-4" />
    }
  }

  const getResultLink = (result: SearchResult) => {
    switch (result.type) {
      case 'project': return `/public/projects/${result.id}`
      case 'product': return `/public/products/${result.id}`
      case 'question': return `/public/questions/${result.id}`
      case 'user': return '#' // User profiles not implemented yet
      case 'organization': return `/organizations/${result.id}` // Using slug later if needed
      default: return '#'
    }
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search & Discovery</h1>
          <p className="text-muted-foreground">
            Find projects, products, questions, organizations, and community members
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search projects, products, questions, organizations..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {!query && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link href="/projects">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                    Browse Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Discover open projects looking for contributors
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/public/products">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    Explore Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Check out products built by the community
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/public/questions">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-purple-600" />
                    Q&A Community
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Browse questions and knowledge shared by the community
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/organizations">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-600" />
                    Organizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Discover organizations building meaningful solutions
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Search Results */}
        {query && (
          <div>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No results found for &ldquo;{query}&rdquo;
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Found {results.length} result{results.length !== 1 ? 's' : ''}
                </h2>
                <div className="space-y-4">
                  {results.map((result) => (
                    <Link key={result.id} href={getResultLink(result)}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getIcon(result.type)}
                              <CardTitle className="text-lg">{result.title}</CardTitle>
                            </div>
                            <Badge variant="outline">
                              {result.type}
                            </Badge>
                          </div>
                          {result.description && (
                            <CardDescription className="mt-2">
                              {result.description.length > 150 
                                ? `${result.description.substring(0, 150)}...` 
                                : result.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            {result.owner && (
                              <span>By {result.owner.name || result.owner.email}</span>
                            )}
                            <span>
                              {new Date(result.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}