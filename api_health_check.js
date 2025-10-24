const https = require('https');
const http = require('http');

// Base URL for the application
const BASE_URL = 'https://vofc-viewer-m80l5kf1b-matthew-frosts-projects-2f4ab76f.vercel.app';

// List of all API endpoints to test
const API_ENDPOINTS = [
  // Health and System
  { path: '/api/health', method: 'GET', description: 'Health check endpoint' },
  { path: '/api/metrics', method: 'GET', description: 'System metrics' },
  
  // Authentication
  { path: '/api/auth/login', method: 'POST', description: 'User login', requiresBody: true },
  { path: '/api/auth/logout', method: 'POST', description: 'User logout' },
  { path: '/api/auth/verify', method: 'GET', description: 'Verify authentication' },
  { path: '/api/auth/validate', method: 'GET', description: 'Validate session' },
  { path: '/api/auth/permissions', method: 'GET', description: 'Get user permissions' },
  
  // Documents
  { path: '/api/documents/list', method: 'GET', description: 'List documents' },
  { path: '/api/documents/status', method: 'GET', description: 'Document status' },
  { path: '/api/documents/status-all', method: 'GET', description: 'All document statuses' },
  { path: '/api/documents/completed', method: 'GET', description: 'Completed documents' },
  { path: '/api/documents/failed', method: 'GET', description: 'Failed documents' },
  { path: '/api/documents/submit', method: 'POST', description: 'Submit document', requiresBody: true },
  { path: '/api/documents/process', method: 'POST', description: 'Process document', requiresBody: true },
  { path: '/api/documents/process-all', method: 'POST', description: 'Process all documents' },
  { path: '/api/documents/process-batch', method: 'POST', description: 'Process batch', requiresBody: true },
  { path: '/api/documents/preview', method: 'POST', description: 'Preview document', requiresBody: true },
  { path: '/api/documents/parse-metadata', method: 'POST', description: 'Parse metadata', requiresBody: true },
  
  // Disciplines
  { path: '/api/disciplines', method: 'GET', description: 'Get disciplines' },
  
  // Submissions
  { path: '/api/submissions', method: 'GET', description: 'Get submissions' },
  { path: '/api/submissions', method: 'POST', description: 'Create submission', requiresBody: true },
  { path: '/api/submissions/bulk', method: 'POST', description: 'Bulk submissions', requiresBody: true },
  { path: '/api/submissions/structured', method: 'POST', description: 'Structured submissions', requiresBody: true },
  { path: '/api/submissions/ofc-request', method: 'POST', description: 'OFC request', requiresBody: true },
  
  // Admin
  { path: '/api/admin/users', method: 'GET', description: 'Admin users' },
  { path: '/api/admin/submissions', method: 'GET', description: 'Admin submissions' },
  { path: '/api/admin/ofc-requests', method: 'GET', description: 'Admin OFC requests' },
  { path: '/api/admin/ofcs', method: 'GET', description: 'Admin OFCs' },
  { path: '/api/admin/generate-ofcs', method: 'POST', description: 'Generate OFCs' },
  
  // AI Tools
  { path: '/api/ai-tools/test-connection', method: 'GET', description: 'AI tools connection test' },
  { path: '/api/ai-tools/analyze-vulnerability', method: 'POST', description: 'Analyze vulnerability', requiresBody: true },
  { path: '/api/ai-tools/generate-ofcs', method: 'POST', description: 'Generate OFCs', requiresBody: true },
  
  // Learning
  { path: '/api/learning/start', method: 'POST', description: 'Start learning system', requiresBody: true },
  
  // Monitor
  { path: '/api/monitor/system', method: 'GET', description: 'System monitoring' },
  { path: '/api/monitor/processing', method: 'GET', description: 'Processing monitoring' },
  { path: '/api/monitor/process-flow', method: 'GET', description: 'Process flow monitoring' },
  
  // Tools
  { path: '/api/tools/link-to-supabase', method: 'POST', description: 'Link to Supabase', requiresBody: true },
  { path: '/api/tools/normalize-data', method: 'POST', description: 'Normalize data', requiresBody: true },
  { path: '/api/tools/parse-pdf', method: 'POST', description: 'Parse PDF', requiresBody: true },
  { path: '/api/tools/run-analysis', method: 'POST', description: 'Run analysis', requiresBody: true },
  
  // Email
  { path: '/api/email/reject-notification', method: 'POST', description: 'Reject notification', requiresBody: true },
  
  // Sources
  { path: '/api/sources/assign-citation', method: 'POST', description: 'Assign citation', requiresBody: true }
];

// Test data for POST requests
const TEST_DATA = {
  login: { email: 'test@vofc.gov', password: 'testpass123' },
  signup: { email: 'newuser@vofc.gov', password: 'newpass123', action: 'signup' },
  document: { filename: 'test.pdf', content: 'test content' },
  submission: { title: 'Test Submission', content: 'Test content' },
  ofcRequest: { title: 'Test OFC Request', description: 'Test description' },
  learning: { action: 'start' }
};

// Function to make HTTP request
async function makeRequest(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  const options = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (endpoint.requiresBody) {
    // Add appropriate test data based on endpoint
    if (endpoint.path.includes('auth/login')) {
      options.body = JSON.stringify(TEST_DATA.login);
    } else if (endpoint.path.includes('auth/login') && endpoint.path.includes('signup')) {
      options.body = JSON.stringify(TEST_DATA.signup);
    } else if (endpoint.path.includes('documents')) {
      options.body = JSON.stringify(TEST_DATA.document);
    } else if (endpoint.path.includes('submissions')) {
      options.body = JSON.stringify(TEST_DATA.submission);
    } else if (endpoint.path.includes('ofc-request')) {
      options.body = JSON.stringify(TEST_DATA.ofcRequest);
    } else if (endpoint.path.includes('learning')) {
      options.body = JSON.stringify(TEST_DATA.learning);
    } else {
      options.body = JSON.stringify({ test: true });
    }
  }
  
  try {
    console.log(`\n🔍 Testing: ${endpoint.method} ${endpoint.path}`);
    console.log(`📝 Description: ${endpoint.description}`);
    
    const response = await fetch(url, options);
    
    const result = {
      endpoint: endpoint.path,
      method: endpoint.method,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    };
    
    // Try to get response text
    try {
      const responseText = await response.text();
      result.responseLength = responseText.length;
      result.hasContent = responseText.trim().length > 0;
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(responseText);
        result.isJson = true;
        result.jsonKeys = Object.keys(jsonData);
      } catch (jsonError) {
        result.isJson = false;
        result.jsonError = jsonError.message;
        result.responsePreview = responseText.substring(0, 200);
      }
    } catch (textError) {
      result.textError = textError.message;
    }
    
    return result;
    
  } catch (error) {
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      error: error.message,
      failed: true
    };
  }
}

// Main test function
async function runHealthCheck() {
  console.log('🏥 VOFC Engine API Health Check');
  console.log('================================');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📊 Total endpoints to test: ${API_ENDPOINTS.length}`);
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const endpoint of API_ENDPOINTS) {
    const result = await makeRequest(endpoint);
    results.push(result);
    
    if (result.failed) {
      errorCount++;
      console.log(`❌ FAILED: ${result.error}`);
    } else if (result.ok) {
      successCount++;
      console.log(`✅ SUCCESS: ${result.status} ${result.statusText}`);
      if (result.isJson) {
        console.log(`   📄 JSON keys: ${result.jsonKeys?.join(', ')}`);
      }
    } else {
      errorCount++;
      console.log(`⚠️  ERROR: ${result.status} ${result.statusText}`);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n📊 HEALTH CHECK SUMMARY');
  console.log('========================');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📊 Total: ${results.length}`);
  console.log(`📈 Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
  
  // Detailed error report
  const failedEndpoints = results.filter(r => !r.ok || r.failed);
  if (failedEndpoints.length > 0) {
    console.log('\n❌ FAILED ENDPOINTS:');
    console.log('====================');
    failedEndpoints.forEach(endpoint => {
      console.log(`• ${endpoint.method} ${endpoint.endpoint}`);
      if (endpoint.error) console.log(`  Error: ${endpoint.error}`);
      if (endpoint.status) console.log(`  Status: ${endpoint.status} ${endpoint.statusText}`);
    });
  }
  
  // JSON parsing issues
  const jsonIssues = results.filter(r => r.jsonError);
  if (jsonIssues.length > 0) {
    console.log('\n🔧 JSON PARSING ISSUES:');
    console.log('=======================');
    jsonIssues.forEach(endpoint => {
      console.log(`• ${endpoint.method} ${endpoint.endpoint}`);
      console.log(`  JSON Error: ${endpoint.jsonError}`);
      console.log(`  Response Preview: ${endpoint.responsePreview}`);
    });
  }
  
  return results;
}

// Run the health check
runHealthCheck().catch(console.error);
