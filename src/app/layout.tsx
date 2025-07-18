import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NextAuthProvider } from '@/components/providers/session-provider'
import { AppLayout } from '@/components/layout/AppLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MAIX - Meaningful AI Exchange',
  description: 'A platform connecting volunteers with AI projects to advance humanity',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </NextAuthProvider>
      </body>
    </html>
  )
}