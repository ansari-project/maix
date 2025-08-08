#!/usr/bin/env node

/**
 * DAPPER EVALUATE Phase - [FEATURE NAME] Integration Test
 * 
 * This template provides a standard evaluation framework for all features.
 * Copy this file and customize for your specific feature.
 * 
 * Usage: node scripts/evaluate-[feature-name].js
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
      data = text;
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
  console.log('     DAPPER EVALUATE - [FEATURE NAME] Integration Test');
  console.log('═'.repeat(60) + '\n');

  // ========================================
  // CUSTOMIZE THESE SECTIONS FOR YOUR FEATURE
  // ========================================

  // Section 1: API Availability Tests
  console.log(`${colors.cyan}1. API ENDPOINT AVAILABILITY${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Example: Test your feature's main endpoint
  const mainEndpointResponse = await apiCall('GET', '/your-endpoint');
  test('GET /api/your-endpoint returns 200', () => {
    expect(mainEndpointResponse.status).toBe(200);
  });
  
  // Add more endpoint tests...

  // Section 2: Authentication & Authorization Tests
  console.log(`\n${colors.cyan}2. AUTHENTICATION & AUTHORIZATION${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Test protected endpoints
  const protectedResponse = await apiCall('POST', '/your-endpoint', {
    data: 'test'
  });
  
  test('Protected endpoints require authentication', () => {
    expect(protectedResponse.status).toBe(401);
  });

  // Section 3: Input Validation Tests
  console.log(`\n${colors.cyan}3. INPUT VALIDATION${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Test with invalid data
  const invalidDataResponse = await apiCall('POST', '/your-endpoint', {
    // Invalid data structure
  });
  
  test('Validates input data', () => {
    expect([400, 401].includes(invalidDataResponse.status)).toBe(true);
  });

  // Section 4: Business Logic Tests
  console.log(`\n${colors.cyan}4. BUSINESS LOGIC${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Add your feature-specific business logic tests here
  
  // Section 5: Performance Tests
  console.log(`\n${colors.cyan}5. PERFORMANCE VALIDATION${colors.reset}`);
  console.log('─'.repeat(40));
  
  const startTime = Date.now();
  const perfResponse = await apiCall('GET', '/your-endpoint');
  const responseTime = Date.now() - startTime;
  
  test('Endpoint responds within acceptable time', () => {
    expect(responseTime < 1000).toBe(true);
  });

  // Section 6: Error Handling Tests
  console.log(`\n${colors.cyan}6. ERROR HANDLING${colors.reset}`);
  console.log('─'.repeat(40));
  
  const notFoundResponse = await apiCall('GET', '/your-endpoint/non-existent');
  test('Handles not found errors', () => {
    expect([404, 401].includes(notFoundResponse.status)).toBe(true);
  });

  // Section 7: Integration Tests Check
  console.log(`\n${colors.cyan}7. INTEGRATION TEST COVERAGE${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Check if integration tests exist
  const fs = require('fs');
  const path = require('path');
  const integrationTestPath = path.join(__dirname, '../src/lib/services/__tests__');
  
  if (fs.existsSync(integrationTestPath)) {
    const files = fs.readdirSync(integrationTestPath);
    const integrationTests = files.filter(f => f.includes('.integration.test.'));
    
    test('Has integration test files', () => {
      expect(integrationTests.length).toBeGreaterThanOrEqual(1);
    });
  } else {
    issues.push({
      category: 'Testing',
      severity: 'HIGH',
      issue: 'No integration tests found',
      recommendation: 'Add integration tests with real database'
    });
  }

  // Section 8: Overmocking Analysis
  console.log(`\n${colors.cyan}8. OVERMOCKING ANALYSIS${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Count mocks in test files
  const { execSync } = require('child_process');
  try {
    const mockCount = execSync(
      'grep -r "jest.mock" src --include="*.test.ts" 2>/dev/null | wc -l'
    ).toString().trim();
    
    const mockCountNum = parseInt(mockCount);
    if (mockCountNum > 50) {
      console.log(`${colors.yellow}⚠️  High mock count: ${mockCountNum} mocks found${colors.reset}`);
      issues.push({
        category: 'Testing',
        severity: 'MEDIUM',
        issue: `High mock usage (${mockCountNum} mocks)`,
        recommendation: 'Consider replacing mocks with integration tests'
      });
    } else {
      console.log(`${colors.green}✓ Mock usage is reasonable: ${mockCountNum} mocks${colors.reset}`);
    }
  } catch (e) {
    // Grep failed, skip this check
  }

  // ========================================
  // SUMMARY SECTION - CUSTOMIZE AS NEEDED
  // ========================================
  
  console.log('\n' + '═'.repeat(60));
  console.log('                    EVALUATION SUMMARY');
  console.log('═'.repeat(60));
  
  console.log(`\n${colors.cyan}Test Results:${colors.reset}`);
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  ${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failedTests}${colors.reset}`);
  
  if (issues.length > 0) {
    console.log(`\n${colors.yellow}Issues Identified:${colors.reset}`);
    issues.forEach((issue, index) => {
      if (issue.category) {
        console.log(`\n  ${index + 1}. ${issue.category} - ${issue.severity}`);
        console.log(`     Issue: ${issue.issue}`);
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
  
  console.log(`\n${colors.cyan}Recommendations for REFINE phase:${colors.reset}`);
  console.log('  1. Address any failing tests');
  console.log('  2. Add integration tests if missing');
  console.log('  3. Reduce mocking if count is high');
  console.log('  4. Fix any performance issues');
  console.log('  5. Document any unclear APIs');
  
  console.log('\n' + '═'.repeat(60));
  console.log('         EVALUATE PHASE COMPLETE');
  console.log('═'.repeat(60) + '\n');
}

// Run evaluation
console.log('Starting [FEATURE NAME] Evaluation...');
console.log('Ensure dev server is running on port 3002\n');

runEvaluation().catch(error => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});