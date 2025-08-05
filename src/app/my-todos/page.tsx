import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import MyTodosClient from "./components/MyTodosClient"

export const metadata: Metadata = {
  title: "My Todos | Maix",
  description: "View and manage all your assigned tasks across projects",
}

export default async function MyTodosPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/signin")
  }

  return <MyTodosClient />
}