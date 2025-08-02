import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { logger } from "./logger"

export const authOptions: NextAuthOptions = {
  // Remove adapter for credentials provider
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user || !user.password) return null
        
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        
        if (!isPasswordValid) return null
        
        // Check if password was hashed with old rounds (12) and upgrade to new rounds (8)
        const oldRounds = user.password.substring(4, 6)
        if (oldRounds === '12') {
          logger.info('Upgrading password hash rounds', { 
            email: user.email, 
            fromRounds: 12, 
            toRounds: 8 
          })
          const newHash = await bcrypt.hash(credentials.password, 8)
          await prisma.user.update({
            where: { id: user.id },
            data: { password: newHash }
          })
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image,
        }
      }
    }),
  ],
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        (session.user as any).id = token.sub as string
        (session.user as any).username = token.username
      }
      return session
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id
        token.username = user.username
      }
      return token
    },
  },
  session: {
    strategy: "jwt",
  },
}