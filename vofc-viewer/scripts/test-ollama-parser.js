#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🤖 Testing Ollama Parser Integration...');
console.log('=====================================\n');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testOllamaParser() {
  console.log('🧪 Testing Ollama parser directly...');
  
  // Create test content
  const testContent = `
Emergency Response Plan - Security Vulnerabilities

VULNERABILITIES IDENTIFIED:
1. Unsecured access points to critical infrastructure
2. Lack of backup communication systems during emergencies
3. Insufficient staff training on emergency procedures
4. No redundant power systems for critical operations

OPTIONS FOR CONSIDERATION:
1. Install biometric access controls at all entry points
2. Implement satellite communication backup systems
3. Conduct monthly emergency response training sessions
4. Install backup generators with automatic failover
5. Establish 24/7 security monitoring protocols
6. Create redundant data storage systems
`;

  const tempDir = path.join(process.cwd(), 'data', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const testFile = path.join(tempDir, 'test_ollama_parser.txt');
  fs.writeFileSync(testFile, testContent);
  
  console.log('📝 Created test file:', testFile);
  
  // Test Ollama parser
  const ollamaParserPath = path.join(process.cwd(), 'apps', 'backend', 'parsers', 'ollama_parser.py');
  
  if (!fs.existsSync(ollamaParserPath)) {
    console.error('❌ Ollama parser not found:', ollamaParserPath);
    return false;
  }
  
  console.log('🤖 Running Ollama parser...');
  
  return new Promise((resolve) => {
    const python = spawn('python', [ollamaParserPath, testFile, 'Test Document'], {
      cwd: path.dirname(ollamaParserPath)
    });
    
    let output = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    python.on('close', (code) => {
      console.log('📊 Parser output:');
      console.log(output);
      
      if (error) {
        console.log('⚠️ Parser errors:');
        console.log(error);
      }
      
      if (code === 0) {
        // Check for output file
        const outputFile = path.join(path.dirname(ollamaParserPath), 'parsed_ollama.json');
        if (fs.existsSync(outputFile)) {
          try {
            const result = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
            console.log('✅ Ollama parser completed successfully!');
            console.log('📊 Results:');
            console.log(`   Vulnerabilities: ${result.vulnerabilities?.length || 0}`);
            console.log(`   OFCs: ${result.options_for_consideration?.length || 0}`);
            console.log(`   Parser version: ${result.parser_version}`);
            resolve(true);
          } catch (parseError) {
            console.error('❌ Error parsing output file:', parseError);
            resolve(false);
          }
        } else {
          console.error('❌ Output file not found:', outputFile);
          resolve(false);
        }
      } else {
        console.error(`❌ Parser failed with code: ${code}`);
        resolve(false);
      }
      
      // Cleanup
      try {
        fs.unlinkSync(testFile);
        console.log('🧹 Cleaned up test file');
      } catch (cleanupError) {
        console.log('⚠️ Could not clean up test file:', cleanupError.message);
      }
    });
    
    python.on('error', (err) => {
      console.error('❌ Error running Ollama parser:', err);
      resolve(false);
    });
  });
}

async function checkOllamaServer() {
  console.log('🔍 Checking Ollama server status...');
  
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama server is running');
      console.log('📋 Available models:');
      data.models?.forEach(model => {
        console.log(`   - ${model.name} (${model.size})`);
      });
      return true;
    } else {
      console.log('❌ Ollama server not responding');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to Ollama server:', error.message);
    console.log('💡 Make sure Ollama is running: ollama serve');
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Ollama parser test...\n');
  
  // Check Ollama server
  const serverRunning = await checkOllamaServer();
  if (!serverRunning) {
    console.log('\n❌ Cannot proceed without Ollama server');
    return;
  }
  
  console.log('\n');
  
  // Test parser
  const parserWorking = await testOllamaParser();
  
  console.log('\n🎯 Test Results:');
  console.log('================');
  console.log(`Ollama Server: ${serverRunning ? '✅ Running' : '❌ Not running'}`);
  console.log(`Ollama Parser: ${parserWorking ? '✅ Working' : '❌ Failed'}`);
  
  if (serverRunning && parserWorking) {
    console.log('\n🎉 Ollama integration is working!');
    console.log('📝 Submissions will now use Ollama for intelligent parsing');
  } else {
    console.log('\n⚠️ Ollama integration needs attention');
    if (!serverRunning) {
      console.log('   - Start Ollama server: ollama serve');
    }
    if (!parserWorking) {
      console.log('   - Check Python dependencies and Ollama model');
    }
  }
}

main().catch(console.error);
