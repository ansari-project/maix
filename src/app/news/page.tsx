"use client"

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, ExternalLink, Megaphone, Users, Code, Globe, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface NewsItem {
  id: string
  title: string
  description: string
  date: string
  type: 'feature' | 'announcement' | 'community' | 'technical'
  link?: string
  isExternal?: boolean
}

const newsItems: NewsItem[] = [
  {
    id: '1',
    title: 'Dashboard Redesign Complete',
    description: 'New unified dashboard layout with improved navigation and sidebar. All pages now use consistent DashboardLayout component.',
    date: '2025-08-10',
    type: 'feature',
  },
  {
    id: '2',
    title: 'Search & Discovery Launched',
    description: 'Find projects, products, and Q&A content with our new comprehensive search functionality. Browse by categories or search across all content.',
    date: '2025-08-10', 
    type: 'feature',
  },
  {
    id: '3',
    title: 'Enhanced Todo Management',
    description: 'Improved todo system with kanban boards, project grouping, and better task organization. Access via My Todos in the sidebar.',
    date: '2025-08-09',
    type: 'feature',
  },
  {
    id: '4',
    title: 'Causemon Integration Available',
    description: 'Monitor causes and track public figure positions on important topics. Track social impact and community engagement.',
    date: '2025-08-08',
    type: 'feature',
    link: '/causemon',
  },
  {
    id: '5',
    title: 'Public Project Browsing',
    description: 'Discover and contribute to community projects without requiring authentication. Public project pages now available.',
    date: '2025-08-07',
    type: 'community',
    link: '/public/projects',
  },
  {
    id: '6',
    title: 'Q&A Community Platform',
    description: 'Ask questions, share knowledge, and help other community members with our built-in Q&A system.',
    date: '2025-08-06',
    type: 'community',
    link: '/q-and-a',
  }
]

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'feature': return <Code className="w-4 h-4" />
    case 'announcement': return <Megaphone className="w-4 h-4" />
    case 'community': return <Users className="w-4 h-4" />
    case 'technical': return <Globe className="w-4 h-4" />
    default: return <Calendar className="w-4 h-4" />
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'feature': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'announcement': return 'bg-red-100 text-red-800 border-red-200'
    case 'community': return 'bg-green-100 text-green-800 border-green-200'
    case 'technical': return 'bg-purple-100 text-purple-800 border-purple-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export default function NewsPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">News & Updates</h1>
          <p className="text-muted-foreground">
            Stay informed about the latest developments in the Maix community
          </p>
        </div>

        {/* Featured Update */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-5 h-5 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                Latest
              </Badge>
            </div>
            <CardTitle className="text-xl text-blue-900">
              Welcome to the New Maix Experience
            </CardTitle>
            <CardDescription className="text-blue-700">
              We&apos;ve completely redesigned the platform with a focus on better navigation, 
              improved functionality, and a more cohesive user experience. Explore the new 
              dashboard, search capabilities, and enhanced project management tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Link href="/search">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Try Search & Discovery
                </Button>
              </Link>
              <Link href="/my-todos">
                <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                  Check My Todos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* News Timeline */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Recent Updates</h2>
          
          {newsItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(item.type)}
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getTypeColor(item.type)}>
                      {item.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <CardDescription className="text-base">
                  {item.description}
                </CardDescription>
              </CardHeader>
              {item.link && (
                <CardContent>
                  <Link href={item.link}>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      {item.isExternal ? (
                        <>
                          Learn More
                          <ExternalLink className="w-3 h-3" />
                        </>
                      ) : (
                        'Explore Feature'
                      )}
                    </Button>
                  </Link>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Community Links */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Stay Connected
            </CardTitle>
            <CardDescription>
              Join our community and stay up to date with the latest developments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/community">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Community Hub
                </Button>
              </Link>
              <Link href="/q-and-a">
                <Button variant="outline" className="w-full justify-start">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Q&A Forum
                </Button>
              </Link>
              <Link href="/public/projects">
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="w-4 h-4 mr-2" />
                  Public Projects
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}