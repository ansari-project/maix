// Test script for the secure test-session endpoint
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_SECRET_KEY = 'dev-test-key-2b4d6e8f9a1c3e5g7h9j2k4m6p8q1s3u5w7y9z';

async function getSecureTestToken() {
  console.log('Getting secure test token...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/test-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Session-Key': TEST_SECRET_KEY
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Error response:', response.status, error);
      return null;
    }
    
    const result = await response.json();
    console.log('✅ Token obtained successfully!');
    console.log('User:', result.user);
    console.log('Expires in:', result.expiresIn);
    console.log('Token (first 50 chars):', result.token.substring(0, 50) + '...');
    
    return result.token;
  } catch (error) {
    console.error('Failed to get test token:', error);
    return null;
  }
}

async function testWithToken(token) {
  console.log('\nTesting AI chat with secure token...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'show my todos'
          }
        ],
        conversationId: null,
        timezone: 'America/Los_Angeles'
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Error response:', response.status, error);
      return;
    }
    
    // Parse streaming response
    console.log('\n=== AI Response Stream ===\n');
    
    const fullResponse = await response.text();
    const lines = fullResponse.split('\n');
    let aiResponse = '';
    
    for (const line of lines) {
      if (line.startsWith('0:') || line.startsWith('d:') || line.startsWith('8:')) {
        const content = line.substring(2);
        
        try {
          const parsed = JSON.parse(content);
          if (typeof parsed === 'string') {
            aiResponse += parsed;
            process.stdout.write(parsed);
          }
        } catch (e) {
          if (content && content !== '[DONE]') {
            aiResponse += content;
            process.stdout.write(content);
          }
        }
      }
    }
    
    console.log('\n\n=== End of Response ===\n');
    
    if (aiResponse.toLowerCase().includes('todo')) {
      console.log('✅ SUCCESS: Secure authentication worked and todos were retrieved!');
    } else {
      console.log('⚠️ WARNING: Authentication worked but todos were not mentioned');
    }
    
  } catch (error) {
    console.error('Failed to test AI chat:', error);
  }
}

async function main() {
  console.log('=== Testing Secure Test Session Endpoint ===\n');
  console.log('This is the recommended approach for AI assistants to authenticate.');
  console.log('It only works in development and requires a secret key.\n');
  
  const token = await getSecureTestToken();
  
  if (token) {
    await testWithToken(token);
  } else {
    console.log('❌ Failed to obtain test token');
  }
}

main();