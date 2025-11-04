/**
 * Helper script to update .env.local with correct Ollama paths
 * Removes old /files folder references and updates to /data folder
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const dataFolder = 'C:\\Users\\frost\\AppData\\Local\\Ollama\\data';

console.log('🔧 Updating .env.local with correct Ollama paths...\n');

let envContent = '';
let updated = false;

// Read existing .env.local if it exists
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const newLines = [];
  
  for (const line of lines) {
    let newLine = line;
    
    // Update OLLAMA_FILE_STORAGE
    if (line.includes('OLLAMA_FILE_STORAGE') && line.includes('files')) {
      newLine = `OLLAMA_FILE_STORAGE=${dataFolder}`;
      updated = true;
      console.log(`✅ Updated: ${line.trim()}`);
      console.log(`   → ${newLine}`);
    }
    // Update OLLAMA_INCOMING_PATH
    else if (line.includes('OLLAMA_INCOMING_PATH') && line.includes('files')) {
      newLine = `OLLAMA_INCOMING_PATH=${dataFolder}\\incoming`;
      updated = true;
      console.log(`✅ Updated: ${line.trim()}`);
      console.log(`   → ${newLine}`);
    }
    // Update OLLAMA_PROCESSED_PATH if it exists
    else if (line.includes('OLLAMA_PROCESSED_PATH') && line.includes('files')) {
      newLine = `OLLAMA_PROCESSED_PATH=${dataFolder}\\processed`;
      updated = true;
      console.log(`✅ Updated: ${line.trim()}`);
      console.log(`   → ${newLine}`);
    }
    // Update OLLAMA_LIBRARY_DIR if it exists
    else if (line.includes('OLLAMA_LIBRARY_DIR') && line.includes('files')) {
      newLine = `OLLAMA_LIBRARY_DIR=${dataFolder}\\library`;
      updated = true;
      console.log(`✅ Updated: ${line.trim()}`);
      console.log(`   → ${newLine}`);
    }
    // Update OLLAMA_ERROR_PATH if it exists
    else if (line.includes('OLLAMA_ERROR_PATH') && line.includes('files')) {
      newLine = `OLLAMA_ERROR_PATH=${dataFolder}\\errors`;
      updated = true;
      console.log(`✅ Updated: ${line.trim()}`);
      console.log(`   → ${newLine}`);
    }
    
    newLines.push(newLine);
  }
  
  envContent = newLines.join('\nὰ');
} else {
  // Create new .env.local with correct paths
  console.log('📝 Creating new .env.local file...');
  envContent = `# Ollama File Storage Configuration
# All paths should point to the /data folder, not /files

OLLAMA_FILE_STORAGE=${dataFolder}
OLLAMA_INCOMING_PATH=${dataFolder}\\incoming
OLLAMA_PROCESSED_PATH=${dataFolder}\\processed
OLLAMA_LIBRARY_DIR=${dataFolder}\\library
OLLAMA_ERROR_PATH=${dataFolder}\\errors

# Ollama Server URLs
OLLAMA_LOCAL_URL=http://127.0.0.1:5000
OLLAMA_URL=https://ollama.frostech.site

# For client-side components (browser)
NEXT_PUBLIC_OLLAMA_URL=http://127.0.0.1:5000

# Auto-processing on upload
AUTO_PROCESS_ON_UPLOAD=true
`;
  updated = true;
}

// Add recommended paths if they don't exist
if (!envContent.includes('OLLAMA_FILE_STORAGE')) {
  envContent += `\n# Ollama File Storage Configuration\nOLLAMA_FILE_STORAGE=${dataFolder}\n`;
  updated = true;
}

if (updated) {
  // Write back to file
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('\n✅ .env.local updated successfully!');
  console.log('\n📋 Current configuration:');
  console.log(`   OLLAMA_FILE_STORAGE=${dataFolder}`);
  console.log(`   OLLAMA_INCOMING_PATH=${dataFolder}\\incoming`);
  console.log('\n⚠️  Note: Restart file watcher and Ollama server for changes to take effect');
} else {
  console.log('✅ .env.local already has correct paths - no updates needed');
}

