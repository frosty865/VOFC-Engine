#!/usr/bin/env node

/**
 * Remote Ollama Server Discovery Script
 * 
 * This script helps find and test Ollama servers on your local network
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Remote Ollama Server Discovery');
console.log('==================================\n');

// Get local network info
function getLocalNetwork() {
  try {
    const output = execSync('ipconfig', { encoding: 'utf8' });
    const lines = output.split('\n');
    let networkInfo = {};
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('IPv4 Address')) {
        const ipMatch = lines[i].match(/(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) {
          const ip = ipMatch[1];
          const parts = ip.split('.');
          networkInfo.baseIP = `${parts[0]}.${parts[1]}.${parts[2]}`;
          networkInfo.localIP = ip;
          break;
        }
      }
    }
    
    return networkInfo;
  } catch (error) {
    console.log('❌ Error getting network info');
    return null;
  }
}

// Test connection to a specific IP
function testOllamaConnection(ip) {
  try {
    const result = execSync(`curl -s --connect-timeout 3 http://${ip}:11434/api/tags`, { 
      encoding: 'utf8',
      timeout: 5000
    });
    return { success: true, response: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Scan network for Ollama servers
async function scanNetwork(baseIP) {
  console.log(`Scanning network ${baseIP}.0/24 for Ollama servers...\n`);
  
  const foundServers = [];
  
  // Test common IPs first
  const commonIPs = [
    `${baseIP}.1`,   // Router/Gateway
    `${baseIP}.2`,   // Common server IP
    `${baseIP}.10`,  // Common server IP
    `${baseIP}.100`, // Common server IP
    `${baseIP}.200`, // Common server IP
  ];
  
  console.log('Testing common IP addresses...');
  for (const ip of commonIPs) {
    process.stdout.write(`Testing ${ip}... `);
    const result = testOllamaConnection(ip);
    if (result.success) {
      console.log('✅ Found Ollama server!');
      foundServers.push(ip);
    } else {
      console.log('❌');
    }
  }
  
  // If no servers found in common IPs, scan more
  if (foundServers.length === 0) {
    console.log('\nScanning additional IP addresses...');
    for (let i = 3; i <= 254; i++) {
      if (commonIPs.includes(`${baseIP}.${i}`)) continue;
      
      process.stdout.write(`Testing ${baseIP}.${i}... `);
      const result = testOllamaConnection(`${baseIP}.${i}`);
      if (result.success) {
        console.log('✅ Found Ollama server!');
        foundServers.push(`${baseIP}.${i}`);
      } else {
        console.log('❌');
      }
      
      // Limit scan to avoid overwhelming the network
      if (i > 50) break;
    }
  }
  
  return foundServers;
}

// Test a specific IP
function testSpecificIP(ip) {
  console.log(`Testing specific IP: ${ip}`);
  const result = testOllamaConnection(ip);
  
  if (result.success) {
    console.log('✅ Ollama server found and accessible!');
    console.log('Available models:');
    try {
      const models = JSON.parse(result.response);
      if (models.models) {
        models.models.forEach(model => {
          console.log(`  - ${model.name}`);
        });
      }
    } catch (e) {
      console.log('  (Could not parse model list)');
    }
    return true;
  } else {
    console.log('❌ Ollama server not accessible');
    console.log(`Error: ${result.error}`);
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Test specific IP
    const ip = args[0];
    testSpecificIP(ip);
    return;
  }
  
  // Get network info
  const networkInfo = getLocalNetwork();
  if (!networkInfo) {
    console.log('❌ Could not determine local network');
    process.exit(1);
  }
  
  console.log(`Local IP: ${networkInfo.localIP}`);
  console.log(`Network: ${networkInfo.baseIP}.0/24\n`);
  
  // Scan for Ollama servers
  const foundServers = await scanNetwork(networkInfo.baseIP);
  
  if (foundServers.length > 0) {
    console.log(`\n🎉 Found ${foundServers.length} Ollama server(s):`);
    foundServers.forEach(ip => {
      console.log(`  - http://${ip}:11434`);
    });
    
    console.log('\n📝 To use a remote Ollama server:');
    console.log('1. Copy the environment file:');
    console.log('   cp vofc-viewer/apps/backend/env.example vofc-viewer/apps/backend/.env');
    console.log('\n2. Edit the .env file and update OLLAMA_BASE:');
    console.log(`   OLLAMA_BASE=http://${foundServers[0]}:11434`);
    console.log('\n3. Start the backend server:');
    console.log('   npm run ai-backend');
  } else {
    console.log('\n❌ No Ollama servers found on the network');
    console.log('\nMake sure:');
    console.log('1. Ollama is installed and running on another machine');
    console.log('2. Ollama is started with: ollama serve --host 0.0.0.0:11434');
    console.log('3. The remote machine\'s firewall allows port 11434');
    console.log('4. Both machines are on the same network');
  }
}

// Run the script
main().catch(console.error);
