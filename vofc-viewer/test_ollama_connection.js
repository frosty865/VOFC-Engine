#!/usr/bin/env node

/**
 * Test Ollama Server Connection
 * Checks if Ollama server is running and accessible
 */

const https = require('https');
const http = require('http');

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'vofc-engine:latest';

console.log('🔍 Testing Ollama Server Connection...');
console.log(`📍 Base URL: ${OLLAMA_BASE_URL}`);
console.log(`🤖 Model: ${OLLAMA_MODEL}`);
console.log('');

async function testOllamaConnection() {
  try {
    // Test 1: Check if Ollama server is running
    console.log('1️⃣ Testing basic connectivity...');
    const healthResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    
    if (!healthResponse.ok) {
      throw new Error(`HTTP ${healthResponse.status}: ${healthResponse.statusText}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Ollama server is running');
    console.log(`📊 Available models: ${healthData.models?.length || 0}`);
    
    if (healthData.models && healthData.models.length > 0) {
      console.log('📋 Models found:');
      healthData.models.forEach(model => {
        console.log(`   - ${model.name} (${model.size ? Math.round(model.size / 1024 / 1024) + 'MB' : 'unknown size'})`);
      });
    }
    
    // Test 2: Check if our specific model is available
    console.log('');
    console.log('2️⃣ Checking for target model...');
    const targetModel = healthData.models?.find(m => m.name === OLLAMA_MODEL);
    
    if (targetModel) {
      console.log(`✅ Target model '${OLLAMA_MODEL}' is available`);
    } else {
      console.log(`⚠️  Target model '${OLLAMA_MODEL}' not found`);
      console.log('💡 Available models:');
      healthData.models?.forEach(model => {
        console.log(`   - ${model.name}`);
      });
    }
    
    // Test 3: Test a simple chat request
    console.log('');
    console.log('3️⃣ Testing chat API...');
    const chatResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'user', content: 'Hello, are you working?' }
        ],
        stream: false
      })
    });
    
    if (!chatResponse.ok) {
      throw new Error(`Chat API failed: ${chatResponse.status} ${chatResponse.statusText}`);
    }
    
    const chatData = await chatResponse.json();
    console.log('✅ Chat API is working');
    console.log(`🤖 Response: ${chatData.message?.content || 'No content received'}`);
    
    console.log('');
    console.log('🎉 Ollama server connection test PASSED!');
    console.log('✅ Server is running and accessible');
    console.log('✅ Chat API is functional');
    
    return true;
    
  } catch (error) {
    console.log('');
    console.log('❌ Ollama server connection test FAILED!');
    console.log(`🚨 Error: ${error.message}`);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Make sure Ollama is installed and running');
    console.log('2. Check if Ollama server is accessible at:', OLLAMA_BASE_URL);
    console.log('3. Verify the model exists: ollama list');
    console.log('4. Try pulling the model: ollama pull vofc-engine:latest');
    console.log('5. Check environment variables:');
    console.log('   - OLLAMA_API_BASE_URL or OLLAMA_BASE_URL');
    console.log('   - OLLAMA_MODEL');
    
    return false;
  }
}

// Run the test
testOllamaConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test script error:', error);
    process.exit(1);
  });
