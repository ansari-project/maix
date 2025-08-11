"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  FolderOpen, 
  CheckSquare, 
  Calendar, 
  MessageCircle,
  Users,
  Package
} from "lucide-react"
import { TodosPreview } from "./TodosPreview"

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
            <Link href="/todos">
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

        {/* My Todos Section */}
        <TodosPreview />
      </div>
    </div>
  )
}