"use client"

import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function SignInButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Button disabled>Loading...</Button>
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Welcome, {session.user?.name || session.user?.email}
        </span>
        <Button onClick={() => signOut()} variant="outline">
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button asChild variant="outline">
        <Link href="/auth/signin">Sign In</Link>
      </Button>
      <Button asChild>
        <Link href="/auth/signup">Sign Up</Link>
      </Button>
    </div>
  )
}