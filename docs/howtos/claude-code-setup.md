# Claude Code Setup for MAIX Development

## Overview

This guide shows how to set up Claude Code to work with MAIX in two ways:
1. **Local Development**: Using Claude Code for coding assistance
2. **Remote MCP Access**: Connecting Claude Code to your MAIX account remotely

## Option 1: Local Development (Recommended for Developers)

### Prerequisites
- Claude Code CLI installed
- Anthropic API key
- MAIX project cloned locally

### Setup Steps

#### 1. Install Claude Code
```bash
# Install via npm (recommended)
npm install -g @anthropic-ai/claude-code

# Or via pip
pip install claude-code
```

#### 2. Configure Your API Key
```bash
# Set your Anthropic API key
claude-code auth login

# Or set it as environment variable
export ANTHROPIC_API_KEY="your-api-key-here"
```

#### 3. Navigate to Your Project
```bash
cd /path/to/maix
```

#### 4. Start Claude Code
```bash
claude-code
```

Claude Code will automatically read your project files and understand the MAIX codebase structure.

## Option 2: Remote MCP Access (For MAIX Users)

### Prerequisites
- MAIX account at https://maix.io
- Claude Code CLI installed
- Personal Access Token from MAIX

### Setup Steps

#### 1. Generate Personal Access Token
1. Log into MAIX at https://maix.io
2. Go to Settings → API Tokens
3. Click "Generate New Token"
4. Give it a name like "Claude Code on MacBook"
5. Copy the token (you won't see it again)

#### 2. Configure Claude Code CLI
Add the MAIX MCP server to Claude Code using the CLI:

```bash
claude mcp add --transport http --scope user maix-platform https://maix.io/api/mcp --header "Authorization: Bearer YOUR_PAT_TOKEN_HERE"
```

Replace `YOUR_PAT_TOKEN_HERE` with your actual Personal Access Token from step 1.

#### 3. Test Connection
Start Claude Code and ask: "Can you list my MAIX projects?"

You can also check your MCP server status with:
```bash
/mcp
```

If successful, you can now:
- Update your MAIX profile through Claude Code
- Create and manage projects from the CLI
- List your projects and applications

### Available MCP Tools

Once connected, you can ask Claude Code to:

#### Profile Management
- "Update my MAIX profile bio to include my React expertise"
- "Add Python and TypeScript to my skills"
- "Update my availability to 15 hours per week"
- "Add my GitHub URL to my profile"

#### Project Management
- "Create a new AI project for building a chatbot"
- "List all my projects"
- "Show me details for project [project-id]"
- "Update project [project-id] to need 3 volunteers instead of 5"
- "Delete project [project-id]"

## Troubleshooting

### Local Development Issues

1. **"No API key found"**
   - Run `claude-code auth login` to set your key

2. **"Permission denied"**
   - Ensure you're in the correct project directory
   - Check file permissions

3. **"Context too large"**
   - Focus on specific files/areas when asking questions

### Remote MCP Issues

1. **"Failed to connect to MCP server"**
   - Check your internet connection
   - Verify the server URL is exactly: `https://maix.io/api/mcp`
   - Ensure your Personal Access Token is valid

2. **"Authentication failed"**
   - Regenerate your Personal Access Token in MAIX settings
   - Make sure token is copied completely without extra spaces

3. **"Server not responding"**
   - Check if MAIX platform is online: https://maix.io
   - Try disconnecting and reconnecting the MCP server

## Security Best Practices

1. **Protect Your Tokens**
   - Never share your Personal Access Token
   - Don't commit tokens to version control
   - Regenerate if potentially compromised

2. **Token Management**
   - Use descriptive names for different devices
   - Regularly review and revoke unused tokens
   - Monitor usage in MAIX settings

## Getting Help

- Run `claude-code --help` for command options
- Visit [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- MAIX Support: Contact support through the platform
- Claude Code MCP Status: Use `/mcp` command to check server status

## Next Steps

### For Developers (Local)
- Get help implementing new features
- Review code for best practices  
- Generate tests and documentation
- Debug issues with AI assistance

### For Users (Remote MCP)
- Keep your profile updated through Claude Code
- Create and manage projects efficiently
- Get AI assistance with project descriptions
- Streamline your MAIX workflow from the terminal

The MCP integration brings the full power of the MAIX platform directly into your Claude Code CLI workflow!