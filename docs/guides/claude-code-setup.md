# Claude Code Setup for MAIX

## Overview

This guide shows how to connect Claude Code to the MAIX MCP server to access your projects, profile, and collaborate through Claude's interface.

## Prerequisites

- Claude Code installed and authenticated
- MAIX account with API access enabled
- Personal Access Token from MAIX platform

## Getting Your API Token

1. **Log into MAIX**: Go to https://maix.app and sign in
2. **Navigate to Settings**: Click your profile → Settings → API Keys
3. **Create New Token**: 
   - Click "Generate New Token"
   - Give it a name like "Claude Code on MacBook"
   - Copy the token (you won't see it again)

## Connecting to MAIX MCP Server

### Method 1: Claude Code Settings UI

1. **Open Claude Code Settings**:
   - On macOS: `Cmd + ,` or Claude Code → Settings
   - On Windows/Linux: `Ctrl + ,` or File → Settings

2. **Add MCP Server**:
   - Go to "Model Context Protocol" section
   - Click "Add Server"
   - Choose "HTTP Server" (not local/stdio server)

3. **Configure Server**:
   ```
   Name: MAIX Platform
   Server URL: https://api.maix.app/mcp
   ```

4. **Add Authentication**:
   - Authentication Type: Bearer Token
   - Token: [Your API token from MAIX]

5. **Save Configuration**:
   - Click "Save" 
   - Restart Claude Code if prompted

### Method 2: Manual Configuration File

If you prefer editing config files directly:

1. **Find Claude Code config directory**:
   - macOS: `~/Library/Application Support/Claude Code/`
   - Windows: `%APPDATA%/Claude Code/`
   - Linux: `~/.config/claude-code/`

2. **Edit `mcp-servers.json`**:
   ```json
   {
     "servers": {
       "maix": {
         "type": "http",
         "url": "https://api.maix.app/mcp",
         "headers": {
           "Authorization": "Bearer YOUR_API_TOKEN_HERE"
         },
         "name": "MAIX Platform"
       }
     }
   }
   ```

3. **Restart Claude Code**

## Verifying Connection

1. **Open Claude Code**
2. **Start new conversation**
3. **Test MCP connection**:
   ```
   Can you list my MAIX projects?
   ```

If connected properly, Claude should be able to:
- List your projects
- Show your profile information  
- Help you create new projects
- Manage applications to projects

## Available MCP Tools

Once connected, you can ask Claude to:

### Project Management
- `List my projects`
- `Create a new project for [description]`
- `Update project [project-name] with [changes]`
- `Show applications for project [project-name]`

### Profile Management  
- `Show my MAIX profile`
- `Update my bio to [new-bio]`
- `Add [skill] to my skills`
- `Update my availability to [hours]`

### Search and Discovery
- `Find projects matching [criteria]`
- `Search for projects needing [skill]`
- `Show projects in [category]`

### Applications
- `Apply to project [project-name] with message [message]`
- `Show my applications`
- `Withdraw application to [project-name]`

## Troubleshooting

### Connection Issues

**Error: "Failed to connect to MCP server"**
- Check your internet connection
- Verify the server URL is exactly: `https://api.maix.app/mcp`  
- Ensure your API token is valid

**Error: "Authentication failed"**
- Regenerate your API token in MAIX settings
- Make sure token is copied completely without extra spaces
- Verify Bearer token format in headers

**Error: "MCP server not responding"**
- Check if MAIX platform is online: https://maix.app
- Try disconnecting and reconnecting the MCP server
- Restart Claude Code

### Permission Issues

**Error: "Access denied"**
- Check that your MAIX account has API access enabled
- Verify your API token hasn't expired
- Contact MAIX support if issue persists

### Performance Issues

**Slow responses from MCP server**
- This is normal for remote servers vs local ones
- MAIX server may be processing complex requests
- Try smaller, more specific requests

## Security Best Practices

1. **Protect Your API Token**:
   - Never share your API token
   - Don't commit tokens to version control
   - Regenerate if potentially compromised

2. **Token Management**:
   - Use descriptive names for different devices
   - Regularly review and revoke unused tokens
   - Set expiration dates when available

3. **Network Security**:
   - Only connect over HTTPS (enforced by default)
   - Use trusted networks when possible
   - Monitor API usage in MAIX settings

## Advanced Configuration

### Custom Timeouts
```json
{
  "servers": {
    "maix": {
      "type": "http",
      "url": "https://api.maix.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      },
      "timeout": 30000,
      "retries": 3
    }
  }
}
```

### Environment-Specific Servers
```json
{
  "servers": {
    "maix-prod": {
      "type": "http", 
      "url": "https://api.maix.app/mcp"
    },
    "maix-staging": {
      "type": "http",
      "url": "https://staging-api.maix.app/mcp"
    }
  }
}
```

## Getting Help

- **MAIX Documentation**: https://maix.app/docs
- **Claude Code Documentation**: https://docs.anthropic.com/claude-code
- **Report Issues**: https://github.com/maix-platform/maix/issues
- **Community Support**: https://discord.gg/maix

## What's Next

Once connected, you can:
1. **Explore Projects**: Browse and search available projects
2. **Manage Profile**: Keep your skills and availability updated  
3. **Collaborate**: Apply to projects and work with other volunteers
4. **Create Projects**: Post your own projects needing help

The MAIX MCP integration brings the full power of the platform directly into your Claude Code workflow, making it easier than ever to contribute to meaningful AI projects.