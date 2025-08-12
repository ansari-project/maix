#!/usr/bin/env node

/**
 * AI Chat CLI Tool
 * 
 * A command-line tool for testing the AI chat endpoint with secure authentication.
 * Uses the test-session endpoint to obtain a JWT token for automated testing.
 * 
 * Usage:
 *   node scripts/ai-chat.js "your message here"
 *   node scripts/ai-chat.js --raw "show my todos"  # Show raw response
 *   node scripts/ai-chat.js --help
 */

const fetch = require('node-fetch');

// Configuration (can be overridden with environment variables)
const CONFIG = {
  baseUrl: process.env.MAIX_BASE_URL || 'http://localhost:3000',
  secretKey: process.env.TEST_SESSION_SECRET_KEY || 'dev-test-key-2b4d6e8f9a1c3e5g7h9j2k4m6p8q1s3u5w7y9z',
  timezone: process.env.TZ || 'America/Los_Angeles',
  showDebug: process.env.DEBUG === 'true'
};

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  console.log(color + message + colors.reset);
}

function error(message) {
  console.error(colors.red + '❌ ' + message + colors.reset);
}

function success(message) {
  log('✅ ' + message, colors.green);
}

function info(message) {
  log('ℹ️  ' + message, colors.cyan);
}

function debug(message) {
  if (CONFIG.showDebug) {
    log('🔍 ' + message, colors.dim);
  }
}

async function getAuthToken() {
  debug('Getting authentication token...');
  
  try {
    const response = await fetch(`${CONFIG.baseUrl}/api/auth/test-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Session-Key': CONFIG.secretKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    debug(`Token obtained for user: ${result.user.email}`);
    return result.token;
  } catch (err) {
    throw new Error(`Failed to get auth token: ${err.message}`);
  }
}

async function sendMessage(message, token, showRaw = false) {
  debug('Sending message to AI...');
  
  try {
    const response = await fetch(`${CONFIG.baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        conversationId: null,
        timezone: CONFIG.timezone
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI request failed (${response.status}): ${errorText}`);
    }
    
    // Parse the Server-Sent Events response
    const fullResponse = await response.text();
    
    if (showRaw) {
      // Show raw SSE response for debugging
      console.log('\n' + colors.dim + '=== Raw Response ===' + colors.reset);
      console.log(fullResponse);
      console.log(colors.dim + '=== End Raw Response ===' + colors.reset + '\n');
    }
    
    // Extract the actual message from SSE format
    const lines = fullResponse.split('\n');
    let aiResponse = '';
    
    for (const line of lines) {
      // SSE format: "0:content" or "d:content" for data chunks
      if (line.startsWith('0:') || line.startsWith('d:') || line.startsWith('8:')) {
        const content = line.substring(2);
        
        try {
          const parsed = JSON.parse(content);
          if (typeof parsed === 'string') {
            aiResponse += parsed;
          }
        } catch (e) {
          // If not JSON, treat as plain text
          if (content && content !== '[DONE]') {
            aiResponse += content;
          }
        }
      }
    }
    
    return aiResponse;
  } catch (err) {
    throw new Error(`Failed to send message: ${err.message}`);
  }
}

function showHelp() {
  console.log(`
${colors.bright}AI Chat CLI Tool${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node scripts/ai-chat.js [options] <message>

${colors.yellow}Options:${colors.reset}
  --help, -h          Show this help message
  --raw, -r           Show raw SSE response (for debugging)
  --debug, -d         Show debug information
  --url <url>         Override base URL (default: http://localhost:3000)
  --timezone <tz>     Set timezone (default: America/Los_Angeles)

${colors.yellow}Examples:${colors.reset}
  node scripts/ai-chat.js "What are my todos?"
  node scripts/ai-chat.js --raw "Show my active tasks"
  node scripts/ai-chat.js --debug --url http://localhost:4000 "Help me with a project"

${colors.yellow}Environment Variables:${colors.reset}
  MAIX_BASE_URL          Base URL for the API
  TEST_SESSION_SECRET_KEY Secret key for authentication
  TZ                     Timezone
  DEBUG                  Set to 'true' for debug output
  `);
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  let message = '';
  let showRaw = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--raw' || arg === '-r') {
      showRaw = true;
    } else if (arg === '--debug' || arg === '-d') {
      CONFIG.showDebug = true;
    } else if (arg === '--url' && i + 1 < args.length) {
      CONFIG.baseUrl = args[++i];
    } else if (arg === '--timezone' && i + 1 < args.length) {
      CONFIG.timezone = args[++i];
    } else if (!arg.startsWith('-')) {
      // Treat as the message
      message = args.slice(i).join(' ');
      break;
    }
  }
  
  // Check if message was provided
  if (!message) {
    error('No message provided');
    console.log('Usage: node scripts/ai-chat.js [options] <message>');
    console.log('Try: node scripts/ai-chat.js --help');
    process.exit(1);
  }
  
  try {
    // Show what we're doing
    info(`Connecting to ${CONFIG.baseUrl}`);
    info(`Message: "${message}"`);
    
    // Get authentication token
    const token = await getAuthToken();
    success('Authenticated successfully');
    
    // Send message and get response
    info('Sending message to AI assistant...');
    const response = await sendMessage(message, token, showRaw);
    
    // Display the response
    console.log('\n' + colors.bright + '🤖 AI Response:' + colors.reset);
    console.log('─'.repeat(50));
    console.log(response || '(No response)');
    console.log('─'.repeat(50) + '\n');
    
    success('Done!');
    
  } catch (err) {
    error(err.message);
    if (CONFIG.showDebug) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

// Run the tool
if (require.main === module) {
  main();
}