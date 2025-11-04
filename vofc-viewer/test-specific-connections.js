#!/usr/bin/env node

/**
 * Targeted Connection Tests for VOFC Engine
 * Tests specific components with available environment variables
 */

// Load environment from project root .env
const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
} catch (_) {
  // dotenv optional; continue if unavailable
}

const https = require('https');
const http = require('http');

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

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function recordResult(success, isWarning = false) {
  if (success) {
    results.passed++;
  } else if (isWarning) {
    results.warnings++;
  } else {
    results.failed++;
  }
}

/**
 * Test 1: Ollama Server Connection
 */
async function testOllamaServer() {
  logSection('Ollama Server Connection');
  
  const ollamaUrl = process.env.OLLAMA_URL || 'https://ollama.frostech.site';
  const ollamaModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
  
  try {
    // Test 1: Basic connectivity
    logInfo('Testing Ollama server connectivity...');
    const healthResponse = await fetch(`${ollamaUrl}/api/tags`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      logSuccess('Ollama server is running');
      logInfo(`Available models: ${healthData.models?.length || 0}`);
      recordResult(true);
      
      // List available models
      if (healthData.models && healthData.models.length > 0) {
        logInfo('Available models:');
        healthData.models.forEach(model => {
          const sizeMB = model.size ? Math.round(model.size / 1024 / 1024) : 'unknown';
          log(`   - ${model.name} (${sizeMB}MB)`, 'blue');
        });
      }
      
      // Check for target model
      const targetModel = healthData.models?.find(m => m.name === ollamaModel);
      if (targetModel) {
        logSuccess(`Target model '${ollamaModel}' is available`);
        recordResult(true);
      } else {
        logWarning(`Target model '${ollamaModel}' not found`);
        recordResult(false, true);
      }
      
    } else {
      throw new Error(`HTTP ${healthResponse.status}: ${healthResponse.statusText}`);
    }
    
    // Test 2: Chat API
    logInfo('Testing chat API...');
    const chatResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
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
      recordResult(true);
    } else {
      logWarning(`Chat API warning: ${chatResponse.status} ${chatResponse.statusText}`);
      recordResult(false, true);
    }
    
  } catch (error) {
    logError(`Ollama connection failed: ${error.message}`);
    recordResult(false);
  }
}

/**
 * Test 2: Supabase Connection
 */
async function testSupabaseConnection() {
  logSection('Supabase Database Connection');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    logError('Cannot test Supabase - missing environment variables');
    logInfo('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    recordResult(false);
    return;
  }
  
  try {
    // Test 1: Basic connectivity
    logInfo('Testing Supabase server connectivity...');
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });

    if (response.ok) {
      logSuccess('Supabase server is reachable');
      recordResult(true);
    } else {
      logError(`Supabase server error: ${response.status} ${response.statusText}`);
      recordResult(false);
      return;
    }

    // Test 2: Database query
    logInfo('Testing database query...');
    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=count`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (dbResponse.ok) {
      logSuccess('Database query successful');
      recordResult(true);
    } else {
      logWarning(`Database query warning: ${dbResponse.status} ${dbResponse.statusText}`);
      recordResult(false, true);
    }

    // Test 3: Authentication endpoint
    logInfo('Testing authentication endpoint...');
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': supabaseServiceKey
      }
    });

    if (authResponse.ok) {
      logSuccess('Authentication endpoint accessible');
      recordResult(true);
    } else {
      logWarning(`Authentication endpoint warning: ${authResponse.status} ${authResponse.statusText}`);
      recordResult(false, true);
    }

  } catch (error) {
    logError(`Supabase connection failed: ${error.message}`);
    recordResult(false);
  }
}

/**
 * Test 3: Environment Variables
 */
function testEnvironmentVariables() {
  logSection('Environment Variables');
  
  const requiredVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL, critical: true },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY, critical: true },
    { name: 'OLLAMA_URL', value: process.env.OLLAMA_URL, critical: false },
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET, critical: true }
  ];

  for (const envVar of requiredVars) {
    if (envVar.value) {
      logSuccess(`${envVar.name}: Configured`);
      recordResult(true);
    } else {
      if (envVar.critical) {
        logError(`${envVar.name}: Missing (CRITICAL)`);
        recordResult(false);
      } else {
        logWarning(`${envVar.name}: Missing (Optional)`);
        recordResult(false, true);
      }
    }
  }
}

/**
 * Test 4: Local Development Server
 */
async function testLocalServer() {
  logSection('Local Development Server');
  
  try {
    logInfo('Testing local server on port 3000...');
    const response = await fetch('http://localhost:3000/api/test-status');
    
    if (response.ok) {
      const data = await response.json();
      logSuccess('Local server is running');
      logInfo(`Server status: ${JSON.stringify(data.status, null, 2)}`);
      recordResult(true);
    } else {
      logWarning(`Local server warning: ${response.status} ${response.statusText}`);
      recordResult(false, true);
    }
    
  } catch (error) {
    logWarning(`Local server not running: ${error.message}`);
    logInfo('Start the server with: npm run dev');
    recordResult(false, true);
  }
}

/**
 * Generate Summary Report
 */
function generateSummary() {
  logSection('Test Results Summary');
  
  log(`📊 Results: ${results.passed} passed, ${results.failed} failed, ${results.warnings} warnings`);
  
  if (results.failed === 0) {
    log('\n🎉 All critical tests passed! System is ready.', 'green');
  } else {
    log('\n🚨 Some critical tests failed. Please address the issues above.', 'red');
  }
  
  log('\n📋 Next Steps:');
  if (results.failed > 0) {
    log('1. Fix the critical issues listed above', 'yellow');
  }
  if (results.warnings > 0) {
    log('2. Address the warnings for optimal performance', 'yellow');
  }
  if (results.failed === 0) {
    log('1. Start the development server: npm run dev', 'green');
    log('2. Open http://localhost:3000 in your browser', 'green');
  }
  
  return results.failed === 0;
}

/**
 * Main test runner
 */
async function runTests() {
  log('🚀 VOFC Engine Targeted Connection Tests', 'bright');
  log('=' .repeat(60), 'cyan');
  
  try {
    testEnvironmentVariables();
    await testOllamaServer();
    await testSupabaseConnection();
    await testLocalServer();
    
    const success = generateSummary();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
runTests();
