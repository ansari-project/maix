# FastMCP Guide for MAIX

## Overview

FastMCP is a TypeScript framework for building Model Context Protocol (MCP) servers. It provides a high-level abstraction over the MCP protocol, handling all the boilerplate automatically and providing simple, intuitive APIs for common tasks.

## Key Features

- **Simple tool and resource definition** - Minimal boilerplate for creating MCP tools
- **Authentication support** - Built-in authentication hooks
- **Session management** - Handle client sessions automatically
- **Content handling** - Support for text, images, audio content
- **HTTP streaming** - Real-time communication support
- **CORS support** - Cross-origin resource sharing
- **Typed server events** - Full TypeScript support
- **Schema validation** - Compatible with Zod, ArkType, Valibot and other validation libraries

## Installation

```bash
npm install fastmcp
```

## Basic Usage

### Creating a Server

```typescript
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "My Server",
  version: "1.0.0"
});
```

### Adding Tools

```typescript
server.addTool({
  name: "add",
  description: "Add two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number()
  }),
  execute: async (args) => {
    return String(args.a + args.b);
  }
});
```

### Starting the Server

```typescript
server.start({
  transportType: "stdio"
});
```

## Authentication

FastMCP supports authentication through hooks:

```typescript
const server = new FastMCP({
  name: "MAIX MCP Server",
  version: "1.0.0",
  
  authenticate: async (request: Request): Promise<AuthContext> => {
    // Extract and validate authentication token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Response('Unauthorized', { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const user = await validateToken(token);
    
    if (!user) {
      throw new Response('Invalid token', { status: 401 });
    }
    
    return { user };
  },
});
```

## Tool Implementation Patterns

### Basic Tool Structure

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: ZodSchema; // Or other schema validation library
  execute: (args: any, context?: AuthContext) => Promise<any>;
}
```

### Tool with Authentication Context

```typescript
server.addTool({
  name: "update_profile",
  description: "Update user profile information",
  parameters: z.object({
    name: z.string().optional(),
    bio: z.string().optional(),
    // ... other fields
  }),
  execute: async (args, context) => {
    // Use context.user for authorization
    const { user } = context;
    
    // Update user profile in database
    const updatedUser = await updateUserProfile(user.id, args);
    
    return {
      success: true,
      data: updatedUser
    };
  }
});
```

### CRUD Operations Tool

```typescript
server.addTool({
  name: "manage_projects",
  description: "Manage user projects with CRUD operations",
  parameters: z.object({
    action: z.enum(['create', 'update', 'delete', 'get', 'list']),
    projectId: z.string().optional(),
    // ... other project fields
  }),
  execute: async (args, context) => {
    const { action, projectId, ...projectData } = args;
    const { user } = context;
    
    switch (action) {
      case 'create':
        return await createProject(projectData, user.id);
      case 'update':
        return await updateProject(projectId, projectData, user.id);
      case 'delete':
        return await deleteProject(projectId, user.id);
      case 'get':
        return await getProject(projectId, user.id);
      case 'list':
        return await listProjects(user.id);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
});
```

## Server Configuration Options

### Transport Types

```typescript
// Standard I/O (for local development)
server.start({
  transportType: "stdio"
});

// HTTP streaming (for remote servers)
server.start({
  transportType: "http",
  port: 3000
});
```

### Advanced Configuration

```typescript
const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  
  // Authentication hook
  authenticate: async (request) => { /* ... */ },
  
  // Custom error handling
  onError: (error) => {
    console.error('Server error:', error);
  },
  
  // CORS configuration
  cors: {
    origin: ['https://myapp.com'],
    methods: ['GET', 'POST']
  }
});
```

## Error Handling

### Tool-Level Error Handling

```typescript
server.addTool({
  name: "my_tool",
  description: "Example tool with error handling",
  parameters: z.object({
    input: z.string()
  }),
  execute: async (args, context) => {
    try {
      // Tool logic here
      return { success: true, data: result };
    } catch (error) {
      console.error('Tool error:', error);
      
      // Return structured error response
      return {
        success: false,
        error: 'An error occurred while processing your request'
      };
    }
  }
});
```

### Authentication Error Handling

```typescript
const server = new FastMCP({
  authenticate: async (request) => {
    try {
      const user = await validateToken(token);
      return { user };
    } catch (error) {
      // Throw Response object to return specific HTTP status
      throw new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
});
```

## Best Practices

### 1. Schema Validation

Always use schema validation for tool parameters:

```typescript
// Good
parameters: z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120)
})

// Bad - no validation
parameters: z.object({
  email: z.string(),
  age: z.number()
})
```

### 2. Authorization

Always check user ownership in tools:

```typescript
execute: async (args, context) => {
  const { user } = context;
  
  // Check if user owns the resource
  const resource = await getResource(args.resourceId);
  if (resource.userId !== user.id) {
    throw new Error('Resource not found'); // Don't reveal existence
  }
  
  // Proceed with operation
}
```

### 3. Error Messages

Provide helpful but secure error messages:

```typescript
// Good - helpful but doesn't leak info
return {
  success: false,
  error: 'Invalid input: email must be a valid email address'
};

// Bad - leaks internal information
return {
  success: false,
  error: 'Database connection failed: Connection timeout after 30s'
};
```

### 4. Structured Responses

Use consistent response formats:

```typescript
// Success response
return {
  success: true,
  data: result,
  message: 'Operation completed successfully'
};

// Error response
return {
  success: false,
  error: 'Error message',
  code: 'ERROR_CODE' // optional
};
```

## Integration with Next.js

### API Route Setup

```typescript
// /src/app/api/mcp/[[...mcp]]/route.ts
import { mcpServer } from '@/lib/mcp/server';

async function handleMcpRequest(request: NextRequest) {
  return await mcpServer.handleRequest(request);
}

export { 
  handleMcpRequest as GET, 
  handleMcpRequest as POST 
};
```

### Server Configuration

```typescript
// /src/lib/mcp/server.ts
import { FastMCP } from 'fastmcp';
import { authenticateRequest } from './middleware/withAuthentication';

export const mcpServer = new FastMCP({
  name: 'MAIX MCP Server',
  version: '0.1.0',
  
  authenticate: async (request: Request) => {
    const authResult = await authenticateRequest(request as any);
    
    if (!authResult.success) {
      throw new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return { user: authResult.user };
  },
});

// Add your tools
mcpServer.addTool(updateProfileTool);
mcpServer.addTool(manageProjectTool);
```

## Testing

### Unit Testing Tools

```typescript
import { describe, it, expect } from '@jest/globals';
import { myTool } from './myTool';

describe('myTool', () => {
  it('should execute successfully', async () => {
    const mockContext = {
      user: { id: 'user-123', email: 'test@example.com' }
    };
    
    const result = await myTool.execute(
      { input: 'test' },
      mockContext
    );
    
    expect(result.success).toBe(true);
  });
});
```

### Integration Testing

```typescript
import { FastMCP } from 'fastmcp';

describe('MCP Server Integration', () => {
  let server: FastMCP;
  
  beforeEach(() => {
    server = new FastMCP({
      name: 'Test Server',
      version: '1.0.0'
    });
  });
  
  it('should handle authentication', async () => {
    // Test authentication flow
  });
});
```

## Deployment

### Environment Variables

```bash
# Required
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"

# Optional
CORS_ORIGIN="https://yourdomain.com"
LOG_LEVEL="info"
```

### Production Considerations

1. **Security**: Always use HTTPS in production
2. **Logging**: Implement structured logging
3. **Monitoring**: Set up error tracking and monitoring
4. **Rate Limiting**: Consider implementing rate limiting
5. **CORS**: Configure appropriate CORS policies

## Common Patterns

### Multi-Action Tools

Tools that handle multiple operations (like CRUD) should use an action parameter:

```typescript
parameters: z.object({
  action: z.enum(['create', 'read', 'update', 'delete']),
  id: z.string().optional(),
  data: z.any().optional()
})
```

### Conditional Parameters

Use Zod's conditional validation for parameters that depend on action:

```typescript
parameters: z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    name: z.string(),
    email: z.string().email()
  }),
  z.object({
    action: z.literal('update'),
    id: z.string(),
    name: z.string().optional(),
    email: z.string().email().optional()
  })
])
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Check token format and validation logic
2. **Schema Validation Failures**: Ensure parameters match schema exactly
3. **CORS Issues**: Configure CORS settings properly
4. **Type Errors**: Use proper TypeScript types for context and parameters

### Debug Mode

Enable debug logging for development:

```typescript
const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  debug: true // Enable debug logging
});
```

## Resources

- [FastMCP GitHub (TypeScript)](https://github.com/punkpeye/fastmcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Zod Documentation](https://zod.dev/)

This guide covers the essential patterns and best practices for using FastMCP in the MAIX project.