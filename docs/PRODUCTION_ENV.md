# Production Environment Variables for maix.io

## Required Environment Variables for Vercel

Set these in your Vercel project settings (Settings → Environment Variables):

### Core Configuration
```
NEXT_PUBLIC_URL=https://maix.io
```
This ensures the MCP client and other services use the correct production URL.

### Database
```
DATABASE_URL=<your-production-neon-database-url>
```

### Authentication
```
NEXTAUTH_URL=https://maix.io
NEXTAUTH_SECRET=<generate-a-secure-secret>
```
Generate secret with: `openssl rand -base64 32`

### AI Services
```
GOOGLE_GENERATIVE_AI_API_KEY=<your-gemini-api-key>
GEMINI_API_KEY=<same-gemini-api-key>
```
Both are needed - the SDK looks for GOOGLE_GENERATIVE_AI_API_KEY

### MCP Tools Integration
```
MAIX_PAT=<your-personal-access-token>
```
This PAT is used by the server-side MCP client to authenticate with the MCP endpoint.

### Email Service
```
RESEND_API_KEY=<your-resend-api-key>
EMAIL_FROM=noreply@maix.io
```

### Monitoring (Optional)
```
AXIOM_DATASET=maix-production
AXIOM_TOKEN=<your-axiom-token>
```

### Cron Jobs
```
CRON_SECRET=<generate-a-secure-secret>
```

## Vercel Automatic Variables

Vercel provides these automatically:
- `VERCEL_ENV` - "production", "preview", or "development"
- `VERCEL_URL` - The deployment URL
- `NEXT_PUBLIC_VERCEL_URL` - Same but accessible client-side

## Health Check

After deployment, visit https://maix.io/health to verify:
1. All environment variables are properly set
2. The computed base URL is https://maix.io
3. MCP endpoint is https://maix.io/api/mcp
4. All services show green status

## Important Notes

1. **Never commit .env.local to git** - It contains sensitive keys
2. **Set production variables in Vercel UI** - Not in code
3. **Use different API keys for production** - Don't reuse development keys
4. **Rotate secrets regularly** - Especially PATs and API keys
5. **Monitor the /health endpoint** - Catch configuration issues early

## Debugging MCP Tools

If MCP tools aren't working in production:
1. Check /health page shows MAIX_PAT is set
2. Verify NEXT_PUBLIC_URL is https://maix.io
3. Check server logs for "MCP Client: Using base URL: https://maix.io"
4. Ensure the PAT is valid and has correct permissions

## Testing Production Locally

To test with production-like settings locally:
```bash
NEXT_PUBLIC_URL=https://maix.io npm run build
NEXT_PUBLIC_URL=https://maix.io npm run start
```

This will help identify any URL-related issues before deployment.