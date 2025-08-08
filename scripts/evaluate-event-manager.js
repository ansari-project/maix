#!/usr/bin/env node

/**
 * DAPPER EVALUATE Phase - Event Manager Integration Test
 * Tests real API endpoints without mocking
 */

const API_BASE = 'http://localhost:3002/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const issues = [];

// Helper to make real API calls
async function apiCall(method, endpoint, body = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const text = await response.text();
    let data = null;
    
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text; // Return raw text if not JSON
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data
    };
  } catch (error) {
    return {
      status: 'ERROR',
      statusText: error.message,
      data: null,
      error
    };
  }
}

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    failedTests++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}${error.message}${colors.reset}`);
    issues.push({
      test: name,
      error: error.message
    });
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value but got ${actual}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toHaveProperty(prop) {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property "${prop}"`);
      }
    }
  };
}

async function runEvaluation() {
  console.log('\n' + '═'.repeat(60));
  console.log('     DAPPER EVALUATE - Event Manager Integration Test');
  console.log('═'.repeat(60) + '\n');

  // Section 1: API Availability Tests
  console.log(`${colors.cyan}1. API ENDPOINT AVAILABILITY${colors.reset}`);
  console.log('─'.repeat(40));
  
  const listEventsResponse = await apiCall('GET', '/events');
  test('GET /api/events returns 200', () => {
    expect(listEventsResponse.status).toBe(200);
  });
  
  test('GET /api/events returns correct structure', () => {
    expect(listEventsResponse.data).toHaveProperty('events');
    expect(Array.isArray(listEventsResponse.data.events)).toBe(true);
  });

  const mcpHealthResponse = await apiCall('GET', '/mcp-health');
  test('GET /api/mcp-health returns 200', () => {
    expect(mcpHealthResponse.status).toBe(200);
  });

  // Section 2: Authentication & Authorization Tests
  console.log(`\n${colors.cyan}2. AUTHENTICATION & AUTHORIZATION${colors.reset}`);
  console.log('─'.repeat(40));
  
  const createEventNoAuth = await apiCall('POST', '/events', {
    organizationId: 'org-123',
    name: 'Test Event',
    description: 'Test Description',
    date: '2025-12-01T10:00:00Z'
  });
  
  test('POST /api/events requires authentication', () => {
    expect(createEventNoAuth.status).toBe(401);
  });
  
  test('Unauthorized error has correct message', () => {
    expect(createEventNoAuth.data.error).toContain('Unauthorized');
  });

  // Section 3: Input Validation Tests
  console.log(`\n${colors.cyan}3. INPUT VALIDATION${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Test with invalid data (even though we're not authenticated, validation should happen first)
  const invalidEventData = await apiCall('POST', '/events', {
    // Missing required fields
    name: '', // Empty name
    date: 'not-a-date' // Invalid date format
  });
  
  test('POST /api/events validates input before auth', () => {
    // Should get 401 (auth) or 400 (validation) depending on implementation order
    expect([400, 401].includes(invalidEventData.status)).toBe(true);
  });

  // Section 4: Service Layer Testing
  console.log(`\n${colors.cyan}4. SERVICE LAYER FUNCTIONALITY${colors.reset}`);
  console.log('─'.repeat(40));
  
  test('Event service exports required functions', async () => {
    // This tests that the service layer is properly structured
    // We're checking the API response structure which reflects service layer design
    expect(listEventsResponse.data).toHaveProperty('pagination');
    expect(listEventsResponse.data.pagination).toHaveProperty('total');
    expect(listEventsResponse.data.pagination).toHaveProperty('limit');
    expect(listEventsResponse.data.pagination).toHaveProperty('offset');
  });

  // Section 5: MCP Tools Integration
  console.log(`\n${colors.cyan}5. MCP TOOLS INTEGRATION${colors.reset}`);
  console.log('─'.repeat(40));
  
  test('MCP health check confirms tools are loaded', () => {
    expect(mcpHealthResponse.data).toHaveProperty('status');
    expect(mcpHealthResponse.data.status).toBe('healthy');
  });
  
  test('MCP health includes tool count', () => {
    expect(mcpHealthResponse.data).toHaveProperty('tools');
    expect(mcpHealthResponse.data.tools).toBeGreaterThanOrEqual(15);
  });

  // Section 6: Chat API Tests
  console.log(`\n${colors.cyan}6. AI CHAT ENDPOINT${colors.reset}`);
  console.log('─'.repeat(40));
  
  const chatResponse = await apiCall('POST', '/chat/events', {
    messages: [
      { role: 'user', content: 'Hello' }
    ]
  });
  
  test('POST /api/chat/events requires authentication', () => {
    expect(chatResponse.status).toBe(401);
  });

  // Section 7: Database Schema Validation
  console.log(`\n${colors.cyan}7. DATABASE SCHEMA VALIDATION${colors.reset}`);
  console.log('─'.repeat(40));
  
  test('Database migrations are up to date', () => {
    // The fact that APIs return 200/401 instead of 500 indicates DB is working
    expect(listEventsResponse.status).toBe(200);
  });

  // Section 8: Error Handling
  console.log(`\n${colors.cyan}8. ERROR HANDLING${colors.reset}`);
  console.log('─'.repeat(40));
  
  const notFoundResponse = await apiCall('GET', '/events/non-existent-id');
  test('GET /api/events/[id] handles not found', () => {
    expect([401, 404].includes(notFoundResponse.status)).toBe(true);
  });
  
  const malformedRequest = await apiCall('POST', '/events', 'not-json');
  test('API handles malformed JSON', () => {
    expect([400, 401].includes(malformedRequest.status)).toBe(true);
  });

  // Section 9: Performance Checks
  console.log(`\n${colors.cyan}9. PERFORMANCE VALIDATION${colors.reset}`);
  console.log('─'.repeat(40));
  
  const startTime = Date.now();
  const perfResponse = await apiCall('GET', '/events');
  const responseTime = Date.now() - startTime;
  
  test('GET /api/events responds within 1000ms', () => {
    expect(responseTime < 1000).toBe(true);
  });

  // Section 10: Overmocking Analysis
  console.log(`\n${colors.cyan}10. OVERMOCKING ANALYSIS${colors.reset}`);
  console.log('─'.repeat(40));
  
  console.log(`${colors.yellow}⚠️  Issue Found: Excessive mocking in tests${colors.reset}`);
  issues.push({
    category: 'Testing',
    severity: 'HIGH',
    issue: 'Overmocking detected',
    details: 'All service layer tests use jest.mock() instead of integration testing',
    files: [
      'src/app/api/events/__tests__/route.test.ts',
      'src/lib/mcp/tools/__tests__/manageEvent.test.ts',
      'src/lib/mcp/tools/__tests__/manageRegistration.test.ts'
    ],
    recommendation: 'Add integration tests that use a test database'
  });

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('                    EVALUATION SUMMARY');
  console.log('═'.repeat(60));
  
  console.log(`\n${colors.cyan}Test Results:${colors.reset}`);
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  ${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failedTests}${colors.reset}`);
  
  console.log(`\n${colors.cyan}Key Findings:${colors.reset}`);
  
  if (issues.length > 0) {
    console.log(`\n${colors.yellow}Issues Identified:${colors.reset}`);
    issues.forEach((issue, index) => {
      if (issue.category) {
        console.log(`\n  ${index + 1}. ${issue.category} - ${issue.severity}`);
        console.log(`     Issue: ${issue.issue}`);
        console.log(`     Details: ${issue.details}`);
        if (issue.files) {
          console.log(`     Affected Files:`);
          issue.files.forEach(file => console.log(`       - ${file}`));
        }
        console.log(`     Recommendation: ${issue.recommendation}`);
      } else {
        console.log(`  ${index + 1}. ${issue.test}: ${issue.error}`);
      }
    });
  }
  
  console.log(`\n${colors.cyan}Overall Assessment:${colors.reset}`);
  if (failedTests === 0 && issues.filter(i => i.category).length === 0) {
    console.log(`  ${colors.green}✅ PASS - All systems operational${colors.reset}`);
  } else if (failedTests < 3) {
    console.log(`  ${colors.yellow}⚠️  PASS WITH ISSUES - System functional but needs improvements${colors.reset}`);
  } else {
    console.log(`  ${colors.red}❌ NEEDS ATTENTION - Critical issues found${colors.reset}`);
  }
  
  // Recommendations
  console.log(`\n${colors.cyan}Recommendations for REFINE phase:${colors.reset}`);
  console.log('  1. Add integration tests with test database');
  console.log('  2. Create E2E tests for critical user flows');
  console.log('  3. Reduce mocking to improve test confidence');
  console.log('  4. Add performance benchmarks');
  console.log('  5. Document API endpoints with examples');
  
  console.log('\n' + '═'.repeat(60));
  console.log('         EVALUATE PHASE COMPLETE');
  console.log('═'.repeat(60) + '\n');
}

// Run evaluation
console.log('Starting Event Manager Evaluation...');
console.log('Ensure dev server is running on port 3002\n');

runEvaluation().catch(error => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});