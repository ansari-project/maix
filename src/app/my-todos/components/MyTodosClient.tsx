"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MyTasksView from "@/components/todos/MyTasksView"
import { Eye, LayoutGrid } from "lucide-react"

export default function MyTodosClient() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">My Todos</h1>
        <p className="text-muted-foreground mb-6">Manage all your assigned tasks across projects</p>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "kanban" | "list")}>
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Kanban View
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              List View (Legacy)
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="kanban">
            <MyTasksView />
          </TabsContent>
          
          <TabsContent value="list">
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  The legacy list view has been replaced with the new Kanban view. 
                  Use the Kanban view above for better task organization.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}