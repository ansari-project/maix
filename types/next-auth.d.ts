import { type DefaultSession } from "next-auth"

export type ExtendedUser = DefaultSession["user"] & {
  id: string
  username: string
}

declare module "next-auth" {
  interface Session {
    user: ExtendedUser
  }

  interface User {
    username: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string
  }
}