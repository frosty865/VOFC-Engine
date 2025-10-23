#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🤖 Testing Ollama Pipeline Integration...');
console.log('=========================================\n');

async function testOllamaPipeline() {
  console.log('🧪 Testing Ollama pipeline directly...');
  
  // Create test content
  const testContent = `
Emergency Response Plan - Security Assessment

CRITICAL VULNERABILITIES IDENTIFIED:
1. Unsecured access points to critical infrastructure facilities
2. Lack of backup communication systems during emergency situations
3. Insufficient staff training on emergency response procedures
4. No redundant power systems for critical operations
5. Weak perimeter security controls
6. Inadequate data backup and recovery systems

RECOMMENDED OPTIONS FOR CONSIDERATION:
1. Install biometric access controls at all critical entry points
2. Implement satellite communication backup systems for emergency use
3. Conduct monthly emergency response training sessions for all staff
4. Install backup generators with automatic failover capabilities
5. Establish 24/7 security monitoring protocols with CCTV systems
6. Create redundant data storage systems with off-site backup
7. Implement multi-factor authentication for all critical systems
8. Develop comprehensive incident response procedures
9. Establish regular security audits and vulnerability assessments
10. Create emergency communication protocols for all stakeholders
`;

  const tempDir = path.join(process.cwd(), 'data', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const testFile = path.join(tempDir, 'test_ollama_pipeline.txt');
  fs.writeFileSync(testFile, testContent);
  
  console.log('📝 Created test file:', testFile);
  
  // Test Ollama pipeline
  const ollamaPipelinePath = path.join(process.cwd(), 'apps', 'backend', 'pipeline', 'ollama_pipeline.py');
  
  if (!fs.existsSync(ollamaPipelinePath)) {
    console.error('❌ Ollama pipeline not found:', ollamaPipelinePath);
    return false;
  }
  
  console.log('🤖 Running Ollama pipeline...');
  
  return new Promise((resolve) => {
    const python = spawn('python', [ollamaPipelinePath, testFile, 'Test Security Document'], {
      cwd: path.dirname(ollamaPipelinePath)
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
      console.log('📊 Pipeline output:');
      console.log(output);
      
      if (error) {
        console.log('⚠️ Pipeline errors:');
        console.log(error);
      }
      
      if (code === 0) {
        // Check for output file
        const outputFile = path.join(path.dirname(ollamaPipelinePath), 'parsed_ollama_pipeline.json');
        if (fs.existsSync(outputFile)) {
          try {
            const result = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
            console.log('✅ Ollama pipeline completed successfully!');
            console.log('📊 Results:');
            console.log(`   Vulnerabilities: ${result.vulnerabilities?.length || 0}`);
            console.log(`   OFCs: ${result.options_for_consideration?.length || 0}`);
            console.log(`   Pipeline version: ${result.parser_version}`);
            console.log(`   Extraction method: ${result.extraction_stats?.extraction_method}`);
            
            // Show sample results
            if (result.vulnerabilities && result.vulnerabilities.length > 0) {
              console.log('\n🔍 Sample Vulnerabilities:');
              result.vulnerabilities.slice(0, 2).forEach((vuln, i) => {
                console.log(`   ${i + 1}. ${vuln.text.substring(0, 100)}... (confidence: ${vuln.confidence})`);
              });
            }
            
            if (result.options_for_consideration && result.options_for_consideration.length > 0) {
              console.log('\n💡 Sample OFCs:');
              result.options_for_consideration.slice(0, 2).forEach((ofc, i) => {
                console.log(`   ${i + 1}. ${ofc.text.substring(0, 100)}... (confidence: ${ofc.confidence})`);
              });
            }
            
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
        console.error(`❌ Pipeline failed with code: ${code}`);
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
      console.error('❌ Error running Ollama pipeline:', err);
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
  console.log('🚀 Starting Ollama pipeline test...\n');
  
  // Check Ollama server
  const serverRunning = await checkOllamaServer();
  if (!serverRunning) {
    console.log('\n❌ Cannot proceed without Ollama server');
    return;
  }
  
  console.log('\n');
  
  // Test pipeline
  const pipelineWorking = await testOllamaPipeline();
  
  console.log('\n🎯 Test Results:');
  console.log('================');
  console.log(`Ollama Server: ${serverRunning ? '✅ Running' : '❌ Not running'}`);
  console.log(`Ollama Pipeline: ${pipelineWorking ? '✅ Working' : '❌ Failed'}`);
  
  if (serverRunning && pipelineWorking) {
    console.log('\n🎉 Ollama pipeline integration is working!');
    console.log('📝 Submissions will now use Ollama + Heuristic analysis');
    console.log('🔧 Production-ready pipeline with structured output');
  } else {
    console.log('\n⚠️ Ollama pipeline integration needs attention');
    if (!serverRunning) {
      console.log('   - Start Ollama server: ollama serve');
    }
    if (!pipelineWorking) {
      console.log('   - Check Python dependencies and Ollama model');
      console.log('   - Verify pipeline script exists and is executable');
    }
  }
}

main().catch(console.error);
