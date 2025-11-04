#!/usr/bin/env node

/**
 * Production/Live Connection Tests for VOFC Engine
 * Tests only live/production services - no local dev servers
 */

// Load environment from project root .env
const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
} catch (_) {
  // dotenv optional; continue if unavailable
}

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
 * Test 1: Ollama Production Server
 */
async function testOllamaProduction() {
  logSection('Ollama Production Server');
  
  const ollamaUrl = process.env.OLLAMA_URL || 'https://ollama.frostech.site';
  const ollamaModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
  
  try {
    // Test 1: Server connectivity
    logInfo(`Testing Ollama server: ${ollamaUrl}`);
    const healthResponse = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      logSuccess('Ollama production server is running');
      logInfo(`Available models: ${healthData.models?.length || 0}`);
      recordResult(true);
      
      // Display available models
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
    
    // Test 2: Chat API endpoint
    logInfo('Testing Ollama chat API...');
    try {
      const chatResponse = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            { role: 'user', content: 'Hello' }
          ],
          stream: false,
          options: {
            num_ctx: 4096,
            num_predict: 100
          }
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        logSuccess('Chat API is working');
        if (chatData.message?.content) {
          logInfo(`Response preview: ${chatData.message.content.substring(0, 100)}...`);
        }
        recordResult(true);
      } else {
        const errorText = await chatResponse.text();
        logWarning(`Chat API returned: ${chatResponse.status} ${chatResponse.statusText}`);
        recordResult(false, true);
      }
    } catch (chatError) {
      if (chatError.name === 'TimeoutError') {
        logWarning('Chat API request timed out (may be normal if server is busy)');
      } else {
        logWarning(`Chat API test warning: ${chatError.message}`);
      }
      recordResult(false, true);
    }
    
  } catch (error) {
    logError(`Ollama connection failed: ${error.message}`);
    recordResult(false);
  }
}

/**
 * Test 2: Supabase Production Connection
 */
async function testSupabaseProduction() {
  logSection('Supabase Production Database');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    logError('NEXT_PUBLIC_SUPABASE_URL is not configured');
    recordResult(false);
    return;
  }
  
  if (!supabaseServiceKey && !supabaseAnonKey) {
    logError('No Supabase keys configured (need SERVICE_ROLE_KEY or ANON_KEY)');
    recordResult(false);
    return;
  }
  
  try {
    // Test 1: Basic connectivity
    logInfo(`Testing Supabase server: ${supabaseUrl}`);
    const apiKey = supabaseServiceKey || supabaseAnonKey;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.ok || response.status === 404) {
      // 404 is OK for root endpoint
      logSuccess('Supabase production server is reachable');
      recordResult(true);
    } else {
      logError(`Supabase server error: ${response.status} ${response.statusText}`);
      recordResult(false);
      return;
    }

    // Test 2: Database query (if service key available)
    if (supabaseServiceKey) {
      logInfo('Testing database query with service role key...');
      try {
        const dbResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=count&limit=1`, {
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
          logWarning(`Database query: ${dbResponse.status} ${dbResponse.statusText}`);
          recordResult(false, true);
        }
      } catch (dbError) {
        logWarning(`Database query error: ${dbError.message}`);
        recordResult(false, true);
      }
    } else {
      logWarning('Skipping database query test - service role key not available');
      recordResult(false, true);
    }

    // Test 3: Authentication endpoint
    logInfo('Testing authentication endpoint...');
    try {
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: {
          'apikey': supabaseAnonKey || supabaseServiceKey
        }
      });

      if (authResponse.ok) {
        logSuccess('Authentication endpoint accessible');
        recordResult(true);
      } else {
        logWarning(`Authentication endpoint: ${authResponse.status} ${authResponse.statusText}`);
        recordResult(false, true);
      }
    } catch (authError) {
      logWarning(`Authentication endpoint test: ${authError.message}`);
      recordResult(false, true);
    }

  } catch (error) {
    logError(`Supabase connection failed: ${error.message}`);
    recordResult(false);
  }
}

/**
 * Test 3: Environment Configuration
 */
function testEnvironmentConfig() {
  logSection('Production Environment Configuration');
  
  const requiredVars = [
    { 
      name: 'NEXT_PUBLIC_SUPABASE_URL', 
      value: process.env.NEXT_PUBLIC_SUPABASE_URL, 
      critical: true,
      display: 'Supabase URL'
    },
    { 
      name: 'SUPABASE_SERVICE_ROLE_KEY', 
      value: process.env.SUPABASE_SERVICE_ROLE_KEY, 
      critical: true,
      display: 'Supabase Service Key',
      partial: true // Show partial value
    },
    { 
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 
      critical: false,
      display: 'Supabase Anon Key',
      partial: true
    },
    { 
      name: 'OLLAMA_URL', 
      value: process.env.OLLAMA_URL, 
      critical: false,
      display: 'Ollama URL'
    },
    { 
      name: 'JWT_SECRET', 
      value: process.env.JWT_SECRET, 
      critical: true,
      display: 'JWT Secret',
      partial: true
    }
  ];

  for (const envVar of requiredVars) {
    if (envVar.value) {
      let displayValue = envVar.value;
      if (envVar.partial && envVar.value.length > 20) {
        displayValue = envVar.value.substring(0, 10) + '...' + envVar.value.substring(envVar.value.length - 10);
      }
      logSuccess(`${envVar.display}: Configured`);
      log(`   ${envVar.name}: ${displayValue}`, 'blue');
      recordResult(true);
    } else {
      if (envVar.critical) {
        logError(`${envVar.display}: Missing (CRITICAL)`);
        recordResult(false);
      } else {
        logWarning(`${envVar.display}: Missing (Optional)`);
        recordResult(false, true);
      }
    }
  }
}

/**
 * Test 4: Production API Endpoints (if deployed)
 */
async function testProductionAPIs() {
  logSection('Production API Endpoints');
  
  const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  
  if (!productionUrl || productionUrl.includes('localhost')) {
    logWarning('No production URL configured - skipping API endpoint tests');
    logInfo('Set NEXT_PUBLIC_SITE_URL or VERCEL_URL to test production APIs');
    recordResult(false, true);
    return;
  }
  
  const apiBase = `https://${productionUrl}`;
  logInfo(`Testing production APIs at: ${apiBase}`);
  
  const endpoints = [
    { path: '/api/test-status', method: 'GET', description: 'System status' },
    { path: '/api/auth/verify', method: 'GET', description: 'Auth verification' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${apiBase}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        logSuccess(`${endpoint.description}: OK`);
        recordResult(true);
      } else {
        logWarning(`${endpoint.description}: ${response.status}`);
        recordResult(false, true);
      }
      
    } catch (error) {
      logWarning(`${endpoint.description}: ${error.message}`);
      recordResult(false, true);
    }
  }
}

/**
 * Generate Summary Report
 */
function generateSummary() {
  logSection('Test Results Summary');
  
  log(`📊 Results: ${results.passed} passed, ${results.failed} failed, ${results.warnings} warnings`);
  
  if (results.failed === 0) {
    log('\n🎉 All critical production tests passed!', 'green');
    log('✅ Production services are ready', 'green');
  } else {
    log('\n🚨 Some critical tests failed:', 'red');
    log('   - Check environment variables', 'yellow');
    log('   - Verify service configurations', 'yellow');
    log('   - Review error messages above', 'yellow');
  }
  
  if (results.warnings > 0) {
    log('\n⚠️  Warnings:', 'yellow');
    log('   - Non-critical issues detected', 'yellow');
    log('   - System may function but with limitations', 'yellow');
  }
  
  return results.failed === 0;
}

/**
 * Main test runner
 */
async function runTests() {
  log('🚀 VOFC Engine Production Connection Tests', 'bright');
  log('Testing LIVE/PRODUCTION services only', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  try {
    testEnvironmentConfig();
    await testOllamaProduction();
    await testSupabaseProduction();
    await testProductionAPIs();
    
    const success = generateSummary();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
runTests();
