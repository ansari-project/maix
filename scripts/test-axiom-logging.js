#!/usr/bin/env node

/**
 * Test script to verify Axiom logging is working correctly
 * This script tests both the custom Pino logger and next-axiom integration
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Testing Axiom Logging Integration\n');

// Check environment variables
console.log('📋 Checking environment variables...');
const requiredEnvVars = [
  'AXIOM_DATASET',
  'AXIOM_TOKEN',
  'NEXT_PUBLIC_AXIOM_DATASET', 
  'NEXT_PUBLIC_AXIOM_TOKEN'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.log('💡 Make sure your .env file contains all required AXIOM variables');
  process.exit(1);
}
console.log('✅ All environment variables present\n');

// Test 1: Custom Pino Logger (Server-side)
console.log('🧪 Test 1: Custom Pino Logger (Server-side)');
console.log('   Testing with NODE_ENV=production to trigger Axiom transport...');

try {
  // Force production mode to trigger Axiom transport
  const testScript = `
    process.env.NODE_ENV = 'production';
    const { logger } = require('./src/lib/logger.ts');
    
    const testData = {
      test: 'axiom-integration',
      timestamp: new Date().toISOString(),
      component: 'test-script',
      userId: 'test-user-123',
      action: 'server-side-log-test'
    };
    
    console.log('   Sending test log to Axiom...');
    logger.info('🚀 Server-side test log from Pino transport', testData);
    logger.warn('⚠️ Test warning log', { level: 'warn', ...testData });
    logger.error('❌ Test error log', new Error('Test error'), { level: 'error', ...testData });
    
    console.log('   ✅ Pino logs sent (check Axiom dashboard to verify receipt)');
  `;
  
  execSync(`node -e "${testScript}"`, { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to send Pino logs:', error.message);
}

console.log('');

// Test 2: Direct Axiom SDK Test
console.log('🧪 Test 2: Direct Axiom SDK Test');
console.log('   Testing direct connection to Axiom API...');

try {
  const directTestScript = `
    const axios = require('axios');
    
    const testEvent = {
      message: '🎯 Direct API test log',
      level: 'info',
      timestamp: new Date().toISOString(),
      test: 'direct-axiom-api',
      component: 'test-script',
      source: 'direct-sdk'
    };
    
    const config = {
      method: 'post',
      url: \`https://api.axiom.co/v1/datasets/\${process.env.AXIOM_DATASET}/ingest\`,
      headers: {
        'Authorization': \`Bearer \${process.env.AXIOM_TOKEN}\`,
        'Content-Type': 'application/json'
      },
      data: [testEvent]
    };
    
    axios(config)
      .then(() => console.log('   ✅ Direct API test successful'))
      .catch(err => {
        console.error('   ❌ Direct API test failed:', err.response?.status, err.response?.statusText);
        if (err.response?.data) {
          console.error('   Error details:', err.response.data);
        }
      });
  `;
  
  execSync(`npm list axios > /dev/null 2>&1 && node -e "${directTestScript}" || echo "   ⚠️ Skipping direct API test (axios not available)"`, { stdio: 'inherit' });
} catch (error) {
  console.log('   ⚠️ Direct API test skipped (missing dependencies)');
}

console.log('');

// Test 3: Check next-axiom integration
console.log('🧪 Test 3: next-axiom Integration Check');
try {
  const nextAxiomCheck = `
    const { Logger } = require('next-axiom');
    const log = new Logger({ source: 'test-script' });
    
    log.info('🌐 next-axiom test log', { 
      test: 'next-axiom-integration',
      timestamp: new Date().toISOString(),
      component: 'test-script'
    });
    
    // Note: In a real Next.js app, you'd call log.flush()
    // But in this test script, it may not work as expected
    console.log('   ✅ next-axiom logger created and called');
    console.log('   ⚠️ Note: Client-side logs require browser environment');
  `;
  
  execSync(`node -e "${nextAxiomCheck}"`, { stdio: 'inherit' });
} catch (error) {
  console.error('   ❌ next-axiom test failed:', error.message);
}

console.log('');

// Test Results Summary
console.log('📊 Test Summary');
console.log('===============');
console.log('1. ✅ Environment variables configured');
console.log('2. 🔄 Pino logger test completed (check Axiom dashboard)');
console.log('3. 🔄 Direct API test completed (if axios available)');
console.log('4. 🔄 next-axiom integration test completed');
console.log('');
console.log('🎯 Next Steps:');
console.log('   1. Check your Axiom dashboard at https://app.axiom.co/');
console.log(`   2. Look for logs in dataset: "${process.env.AXIOM_DATASET}"`);
console.log('   3. Search for logs with test: "axiom-integration"');
console.log('   4. Deploy to Vercel and test in production environment');
console.log('');
console.log('📱 For client-side logging test:');
console.log('   1. Start the dev server: npm run dev');
console.log('   2. Open browser console and run:');
console.log('      import { useLogger } from "next-axiom";');
console.log('      const log = useLogger();');
console.log('      log.info("Client test", { test: "browser-logging" });');
console.log('');
console.log('🔍 If logs don\'t appear in Axiom:');
console.log('   - Verify AXIOM_TOKEN has correct permissions');
console.log('   - Check dataset name matches exactly');
console.log('   - Ensure token is not expired');
console.log('   - Try the direct API test first');