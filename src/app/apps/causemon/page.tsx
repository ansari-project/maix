"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CausemonAppPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect directly to the main Causemon page
    router.replace('/causemon')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Opening Causemon...</p>
      </div>
    </div>
  )
}