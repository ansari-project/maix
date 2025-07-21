# Claude Code Setup for MAIX

## Quick Setup

1. **Generate a MAIX Personal Access Token (PAT)**
   - Visit https://www.maix.io/settings/api
   - Click "Generate New Token"
   - Copy the token

2. **Add to your environment**
   ```bash
   echo "export MAIX_PAT='your-token-here'" >> .env
   source .env
   ```

3. **Add MAIX to Claude Code**
   ```bash
   claude mcp add maix https://www.maix.io/api/mcp --transport http --header "Authorization: Bearer ${MAIX_PAT}"
   ```

That's it! Claude Code can now interact with MAIX.