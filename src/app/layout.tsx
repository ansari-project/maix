import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NextAuthProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AppLayout } from '@/components/layout/AppLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Maix - Meaningful AI Exchange',
  description: 'A platform connecting volunteers with AI projects to advance humanity',
  keywords: 'AI, machine learning, volunteers, projects, collaboration, technology',
  authors: [{ name: 'Maix Team' }],
  robots: 'index, follow',
  // Performance optimizations
  other: {
    'color-scheme': 'light dark',
    'theme-color': '#3b82f6',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextAuthProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </NextAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}