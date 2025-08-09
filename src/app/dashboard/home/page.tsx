"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ActionsPanel } from "@/components/dashboard/ActionsPanel"
import { CommunityPanel } from "@/components/dashboard/CommunityPanel"

export default function DashboardHomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to signin
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-full p-6 overflow-auto">
        {/* Actions Panel - Left 50% */}
        <div className="flex-1 lg:max-w-[50%]">
          <ActionsPanel />
        </div>

        {/* Community Panel - Right 50% */}
        <div className="flex-1 lg:max-w-[50%]">
          <CommunityPanel />
        </div>
      </div>
    </DashboardLayout>
  )
}