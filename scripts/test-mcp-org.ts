#!/usr/bin/env npx tsx

// Test MCP organization creation with PAT

const PAT = 'maix_pat_d75d65c681188d9ab8fef15ced7846cde75306830057ccbbd2614aaa18e9c522';
const MCP_URL = 'http://localhost:3000/api/mcp';

async function testMCPOrganization() {
  console.log('Testing MCP organization creation...\n');

  // First, let's test the initialize request
  console.log('1. Testing initialize request...');
  try {
    const initResponse = await fetch(MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {}
        },
        id: 1
      })
    });

    const initResult = await initResponse.json();
    console.log('Initialize response:', JSON.stringify(initResult, null, 2));
  } catch (error) {
    console.error('Initialize failed:', error);
  }

  console.log('\n2. Testing authenticated request to create organization...');
  try {
    const toolResponse = await fetch(MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAT}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'maix_manage_organization',
          arguments: {
            action: 'create',
            name: 'Ansari Project LLC',
            slug: 'ansari-project'
          }
        },
        id: 2
      })
    });

    const toolResult = await toolResponse.json();
    console.log('Tool call response:', JSON.stringify(toolResult, null, 2));
  } catch (error) {
    console.error('Tool call failed:', error);
  }

  console.log('\n3. Testing list organizations...');
  try {
    const listResponse = await fetch(MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAT}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'maix_manage_organization',
          arguments: {
            action: 'list'
          }
        },
        id: 3
      })
    });

    const listResult = await listResponse.json();
    console.log('List organizations response:', JSON.stringify(listResult, null, 2));
  } catch (error) {
    console.error('List failed:', error);
  }
}

testMCPOrganization().catch(console.error);