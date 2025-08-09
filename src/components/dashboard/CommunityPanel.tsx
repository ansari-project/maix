"use client"

import { FeedContainer } from "@/components/feed/FeedContainer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CommunityPanel() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Community Feed</h2>
      
      <Card className="bg-background dark:bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">What&apos;s happening</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FeedContainer showHeader={false} />
        </CardContent>
      </Card>
    </div>
  )
}