#!/usr/bin/env node
/**
 * Display Cloudflare Tunnel configuration for Flask and Ollama
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 Cloudflare Tunnel Configuration\n');
console.log('='.repeat(60));

// Tunnel URLs
console.log('\n📡 Tunnel URLs:');
console.log('  Flask:  https://flask.frostech.site');
console.log('  Ollama: https://ollama.frostech.site');

// Local ports
console.log('\n🔌 Local Ports:');
console.log('  Flask:  http://localhost:5000');
console.log('  Ollama: http://localhost:11434');

// Check for Cloudflare config directory
const cloudflareConfigDir = path.join(os.homedir(), '.cloudflared');
console.log('\n📁 Cloudflare Config Directory:');
console.log(`  ${cloudflareConfigDir}`);

if (fs.existsSync(cloudflareConfigDir)) {
  const files = fs.readdirSync(cloudflareConfigDir);
  console.log(`  ✅ Found ${files.length} file(s):`);
  files.forEach(file => {
    const filePath = path.join(cloudflareConfigDir, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      console.log(`     - ${file} (${stats.size} bytes)`);
      
      // Try to read config.json if it exists
      if (file === 'config.yaml' || file.endsWith('.yaml')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          console.log(`\n     Content preview:`);
          console.log(content.split('\n').slice(0, 20).map(l => `     ${l}`).join('\n'));
          if (content.split('\n').length > 20) {
            console.log(`     ... (${content.split('\n').length - 20} more lines)`);
          }
        } catch (err) {
          console.log(`     ⚠️  Could not read: ${err.message}`);
        }
      }
    }
  });
} else {
  console.log('  ❌ Directory not found');
}

// Environment variables that might be set
console.log('\n🌍 Environment Variables:');
const envVars = [
  'NEXT_PUBLIC_FLASK_API_URL',
  'NEXT_PUBLIC_FLASK_URL',
  'FLASK_URL',
  'NEXT_PUBLIC_OLLAMA_URL',
  'OLLAMA_URL',
  'OLLAMA_API_BASE_URL',
  'OLLAMA_BASE_URL',
  'NEXT_PUBLIC_OLLAMA_SERVER_URL',
  'OLLAMA_SERVER_URL',
  'OLLAMA_LOCAL_URL',
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName} = ${value}`);
  } else {
    console.log(`  ⚪ ${varName} = (not set)`);
  }
});

// Check tunnel service
console.log('\n🔧 Tunnel Service Status:');
try {
  const { execSync } = require('child_process');
  try {
    const cloudflared = execSync('where cloudflared', { encoding: 'utf8', stdio: 'pipe' }).trim();
    console.log(`  ✅ Cloudflared found: ${cloudflared}`);
    
    // Try to get tunnel list
    try {
      const tunnelList = execSync('cloudflared tunnel list', { encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
      console.log('\n  Active tunnels:');
      console.log(tunnelList.split('\n').map(l => `     ${l}`).join('\n'));
    } catch (err) {
      console.log('  ⚠️  Could not list tunnels (may need authentication)');
    }
  } catch (err) {
    console.log('  ❌ Cloudflared not found in PATH');
  }
} catch (err) {
  console.log('  ⚠️  Could not check cloudflared status');
}

// Tunnel configuration from code
console.log('\n📝 Code Configuration (from server-utils.js):');
console.log('  Flask URL Detection Priority:');
console.log('    1. NEXT_PUBLIC_FLASK_API_URL');
console.log('    2. NEXT_PUBLIC_FLASK_URL');
console.log('    3. FLASK_URL');
console.log('    4. NEXT_PUBLIC_OLLAMA_SERVER_URL');
console.log('    5. OLLAMA_SERVER_URL');
console.log('    6. OLLAMA_LOCAL_URL');
console.log('    7. Production default: https://flask.frostech.site');
console.log('    8. Development default: http://localhost:5000');

console.log('\n  Ollama URL Detection Priority:');
console.log('    1. NEXT_PUBLIC_OLLAMA_URL');
console.log('    2. OLLAMA_URL');
console.log('    3. OLLAMA_API_BASE_URL');
console.log('    4. OLLAMA_BASE_URL');
console.log('    5. Production default: https://ollama.frostech.site');
console.log('    6. Development default: http://localhost:11434');

console.log('\n' + '='.repeat(60));
console.log('\n💡 To test tunnel connectivity:');
console.log('   curl https://flask.frostech.site/api/health');
console.log('   curl https://ollama.frostech.site/api/tags');

