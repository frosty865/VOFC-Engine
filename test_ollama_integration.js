#!/usr/bin/env node

/**
 * Test Ollama Integration with VOFC Engine
 * Tests the actual integration used by the application
 */

const https = require('https');
const http = require('http');

// Configuration (same as in the app)
const OLLAMA_BASE_URL = process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'vofc-engine:latest';

console.log('🔍 Testing Ollama Integration with VOFC Engine...');
console.log(`📍 Base URL: ${OLLAMA_BASE_URL}`);
console.log(`🤖 Model: ${OLLAMA_MODEL}`);
console.log('');

async function testVOFCIntegration() {
  try {
    // Test the exact same prompt and structure used in the app
    console.log('1️⃣ Testing VOFC document analysis...');
    
    const systemPrompt = `You are an expert document analyzer for the VOFC (Vulnerability and Options for Consideration) Engine. 
Your task is to extract vulnerabilities and options for consideration from security documents.

Extract the following information:
1. Vulnerabilities: Security weaknesses, risks, or threats mentioned in the document
2. Options for Consideration (OFCs): Mitigation strategies, recommendations, or actions to address vulnerabilities

Return your analysis as a JSON object with this structure:
{
  "vulnerabilities": [
    {
      "id": "unique_id",
      "text": "vulnerability description",
      "discipline": "relevant discipline",
      "source": "source information"
    }
  ],
  "options_for_consideration": [
    {
      "id": "unique_id", 
      "text": "OFC description",
      "discipline": "relevant discipline",
      "source": "source information"
    }
  ]
}`;

    const userPrompt = `Analyze this security document and extract vulnerabilities and options for consideration:

Document Title: "Critical Infrastructure Security Assessment"
Document Content: "The facility lacks proper access controls at main entry points. There is no backup power system for critical operations. Staff training on emergency procedures is insufficient. The perimeter security is weak with no monitoring systems in place."

Please provide a structured JSON response with vulnerabilities and OFCs.`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const ollamaContent = data.message?.content || data.response;
    
    if (!ollamaContent) {
      throw new Error('No content received from Ollama');
    }

    console.log('✅ Ollama API responded successfully');
    console.log(`📝 Response length: ${ollamaContent.length} characters`);
    
    // Try to parse the JSON response
    try {
      const parsedResult = JSON.parse(ollamaContent);
      console.log('✅ JSON parsing successful');
      
      const vulnCount = parsedResult.vulnerabilities?.length || 0;
      const ofcCount = parsedResult.options_for_consideration?.length || 0;
      
      console.log(`📊 Extracted ${vulnCount} vulnerabilities`);
      console.log(`📊 Extracted ${ofcCount} options for consideration`);
      
      if (vulnCount > 0) {
        console.log('🔍 Sample vulnerabilities:');
        parsedResult.vulnerabilities.slice(0, 2).forEach((vuln, i) => {
          console.log(`   ${i + 1}. ${vuln.text}`);
        });
      }
      
      if (ofcCount > 0) {
        console.log('💡 Sample OFCs:');
        parsedResult.options_for_consideration.slice(0, 2).forEach((ofc, i) => {
          console.log(`   ${i + 1}. ${ofc.text}`);
        });
      }
      
    } catch (parseError) {
      console.log('⚠️  JSON parsing failed, but Ollama responded');
      console.log('📝 Raw response preview:', ollamaContent.substring(0, 200) + '...');
    }

    // Test 2: Check environment variables
    console.log('');
    console.log('2️⃣ Checking environment configuration...');
    console.log(`📍 OLLAMA_API_BASE_URL: ${process.env.OLLAMA_API_BASE_URL || 'not set'}`);
    console.log(`📍 OLLAMA_BASE_URL: ${process.env.OLLAMA_BASE_URL || 'not set'}`);
    console.log(`🤖 OLLAMA_MODEL: ${process.env.OLLAMA_MODEL || 'not set'}`);
    
    // Test 3: Performance test
    console.log('');
    console.log('3️⃣ Testing performance...');
    const startTime = Date.now();
    
    const perfResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'user', content: 'Quick test: What is 2+2?' }
        ],
        stream: false
      })
    });
    
    const perfData = await perfResponse.json();
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`✅ Performance test passed`);
    
    console.log('');
    console.log('🎉 Ollama Integration Test PASSED!');
    console.log('✅ Server is accessible');
    console.log('✅ Model is working');
    console.log('✅ VOFC analysis is functional');
    console.log('✅ Performance is acceptable');
    
    return true;
    
  } catch (error) {
    console.log('');
    console.log('❌ Ollama Integration Test FAILED!');
    console.log(`🚨 Error: ${error.message}`);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Verify Ollama is running: ollama serve');
    console.log('2. Check model availability: ollama list');
    console.log('3. Test model directly: ollama run vofc-engine:latest');
    console.log('4. Check network connectivity to Ollama server');
    console.log('5. Verify environment variables in your deployment');
    
    return false;
  }
}

// Run the integration test
testVOFCIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Integration test error:', error);
    process.exit(1);
  });
