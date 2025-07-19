import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"
import { prisma } from "./prisma"
import { AuthError } from "./errors"

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    throw new AuthError("Not authenticated")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    // Treat this as an authentication failure. The session is valid,
    // but the user it points to is gone.
    throw new AuthError("Authenticated user not found")
  }

  return user
}