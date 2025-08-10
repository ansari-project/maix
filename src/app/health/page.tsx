import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listPersonalAccessTokens } from '@/lib/mcp/services/pat.service'

export default async function HealthPage() {
  // Get authentication status
  const session = await getServerSession(authOptions)
  const isLoggedIn = !!session?.user
  
  // Get user's PATs if logged in
  let userPats: any[] = []
  if (session?.user?.id) {
    try {
      userPats = await listPersonalAccessTokens(session.user.id)
    } catch (error) {
      console.error('Failed to fetch PATs:', error)
    }
  }
  // Get environment variables (server-side only)
  const envVars = {
    // Public environment variables
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'not set',
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    VERCEL_ENV: process.env.VERCEL_ENV || 'not set',
    VERCEL_URL: process.env.VERCEL_URL || 'not set',
    
    // API Keys (show if they exist, not the values)
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '✅ Set' : '❌ Not set',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set',
    MAIX_PAT: process.env.MAIX_PAT ? '✅ Set' : '❌ Not set',
    RESEND_API_KEY: process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set',
    
    // Database
    DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Not set',
    
    // Auth
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Not set',
    
    // Other
    EMAIL_FROM: process.env.EMAIL_FROM || 'not set',
    CRON_SECRET: process.env.CRON_SECRET ? '✅ Set' : '❌ Not set',
  }

  // Get request headers
  const headersList = await headers()
  const host = headersList.get('host') || 'unknown'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  
  // Computed values
  const computedBaseUrl = `${protocol}://${host}`
  const mcpUrl = `${computedBaseUrl}/api/mcp`

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Health Check & Environment</h1>
      
      <div className="space-y-6">
        <section className="bg-muted/50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">👤 Authentication Status</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Logged In:</span>
              <span className={isLoggedIn ? 'text-green-500' : 'text-red-500'}>
                {isLoggedIn ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            {isLoggedIn && session?.user && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{session.user.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="text-xs">{session.user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{session.user.name || 'N/A'}</span>
                </div>
              </>
            )}
          </div>
          
          {isLoggedIn && userPats.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">Personal Access Tokens ({userPats.length})</h3>
              <div className="space-y-2">
                {userPats.map((pat) => (
                  <div key={pat.id} className="bg-background/50 rounded p-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium">{pat.name}</span>
                      <span className="text-muted-foreground">
                        {pat.lastUsedAt 
                          ? `Last used: ${new Date(pat.lastUsedAt).toLocaleDateString()}`
                          : 'Never used'}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1 text-muted-foreground">
                      <span>Created: {new Date(pat.createdAt).toLocaleDateString()}</span>
                      {pat.expiresAt && (
                        <span className={new Date(pat.expiresAt) < new Date() ? 'text-red-500' : ''}>
                          Expires: {new Date(pat.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isLoggedIn && userPats.length === 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              No Personal Access Tokens found
            </div>
          )}
        </section>

        <section className="bg-muted/50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">🌐 URLs & Routing</h2>
          <div className="space-y-1 font-mono text-sm">
            <div>Host: {host}</div>
            <div>Protocol: {protocol}</div>
            <div>Computed Base URL: {computedBaseUrl}</div>
            <div>MCP Endpoint: {mcpUrl}</div>
          </div>
        </section>

        <section className="bg-muted/50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">🔧 Environment Variables</h2>
          <div className="space-y-1 font-mono text-sm">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{key}:</span>
                <span className={value === '❌ Not set' ? 'text-red-500' : ''}>{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-muted/50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">🔍 MCP Client Configuration</h2>
          <div className="space-y-1 font-mono text-sm">
            <div>Expected MCP URL: {process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/mcp</div>
            <div>PAT Available: {process.env.MAIX_PAT ? '✅ Yes' : '❌ No'}</div>
            <div>Google AI Key: {process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '✅ Yes' : '❌ No'}</div>
          </div>
        </section>

        <section className="bg-muted/50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">📊 Status</h2>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-500">●</span>
              <span>Server is running</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={process.env.DATABASE_URL ? 'text-green-500' : 'text-red-500'}>●</span>
              <span>Database {process.env.DATABASE_URL ? 'configured' : 'not configured'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'text-green-500' : 'text-red-500'}>●</span>
              <span>AI Services {process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'configured' : 'not configured'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={process.env.MAIX_PAT ? 'text-green-500' : 'text-red-500'}>●</span>
              <span>MCP Tools {process.env.MAIX_PAT ? 'configured' : 'not configured'}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}