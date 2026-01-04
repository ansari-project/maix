# Automated Testing Authentication

This document describes the secure authentication mechanism for automated testing of API endpoints by AI assistants and other automated tools.

## Overview

We provide a development-only endpoint that allows automated tools (like Claude Code) to obtain valid JWT tokens for testing authenticated API endpoints. This approach is secure, isolated to non-production environments, and works seamlessly with our NextAuth.js authentication system.

## Security Architecture

### Why This Approach is Secure

1. **Environment Gated**: The endpoint returns 404 in production (`NODE_ENV === 'production'`)
2. **Secret Key Required**: Requires a pre-shared secret key that's never exposed to browsers
3. **No Real Session Exposure**: Generates purpose-built test tokens, never exposes actual user sessions
4. **Time-Limited**: Tokens expire after 1 hour
5. **Specific User**: Only generates tokens for a designated test user account

### Comparison with Anti-Patterns

❌ **Bad Pattern**: Exposing session tokens via API endpoint
- Creates XSS vulnerability
- Bypasses httpOnly cookie protection
- Could lead to session hijacking

✅ **Our Pattern**: Generate test-specific JWTs
- No exposure of real session data
- Requires secret key authentication
- Completely disabled in production
- Uses standard JWT verification

## Implementation

### 1. Test Session Endpoint

**Location**: `/api/auth/test-session`

**Method**: `POST`

**Required Header**: 
```
X-Test-Session-Key: <TEST_SESSION_SECRET_KEY from .env>
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usage": "Use this token in the Authorization header as: Bearer <token>",
  "expiresIn": "1 hour",
  "user": {
    "id": "user_id",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

### 2. Environment Configuration

Add these to your `.env` file (never commit these):

```env
# Test Session Configuration (Development Only)
TEST_SESSION_SECRET_KEY=your-secret-key-here
TEST_SESSION_USER_EMAIL=test-user@example.com
```

### 3. API Endpoint Authentication

Our API endpoints support both authentication methods:

1. **Session Cookies** (for browser-based users)
2. **Bearer Tokens** (for automated testing and API clients)

The authentication flow in API endpoints:

```typescript
// 1. Check for Bearer token
if (authHeader?.startsWith('Bearer ')) {
  // Verify JWT manually (for test tokens)
  // OR use NextAuth's getToken (for regular tokens)
}

// 2. Fall back to session cookies
if (!userId) {
  const session = await getServerSession(authOptions)
  // Use session.user.id
}

// 3. Reject if no authentication found
if (!userId) {
  return new NextResponse('Unauthorized', { status: 401 })
}
```

## Usage Example

### For AI Assistants (Claude Code)

```javascript
// 1. Get authentication token
const tokenResponse = await fetch('http://localhost:3000/api/auth/test-session', {
  method: 'POST',
  headers: {
    'X-Test-Session-Key': 'your-secret-key-here'
  }
})
const { token } = await tokenResponse.json()

// 2. Use token for API calls
const apiResponse = await fetch('http://localhost:3000/api/ai/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }]
  })
})
```

### Test Script

We provide `test-secure-session.js` as a reference implementation:

```bash
node test-secure-session.js
```

This script:
1. Obtains a test token from the secure endpoint
2. Uses it to call the AI chat API
3. Verifies the authentication works correctly

## Security Considerations

### Production Safety

- The test-session endpoint is completely disabled in production
- Even if accidentally deployed, it returns 404 without the `NODE_ENV` check
- The secret key should never be committed to version control

### Token Scope

- Test tokens only work for the designated test user
- They cannot access or modify other users' data
- They expire after 1 hour to limit exposure

### Best Practices

1. **Rotate Secrets**: Change `TEST_SESSION_SECRET_KEY` periodically
2. **Use Specific Test User**: Create a dedicated test account with limited permissions
3. **Monitor Usage**: Log test token usage for audit purposes
4. **Environment Variables**: Never hardcode secrets in code

## Alternative Approaches Considered

### Manual Token Extraction (Most Secure)
- Developer manually copies session token from browser DevTools
- Pro: No code changes needed
- Con: Not automatable

### OAuth Client Credentials Flow
- Full OAuth 2.0 implementation for machine-to-machine auth
- Pro: Industry standard
- Con: Over-engineering for test automation

### Simple Flag-Based Bypass
- Check for test flag in code
- Pro: Simple
- Con: Doesn't test real auth path, brittle

## Troubleshooting

### Token Not Working

1. Check environment variables are loaded:
   - `TEST_SESSION_SECRET_KEY` must be set
   - `TEST_SESSION_USER_EMAIL` must be a valid user
   - `NEXTAUTH_SECRET` must match your NextAuth configuration

2. Verify the test user exists:
   ```sql
   SELECT * FROM users WHERE email = 'your-test-email@example.com';
   ```

3. Check you're in development mode:
   - `NODE_ENV` should not be 'production'

### 401 Unauthorized

- Ensure the Bearer token is in the correct format: `Bearer <token>`
- Check token hasn't expired (1 hour limit)
- Verify the API endpoint supports Bearer token authentication

## Migration from Insecure Patterns

If you previously used an endpoint that exposed session tokens:

1. **Remove the insecure endpoint** immediately
2. **Update test scripts** to use the new test-session endpoint
3. **Rotate all secrets** in case any were exposed
4. **Audit logs** for any suspicious access patterns

## Future Improvements

- Add rate limiting to prevent brute force attempts
- Implement token refresh mechanism for long-running tests
- Add role-based test users for different permission levels
- Consider implementing full OAuth 2.0 client credentials flow for production API access