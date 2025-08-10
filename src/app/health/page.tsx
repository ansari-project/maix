import { headers } from 'next/headers'

export default async function HealthPage() {
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
    AXIOM_DATASET: process.env.AXIOM_DATASET || 'not set',
    AXIOM_TOKEN: process.env.AXIOM_TOKEN ? '✅ Set' : '❌ Not set',
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