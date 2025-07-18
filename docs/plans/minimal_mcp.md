# Minimal Remote MCP Server for MAIX

## Overview

A minimal remote MCP (Model Context Protocol) server that allows Claude Desktop/Code to interact with MAIX profile and project data through just two essential tools. This focuses on solving the **remote authentication challenge** while keeping the implementation simple.

## Core Challenge: Remote Authentication

The main challenge is how Claude Desktop/Code authenticates with a remote MCP server when MAIX uses email/password authentication. Unlike local MCP servers that run as child processes, remote MCP servers need secure HTTP-based authentication.

## Authentication Flow

### 1. API Key Generation
```
User logs into MAIX web app → Generates API key → Configures Claude with key
```

### 2. Claude Configuration
```json
{
  "mcpServers": {
    "maix": {
      "command": "npx",
      "args": [
        "@maix/mcp-client",
        "--server", "https://maix.io/api/mcp",
        "--api-key", "maix_api_key_user123_abc..."
      ]
    }
  }
}
```

### 3. Request Flow
```
Claude Desktop/Code → MCP Client → HTTP Request → Remote MCP Server → MAIX API
```

## Minimal Tools

### 1. `maix_update_profile`
Update user profile information including skills, bio, and availability.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "bio": {"type": "string"},
    "skills": {"type": "array", "items": {"type": "string"}},
    "specialty": {"type": "string", "enum": ["AI", "FULL_STACK", "PROGRAM_MANAGER"]},
    "experienceLevel": {"type": "string", "enum": ["HOBBYIST", "INTERN", "NEW_GRAD", "SENIOR"]},
    "availability": {"type": "string"},
    "linkedinUrl": {"type": "string"},
    "githubUrl": {"type": "string"},
    "portfolioUrl": {"type": "string"}
  }
}
```

**Usage Example:**
```
Claude: "Update my profile to add React and Node.js skills"
Tool: maix_update_profile({"skills": ["React", "Node.js", "Python"]})
```

### 2. `maix_manage_project`
Create or update project information.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {"type": "string", "enum": ["create", "update"]},
    "projectId": {"type": "string"},
    "title": {"type": "string"},
    "description": {"type": "string"},
    "projectType": {"type": "string", "enum": ["RESEARCH", "STARTUP", "NON_PROFIT", "OPEN_SOURCE", "CORPORATE"]},
    "helpType": {"type": "string", "enum": ["ADVICE", "PROTOTYPE", "MVP", "FULL_PRODUCT"]},
    "maxVolunteers": {"type": "number"},
    "contactEmail": {"type": "string"},
    "requiredSkills": {"type": "array", "items": {"type": "string"}},
    "budgetRange": {"type": "string"}
  },
  "required": ["action"]
}
```

**Usage Examples:**
```
Claude: "Create a new AI project for building a chatbot"
Tool: maix_manage_project({
  "action": "create",
  "title": "AI Chatbot for Customer Support",
  "description": "Building an intelligent chatbot...",
  "projectType": "STARTUP",
  "helpType": "PROTOTYPE"
})

Claude: "Update project ABC123 to need 5 volunteers instead of 3"
Tool: maix_manage_project({
  "action": "update", 
  "projectId": "ABC123",
  "maxVolunteers": 5
})
```

## Technical Architecture

### Simplified Direct Connection

```
┌─────────────────┐    ┌─────────────────┐
│  Claude Desktop │    │  MAIX MCP       │
│  Claude Code    │───▶│  Server         │
└─────────────────┘    │  (Next.js API)  │
                       └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │  MAIX Database  │
                        │  (Prisma)       │
                        └─────────────────┘
```

### Components

#### 1. Direct MCP Integration
- **FastMCP Framework**: TypeScript framework for building MCP servers
- **SSE Transport**: Server-Sent Events for real-time communication
- **Next.js API Route**: Single catch-all route `/api/mcp/[[...mcp]]`
- **Personal Access Tokens**: Simple Bearer token authentication

#### 2. Database Schema
- **PersonalAccessToken table**: Stores hashed tokens for authentication
- **Existing User/Project tables**: Reuse current database structure

#### 3. Tool Implementation
- **`maix_update_profile`**: Updates user profile (name, bio, skills)
- **`maix_manage_project`**: CRUD operations for projects (create, update, delete, get)

## Implementation Plan

### Phase 1: Database Schema & Dependencies
**Completion Criteria**: Database ready for PAT storage, FastMCP installed

1. **Add PersonalAccessToken model to Prisma schema**
   ```prisma
   model PersonalAccessToken {
     id        String   @id @default(cuid())
     name      String
     tokenHash String   @unique
     userId    String
     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     createdAt DateTime @default(now())
     lastUsedAt DateTime?
     
     @@map("personal_access_tokens")
   }
   ```

2. **Install FastMCP and run database migration**
   ```bash
   npm install fastmcp
   npx prisma db push
   ```

### Phase 2: MCP Server Implementation
**Completion Criteria**: Working MCP server with authentication, callable from Claude Desktop
1. **Create file structure**
   ```
   src/
   ├── app/api/mcp/[[...mcp]]/route.ts
   └── lib/mcp/
       ├── server.ts
       ├── types.ts
       └── tools/
           ├── index.ts
           ├── updateProfile.ts
           └── manageProject.ts
   ```

2. **Implement MCP server with FastMCP**
   ```typescript
   // src/lib/mcp/server.ts
   import { FastMCP } from 'fastmcp';
   import { db } from '@/lib/db';
   
   export const mcpServer = new FastMCP<MaixMcpContext>({
     name: 'MAIX MCP Server',
     version: '0.1.0',
     authenticate: async (request: Request): Promise<MaixMcpContext> => {
       const authHeader = request.headers.get('Authorization');
       if (!authHeader?.startsWith('Bearer ')) {
         throw new Response('Unauthorized', { status: 401 });
       }
       
       const token = authHeader.substring(7);
       const pat = await db.personalAccessToken.findUnique({
         where: { token },
         include: { user: true },
       });
       
       if (!pat?.user) {
         throw new Response('Invalid token', { status: 401 });
       }
       
       return { user: pat.user };
     },
   });
   ```

3. **Create Next.js API route**
   ```typescript
   // src/app/api/mcp/[[...mcp]]/route.ts
   import { mcpServer } from '@/lib/mcp/server';
   
   const handler = mcpServer.createNextApiHandler();
   export { handler as GET, handler as POST };
   ```

### Phase 3: Tool Implementation
**Completion Criteria**: Two working MCP tools integrated and functional

1. **Create update profile tool**
   ```typescript
   // src/lib/mcp/tools/updateProfile.ts
   export const updateProfileTool = {
     name: 'maix_update_profile',
     description: "Updates the user's profile information",
     parameters: z.object({
       name: z.string().optional(),
       bio: z.string().optional(),
     }),
     handler: async (params, context) => {
       const updatedUser = await db.user.update({
         where: { id: context.user.id },
         data: params,
       });
       return { success: true, user: updatedUser };
     },
   };
   ```

2. **Create manage project tool**
   ```typescript
   // src/lib/mcp/tools/manageProject.ts
   export const manageProjectTool = {
     name: 'maix_manage_project',
     description: 'Manages user projects (CRUD operations)',
     parameters: z.object({
       action: z.enum(['create', 'update', 'delete', 'get']),
       projectId: z.string().optional(),
       name: z.string().optional(),
       description: z.string().optional(),
     }),
     handler: async (params, context) => {
       // Implementation with security checks
       // Only allow users to manage their own projects
     },
   };
   ```

### Phase 4: PAT Management UI
**Completion Criteria**: Users can generate and manage Personal Access Tokens via web interface

1. **Create PAT management page**
   - Add `/settings/tokens` page
   - Generate/revoke token functionality
   - Show token usage statistics

2. **Add PAT generation logic**
   ```typescript
   // Generate secure token and store hash
   const token = generateSecureToken();
   const tokenHash = await hashToken(token);
   
   await db.personalAccessToken.create({
     data: {
       name: tokenName,
       tokenHash,
       userId: user.id,
     },
   });
   ```

### Phase 5: Testing & Documentation
**Completion Criteria**: Complete end-to-end workflow tested and documented

1. **Test with Claude Desktop**
   - Configure Claude Desktop with server URL
   - Test authentication flow
   - Verify tool functionality

2. **Create documentation**
   - Setup guide for users
   - API reference
   - Example workflows

## Security Considerations

### API Key Security
- **Scoped permissions**: API keys only access user's own data
- **Rate limiting**: 100 requests per minute per API key
- **Expiration**: Keys expire after 1 year by default
- **Audit logging**: Log all API key usage

### Input Validation
- **Reuse existing Zod schemas**: Use the same validation as web API
- **Sanitize inputs**: Prevent XSS and injection attacks
- **Validate permissions**: Ensure users can only modify their own data

### Network Security
- **HTTPS only**: All communication over TLS
- **CORS configuration**: Restrict origins if needed
- **Request signing**: Optional request signing for extra security

## User Experience

### Setup Process
1. **Login to MAIX** → Go to Settings → API Tokens
2. **Generate Personal Access Token** → Copy token (shown once)
3. **Configure Claude Desktop** → Add custom connector:
   - **Name**: "MAIX"
   - **Remote MCP server URL**: `https://maix.io/api/mcp`
   - **Authentication**: Paste the Personal Access Token
4. **Test connection** → "Update my MAIX profile"

### Claude Desktop Configuration
When adding the custom connector, users will see:
- **Name field**: Enter "MAIX" or "Meaningful AI Exchange"
- **Remote MCP server URL field**: Enter `https://maix.io/api/mcp`
- **Authentication prompt**: Paste their Personal Access Token

### Usage Examples
```
User: "Update my MAIX profile to show I'm available 20 hours/week"
Claude: Uses maix_update_profile to update availability

User: "Create a new project for building a mobile app"
Claude: Uses maix_manage_project to create project with details

User: "Add React and TypeScript to my skills"
Claude: Uses maix_update_profile to add skills

User: "Show me my project with ID abc123"
Claude: Uses maix_manage_project with action='get' to retrieve project details
```

## Success Metrics

### Technical
- **Response time**: < 500ms for all MCP calls
- **Error rate**: < 1% for authenticated requests
- **Uptime**: 99.9% availability

### User Adoption
- **API key generation**: Track keys created per month
- **Tool usage**: Monitor most used MCP tools
- **User feedback**: Survey users about MCP experience

### Platform Integration
- **Profile updates**: % of profiles updated via MCP
- **Project creation**: % of projects created via MCP
- **Time saved**: User reported time savings

## Future Enhancements

Once the minimal MCP server is working, we can add:
1. **Project search tool** - Find projects by criteria
2. **Application management** - Apply to projects via Claude
3. **Analytics tool** - Get user statistics and insights
4. **Batch operations** - Update multiple projects at once

This minimal approach focuses on solving the core remote authentication challenge while providing immediate value through profile and project management tools.