# Accessing Vercel Logs

## Using Vercel CLI

### Installation
```bash
# Install globally
npm i -g vercel

# Or use npx (no installation needed)
npx vercel <command>
```

### Authentication
```bash
# Login to your Vercel account
vercel login
```

### Viewing Logs

#### Basic Commands
```bash
# View logs from production deployment
vercel logs

# View logs from a specific deployment URL
vercel logs https://maix.io

# Follow logs in real-time (like tail -f)
vercel logs --follow
vercel logs -f

# View last N log entries
vercel logs --limit 100
vercel logs -n 100

# View logs for a specific function
vercel logs --filter lambda
```

#### Advanced Filtering
```bash
# Filter by log level
vercel logs --filter error
vercel logs --filter warn

# Filter by time range (last 24 hours)
vercel logs --since 24h

# Filter by time range (specific date)
vercel logs --since 2024-01-10 --until 2024-01-11

# Combine filters
vercel logs --filter error --since 1h --follow
```

#### Output Format
```bash
# JSON output (for parsing)
vercel logs --output json

# Save logs to file
vercel logs --output json > logs.json
```

### Debugging Production Issues

#### Check Recent Errors
```bash
# View only errors from last hour
vercel logs --filter error --since 1h

# Follow errors in real-time
vercel logs --filter error --follow
```

#### Check Specific API Route
```bash
# Filter logs by path
vercel logs | grep "/api/ai/chat"

# Or use function filter
vercel logs --filter "api/ai/chat"
```

#### Check Function Timeouts
```bash
# Look for timeout errors
vercel logs | grep -i timeout
```

### Common Log Patterns

#### Authentication Issues
```bash
vercel logs | grep -E "(auth|unauthorized|401|403)"
```

#### Database Errors
```bash
vercel logs | grep -E "(prisma|database|connection)"
```

#### AI/MCP Issues
```bash
vercel logs | grep -E "(mcp|gemini|ai|pat)"
```

## Alternative Methods

### Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. Navigate to Functions tab
4. Click on a specific function
5. View real-time logs

### Using GitHub Actions
If deploying via GitHub Actions, check:
```bash
gh run list
gh run view [run-id] --log
```

## Log Retention

- **Hobby Plan**: 1 hour of log retention
- **Pro Plan**: 1 day of log retention  
- **Enterprise**: Custom retention periods

## Tips

1. **Use `--follow` during debugging** to watch logs in real-time
2. **Filter by error level first** when troubleshooting
3. **Check function cold starts** with `vercel logs | grep "Cold start"`
4. **Monitor function duration** to identify performance issues
5. **Use JSON output** for automated log analysis

## Environment Variables in Logs

Our logger includes these fields automatically:
- `env`: NODE_ENV value
- `version`: Package version
- Request context (when using child logger)

## Example Debugging Session

```bash
# 1. Check if deployment is healthy
vercel logs --limit 10

# 2. Look for recent errors
vercel logs --filter error --since 1h

# 3. Monitor specific endpoint
vercel logs --follow | grep "/api/ai/chat"

# 4. Check for PAT generation issues
vercel logs --since 1h | grep -i "pat"

# 5. Export logs for analysis
vercel logs --since 24h --output json > daily-logs.json
```