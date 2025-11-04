/**
 * Quick diagnostic script to check what paths the file watcher will use
 */

require('dotenv').config({ path: '.env.local' });

const path = require('path');

console.log('🔍 File Watcher Path Diagnostics\n');
console.log('Environment Variables:');
console.log(`  OLLAMA_FILE_STORAGE: ${process.env.OLLAMA_FILE_STORAGE || '(not set)'}`);
console.log(`  OLLAMA_INCOMING_PATH: ${process.env.OLLAMA_INCOMING_PATH || '(not set)'}`);
console.log(`  OLLAMA_PROCESSED_PATH: ${process.env.OLLAMA_PROCESSED_PATH || '(not set)'}\n`);

const BASE_DIR = process.env.OLLAMA_FILE_STORAGE || 'C:\\Users\\frost\\AppData\\Local\\Ollama\\data';
const INCOMING_DIR = process.env.OLLAMA_INCOMING_PATH || path.join(BASE_DIR, 'incoming');

console.log('Calculated Paths:');
console.log(`  Base Directory: ${BASE_DIR}`);
console.log(`  Incoming Directory: ${INCOMING_DIR}\n`);

if (INCOMING_DIR.includes('files')) {
  console.log('❌ WARNING: Path contains "/files" folder!');
  console.log('   The watcher should use "/data" folder instead.\n');
  console.log('To fix, set in .env.local:');
  console.log('  OLLAMA_FILE_STORAGE=C:\\Users\\frost\\AppData\\Local\\Ollama\\data');
  console.log('  OLLAMA_INCOMING_PATH=C:\\Users\\frost\\AppData\\Local\\Ollama\\data\\incoming');
} else {
  console.log('✅ Path looks correct - using /data folder');
}

