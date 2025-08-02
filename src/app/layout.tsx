import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NextAuthProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AppLayout } from '@/components/layout/AppLayout'
import { AxiomWebVitals } from 'next-axiom'

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
    <html lang="en" suppressHydrationWarning>
      <AxiomWebVitals />
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