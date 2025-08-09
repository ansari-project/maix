"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  FolderOpen, 
  CheckSquare, 
  Calendar, 
  MessageCircle,
  User,
  Settings,
  TrendingUp,
  Users,
  Package,
  HelpCircle
} from "lucide-react"

export function ActionsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        
        {/* Create New Section */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Create New</CardTitle>
            <CardDescription>Start something new today</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/projects/new">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <FolderOpen className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
            <Link href="/q-and-a/new">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                Ask Question
              </Button>
            </Link>
            <Link href="/my-todos">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <CheckSquare className="w-4 h-4 mr-2" />
                Add Todo
              </Button>
            </Link>
            <Link href="/apps/events">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Plan Event
              </Button>
            </Link>
            <Link href="/products/new">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Package className="w-4 h-4 mr-2" />
                New Product
              </Button>
            </Link>
            <Link href="/organizations/new">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Users className="w-4 h-4 mr-2" />
                New Organization
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Your Activities Section */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Your Activities</CardTitle>
            <CardDescription>Recent actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/my-projects" className="block">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">My Projects</p>
                      <p className="text-sm text-muted-foreground">Manage your projects</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">→</span>
                </div>
              </Link>
              <Link href="/volunteering" className="block">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">My Volunteering</p>
                      <p className="text-sm text-muted-foreground">Track contributions</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">→</span>
                </div>
              </Link>
              <Link href="/my-todos" className="block">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">My Todos</p>
                      <p className="text-sm text-muted-foreground">View all tasks</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">→</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Your Impact</CardTitle>
            <CardDescription>Track your contributions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <TrendingUp className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Projects</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <Users className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Collaborations</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <CheckSquare className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Tasks Done</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <HelpCircle className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}