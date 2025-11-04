#!/usr/bin/env node

/**
 * Comprehensive Connection and Authentication Test Suite
 * Tests all major components of the VOFC Engine
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`🔍 ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test results tracking
const testResults = {
  environment: { passed: 0, failed: 0, warnings: 0 },
  supabase: { passed: 0, failed: 0, warnings: 0 },
  ollama: { passed: 0, failed: 0, warnings: 0 },
  api: { passed: 0, failed: 0, warnings: 0 },
  auth: { passed: 0, failed: 0, warnings: 0 }
};

// Configuration
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ollamaUrl: process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || 'https://ollama.frostech.site',
  ollamaModel: process.env.OLLAMA_MODEL || 'vofc-engine:latest',
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development'
};

/**
 * Test 1: Environment Configuration
 */
async function testEnvironment() {
  logSection('Environment Configuration');
  
  const requiredVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: config.supabaseUrl, critical: true },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: config.supabaseAnonKey, critical: true },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: config.supabaseServiceKey, critical: true },
    { name: 'OLLAMA_URL', value: config.ollamaUrl, critical: false },
    { name: 'JWT_SECRET', value: config.jwtSecret, critical: true }
  ];

  for (const envVar of requiredVars) {
    if (envVar.value) {
      logSuccess(`${envVar.name}: Configured`);
      testResults.environment.passed++;
    } else {
      if (envVar.critical) {
        logError(`${envVar.name}: Missing (CRITICAL)`);
        testResults.environment.failed++;
      } else {
        logWarning(`${envVar.name}: Missing (Optional)`);
        testResults.environment.warnings++;
      }
    }
  }

  // Check for .env files
  const envFiles = ['.env.local', '.env', '.env.development', '.env.production'];
  let envFileFound = false;
  
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      logSuccess(`Found environment file: ${envFile}`);
      envFileFound = true;
      break;
    }
  }
  
  if (!envFileFound) {
    logWarning('No .env files found - using system environment variables');
  }

  logInfo(`Node Environment: ${config.nodeEnv}`);
}

/**
 * Test 2: Supabase Database Connection
 */
async function testSupabaseConnection() {
  logSection('Supabase Database Connection');
  
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    logError('Cannot test Supabase - missing environment variables');
    testResults.supabase.failed++;
    return;
  }

  try {
    // Test basic connectivity
    logInfo('Testing Supabase connectivity...');
    const response = await fetch(`${config.supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': config.supabaseServiceKey,
        'Authorization': `Bearer ${config.supabaseServiceKey}`
      }
    });

    if (response.ok) {
      logSuccess('Supabase server is reachable');
      testResults.supabase.passed++;
    } else {
      logError(`Supabase server error: ${response.status} ${response.statusText}`);
      testResults.supabase.failed++;
      return;
    }

    // Test database query
    logInfo('Testing database query...');
    const dbResponse = await fetch(`${config.supabaseUrl}/rest/v1/user_profiles?select=count`, {
      headers: {
        'apikey': config.supabaseServiceKey,
        'Authorization': `Bearer ${config.supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (dbResponse.ok) {
      logSuccess('Database query successful');
      testResults.supabase.passed++;
    } else {
      logWarning(`Database query warning: ${dbResponse.status} ${dbResponse.statusText}`);
      testResults.supabase.warnings++;
    }

    // Test authentication endpoint
    logInfo('Testing authentication endpoint...');
    const authResponse = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': config.supabaseAnonKey
      }
    });

    if (authResponse.ok) {
      logSuccess('Authentication endpoint accessible');
      testResults.supabase.passed++;
    } else {
      logWarning(`Authentication endpoint warning: ${authResponse.status} ${authResponse.statusText}`);
      testResults.supabase.warnings++;
    }

  } catch (error) {
    logError(`Supabase connection failed: ${error.message}`);
    testResults.supabase.failed++;
  }
}

/**
 * Test 3: Ollama Backend Connection
 */
async function testOllamaConnection() {
  logSection('Ollama Backend Connection');
  
  try {
    // Test basic connectivity
    logInfo('Testing Ollama server connectivity...');
    const healthResponse = await fetch(`${config.ollamaUrl}/api/tags`);
    
    if (!healthResponse.ok) {
      throw new Error(`HTTP ${healthResponse.status}: ${healthResponse.statusText}`);
    }
    
    const healthData = await healthResponse.json();
    logSuccess('Ollama server is running');
    logInfo(`Available models: ${healthData.models?.length || 0}`);
    testResults.ollama.passed++;
    
    // Check for target model
    const targetModel = healthData.models?.find(m => m.name === config.ollamaModel);
    if (targetModel) {
      logSuccess(`Target model '${config.ollamaModel}' is available`);
      testResults.ollama.passed++;
    } else {
      logWarning(`Target model '${config.ollamaModel}' not found`);
      testResults.ollama.warnings++;
    }
    
    // Test chat API
    logInfo('Testing chat API...');
    const chatResponse = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ollamaModel,
        messages: [
          { role: 'user', content: 'Hello, are you working?' }
        ],
        stream: false
      })
    });
    
    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      logSuccess('Chat API is working');
      logInfo(`Response: ${chatData.message?.content || 'No content received'}`);
      testResults.ollama.passed++;
    } else {
      logWarning(`Chat API warning: ${chatResponse.status} ${chatResponse.statusText}`);
      testResults.ollama.warnings++;
    }
    
  } catch (error) {
    logError(`Ollama connection failed: ${error.message}`);
    testResults.ollama.failed++;
  }
}

/**
 * Test 4: API Routes
 */
async function testAPIRoutes() {
  logSection('API Routes Testing');
  
  const baseUrl = 'http://localhost:3000';
  const apiRoutes = [
    { path: '/api/test-status', method: 'GET', description: 'System status endpoint' },
    { path: '/api/auth/verify', method: 'GET', description: 'Authentication verification' },
    { path: '/api/monitor/system', method: 'GET', description: 'System monitoring' },
    { path: '/api/documents/production-sync', method: 'POST', description: 'Document sync' }
  ];

  for (const route of apiRoutes) {
    try {
      logInfo(`Testing ${route.method} ${route.path}...`);
      
      const response = await fetch(`${baseUrl}${route.path}`, {
        method: route.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        logSuccess(`${route.description}: OK (${response.status})`);
        testResults.api.passed++;
      } else {
        logWarning(`${route.description}: ${response.status} ${response.statusText}`);
        testResults.api.warnings++;
      }
      
    } catch (error) {
      logError(`${route.description}: ${error.message}`);
      testResults.api.failed++;
    }
  }
}

/**
 * Test 5: Authentication System
 */
async function testAuthentication() {
  logSection('Authentication System');
  
  // Test JWT secret
  if (config.jwtSecret) {
    logSuccess('JWT secret is configured');
    testResults.auth.passed++;
  } else {
    logError('JWT secret is missing');
    testResults.auth.failed++;
  }
  
  // Test Supabase auth configuration
  if (config.supabaseUrl && config.supabaseAnonKey) {
    logSuccess('Supabase auth configuration is present');
    testResults.auth.passed++;
  } else {
    logError('Supabase auth configuration is missing');
    testResults.auth.failed++;
  }
  
  // Test auth endpoints
  try {
    const authTestResponse = await fetch('http://localhost:3000/api/auth/verify');
    if (authTestResponse.ok) {
      logSuccess('Authentication endpoint is accessible');
      testResults.auth.passed++;
    } else {
      logWarning(`Authentication endpoint: ${authTestResponse.status} ${authTestResponse.statusText}`);
      testResults.auth.warnings++;
    }
  } catch (error) {
    logError(`Authentication endpoint test failed: ${error.message}`);
    testResults.auth.failed++;
  }
}

/**
 * Generate Test Report
 */
function generateReport() {
  logSection('Test Results Summary');
  
  const categories = Object.keys(testResults);
  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;
  
  for (const category of categories) {
    const results = testResults[category];
    totalPassed += results.passed;
    totalFailed += results.failed;
    totalWarnings += results.warnings;
    
    const status = results.failed === 0 ? '✅' : results.failed > 0 ? '❌' : '⚠️';
    log(`${status} ${category.toUpperCase()}: ${results.passed} passed, ${results.failed} failed, ${results.warnings} warnings`);
  }
  
  log(`\n📊 OVERALL: ${totalPassed} passed, ${totalFailed} failed, ${totalWarnings} warnings`);
  
  if (totalFailed === 0) {
    log('\n🎉 All critical tests passed! System is ready.', 'green');
  } else {
    log('\n🚨 Some critical tests failed. Please address the issues above.', 'red');
  }
  
  return totalFailed === 0;
}

/**
 * Main test runner
 */
async function runTests() {
  log('🚀 VOFC Engine Connection & Authentication Test Suite', 'bright');
  log('=' .repeat(60), 'cyan');
  
  try {
    await testEnvironment();
    await testSupabaseConnection();
    await testOllamaConnection();
    await testAPIRoutes();
    await testAuthentication();
    
    const success = generateReport();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
runTests();
