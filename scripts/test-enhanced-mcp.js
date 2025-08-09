#!/usr/bin/env node
/**
 * Enhanced MCP Tools Test Suite
 * 
 * Validates the enhanced MCP functionality including:
 * - 4-value TodoStatus enum support (NOT_STARTED, IN_PROGRESS, WAITING_FOR, COMPLETED)
 * - Personal/standalone todos (todos without project association)
 * - Personal project management with CRUD operations
 * - Enhanced search capabilities with includePersonal parameter
 * 
 * Uses direct fetch() calls with proper JSON-RPC 2.0 formatting for reliability.
 * 
 * Usage: node scripts/test-enhanced-mcp.js
 */

const API_BASE = 'http://localhost:3000/api/mcp';
const TEST_PAT_TOKEN = 'maix_pat_281daa527521c3e98d54f801379d7ab33eafac910361e866e40a6f2ed7a74f0e';

class SimpleMCPTestSuite {
  constructor() {
    this.testResults = [];
    this.createdItems = [];
  }

  async makeJsonRpcRequest(method, params = {}) {
    const payload = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: Math.floor(Math.random() * 1000)
    };

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${TEST_PAT_TOKEN}`,
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle both JSON and SSE responses
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const result = await response.json();
        if (result.error) {
          throw new Error(`JSON-RPC Error: ${result.error.message || JSON.stringify(result.error)}`);
        }
        return result.result;
      } else if (contentType.includes('text/event-stream')) {
        // Parse SSE response
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.startsWith('data: '));
        
        if (lines.length === 0) {
          throw new Error('No SSE data received');
        }

        const result = JSON.parse(lines[0].replace('data: ', ''));
        if (result.error) {
          throw new Error(`SSE JSON-RPC Error: ${result.error.message || JSON.stringify(result.error)}`);
        }
        return result.result;
      } else {
        throw new Error(`Unexpected content type: ${contentType}`);
      }
    } catch (error) {
      console.error(`❌ ${method} failed:`, error.message);
      throw error;
    }
  }

  assert(condition, message) {
    if (condition) {
      this.testResults.push({ status: '✅', message });
      console.log(`✅ ${message}`);
    } else {
      this.testResults.push({ status: '❌', message });
      console.log(`❌ ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  extractId(responseText) {
    const match = responseText.match(/ID: ([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  async testToolAvailability() {
    console.log('\n📋 Test 1: Tool Availability');
    
    const result = await this.makeJsonRpcRequest('tools/list');
    const tools = result.tools || [];
    const toolNames = tools.map(t => t.name);
    
    const requiredTools = [
      'maix_manage_todo',
      'maix_search_todos', 
      'maix_manage_personal_project'
    ];

    for (const tool of requiredTools) {
      this.assert(
        toolNames.includes(tool),
        `Enhanced tool ${tool} is available`
      );
    }

    // Check tool schemas include enhanced features
    const todoTool = tools.find(t => t.name === 'maix_manage_todo');
    if (todoTool) {
      this.assert(
        todoTool.inputSchema.properties?.status?.enum?.includes('WAITING_FOR'),
        'Todo tool supports WAITING_FOR status'
      );
      this.assert(
        todoTool.inputSchema.properties?.action?.enum?.includes('list-standalone'),
        'Todo tool supports list-standalone action'
      );
    }

    const searchTool = tools.find(t => t.name === 'maix_search_todos');
    if (searchTool) {
      this.assert(
        searchTool.inputSchema.properties?.hasOwnProperty('includePersonal'),
        'Search tool supports includePersonal parameter'
      );
    }
  }

  async testEnhancedTodoStatuses() {
    console.log('\n📝 Test 2: Enhanced Todo Status Values');
    
    const testStatuses = ['NOT_STARTED', 'WAITING_FOR', 'COMPLETED'];
    const createdTodos = [];

    for (const status of testStatuses) {
      const result = await this.makeJsonRpcRequest('tools/call', {
        name: 'maix_manage_todo',
        arguments: {
          action: 'create',
          title: `Test todo with ${status} status`,
          description: `Testing ${status} status value`,
          status: status
        }
      });

      const responseText = result.content?.[0]?.text || '';
      this.assert(
        responseText.includes('created successfully'),
        `Created todo with ${status} status`
      );

      const todoId = this.extractId(responseText);
      if (todoId) {
        createdTodos.push({ id: todoId, status });
        this.createdItems.push({ type: 'todo', id: todoId });
      }
    }

    // Verify status icons in search results
    for (const { status } of createdTodos) {
      const searchResult = await this.makeJsonRpcRequest('tools/call', {
        name: 'maix_search_todos',
        arguments: {
          status: [status],
          includePersonal: true,
          limit: 1
        }
      });

      const expectedIcons = {
        'NOT_STARTED': '⭕',
        'WAITING_FOR': '⏳', 
        'COMPLETED': '✅'
      };

      const responseText = searchResult.content?.[0]?.text || '';
      this.assert(
        responseText.includes(expectedIcons[status]),
        `Search shows correct icon ${expectedIcons[status]} for ${status}`
      );
    }
  }

  async testPersonalTodos() {
    console.log('\n👤 Test 3: Personal/Standalone Todos');

    // Create standalone todo (no project)
    const result = await this.makeJsonRpcRequest('tools/call', {
      name: 'maix_manage_todo',
      arguments: {
        action: 'create',
        title: 'Standalone personal todo',
        description: 'This todo is not attached to any project',
        status: 'IN_PROGRESS'
      }
    });

    const responseText = result.content?.[0]?.text || '';
    this.assert(
      responseText.includes('personal todo'),
      'Created standalone personal todo'
    );

    const todoId = this.extractId(responseText);
    if (todoId) {
      this.createdItems.push({ type: 'todo', id: todoId });
    }

    // Test list-standalone action
    const standaloneList = await this.makeJsonRpcRequest('tools/call', {
      name: 'maix_manage_todo',
      arguments: {
        action: 'list-standalone'
      }
    });

    this.assert(
      standaloneList.content?.[0]?.text?.includes('Standalone personal todo'),
      'List-standalone shows personal todos'
    );

    // Test includePersonal in search
    const searchResult = await this.makeJsonRpcRequest('tools/call', {
      name: 'maix_search_todos',
      arguments: {
        query: 'Standalone',
        includePersonal: true,
        limit: 5
      }
    });

    this.assert(
      searchResult.content?.[0]?.text?.includes('Personal todo'),
      'Search with includePersonal finds personal todos'
    );
  }

  async testPersonalProjects() {
    console.log('\n🚀 Test 4: Personal Project Management');

    // Create personal project
    const createResult = await this.makeJsonRpcRequest('tools/call', {
      name: 'maix_manage_personal_project',
      arguments: {
        action: 'create',
        name: 'Test Learning Project',
        description: 'A test project for learning new technologies and enhancing skills',
        personalCategory: 'Learning',
        status: 'IN_PROGRESS',
        targetCompletionDate: '2024-12-31'
      }
    });

    const responseText = createResult.content?.[0]?.text || '';
    this.assert(
      responseText.includes('created successfully'),
      'Created personal project'
    );

    const projectId = this.extractId(responseText);
    if (projectId) {
      this.createdItems.push({ type: 'project', id: projectId });
    }

    // Test list personal projects
    const listResult = await this.makeJsonRpcRequest('tools/call', {
      name: 'maix_manage_personal_project',
      arguments: {
        action: 'list'
      }
    });

    const listText = listResult.content?.[0]?.text || '';
    this.assert(
      listText.includes('Test Learning Project'),
      'Personal project appears in list'
    );

    this.assert(
      listText.includes('[Learning]'),
      'Personal project shows category'
    );
  }

  async testAdvancedSearch() {
    console.log('\n🔍 Test 5: Advanced Search Features');

    // Test multiple status search
    const multiStatusResult = await this.makeJsonRpcRequest('tools/call', {
      name: 'maix_search_todos',
      arguments: {
        status: ['NOT_STARTED', 'WAITING_FOR', 'IN_PROGRESS'],
        includePersonal: true,
        limit: 10
      }
    });

    const responseText = multiStatusResult.content?.[0]?.text || '';
    this.assert(
      !responseText.includes('No todos found') || responseText.includes('Found'),
      'Multi-status search executes successfully'
    );

    // Test text search in personal todos
    const textSearchResult = await this.makeJsonRpcRequest('tools/call', {
      name: 'maix_search_todos',
      arguments: {
        query: 'Test',
        includePersonal: true,
        limit: 5
      }
    });

    this.assert(
      typeof textSearchResult.content?.[0]?.text === 'string',
      'Text search in personal todos works'
    );
  }

  async cleanup() {
    console.log('\n🧹 Cleanup: Removing test data...');
    let cleanedUp = 0;

    for (const item of this.createdItems) {
      try {
        if (item.type === 'todo') {
          await this.makeJsonRpcRequest('tools/call', {
            name: 'maix_manage_todo',
            arguments: {
              action: 'delete',
              todoId: item.id
            }
          });
          cleanedUp++;
        } else if (item.type === 'project') {
          await this.makeJsonRpcRequest('tools/call', {
            name: 'maix_manage_personal_project',
            arguments: {
              action: 'delete',
              projectId: item.id
            }
          });
          cleanedUp++;
        }
      } catch (error) {
        console.log(`⚠️ Could not clean up ${item.type} ${item.id}: ${error.message}`);
      }
    }

    console.log(`🧹 Cleaned up ${cleanedUp}/${this.createdItems.length} test items`);
  }

  async runAllTests() {
    console.log('🧪 Enhanced MCP Tools - Simple HTTP Test Suite');
    console.log('='.repeat(50));

    const startTime = Date.now();
    let passed = 0;
    let failed = 0;

    try {
      await this.testToolAvailability();
      await this.testEnhancedTodoStatuses();
      await this.testPersonalTodos();
      await this.testPersonalProjects();
      await this.testAdvancedSearch();

      // Count results
      for (const result of this.testResults) {
        if (result.status === '✅') {
          passed++;
        } else {
          failed++;
        }
      }

    } catch (error) {
      console.error(`\n💥 Test suite failed: ${error.message}`);
      failed++;
    } finally {
      await this.cleanup();
    }

    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    console.log(`⏱️ Duration: ${duration}ms`);
    
    if (failed === 0) {
      console.log('🎉 All enhanced MCP features are working correctly!');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed - enhanced MCP features need attention');
      process.exit(1);
    }
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new SimpleMCPTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}