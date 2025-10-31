/**
 * File Watcher Service for Automatic Document Processing
 * 
 * Monitors C:\Users\frost\AppData\Local\Ollama\data\incoming folder
 * and automatically processes new documents as they appear.
 * 
 * Usage:
 *   node scripts-dev/file-watcher.js
 * 
 * Or run as a service:
 *   pm2 start scripts-dev/file-watcher.js --name file-watcher
 */

require('dotenv').config({ path: '.env.local' });
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;

// Configuration - HARDCODED to use /data folder, not /files
// Check if env var is set to old /files path and override it
let envBaseDir = process.env.OLLAMA_FILE_STORAGE;
let envIncomingDir = process.env.OLLAMA_INCOMING_PATH;

if (envBaseDir && (envBaseDir.includes('\\Ollama\\files') || envBaseDir.includes('/Ollama/files'))) {
  console.warn('⚠️  OLLAMA_FILE_STORAGE in .env.local points to /files folder');
  console.warn('   Overriding to use /data folder instead');
  envBaseDir = null; // Force use of default
}

if (envIncomingDir && (envIncomingDir.includes('\\Ollama\\files') || envIncomingDir.includes('/Ollama/files'))) {
  console.warn('⚠️  OLLAMA_INCOMING_PATH in .env.local points to /files folder');
  console.warn('   Overriding to use /data folder instead');
  envIncomingDir = null; // Force use of default
}

const BASE_DIR = envBaseDir || 'C:\\Users\\frost\\AppData\\Local\\Ollama\\data';
const INCOMING_DIR = envIncomingDir || path.join(BASE_DIR, 'incoming');

// Ensure we're using /data, not /files
if (INCOMING_DIR.includes('\\Ollama\\files') || INCOMING_DIR.includes('/Ollama/files')) {
  console.error('❌ ERROR: Path is pointing to /files folder!');
  console.error('   Please set OLLAMA_FILE_STORAGE or OLLAMA_INCOMING_PATH to use /data folder');
  process.exit(1);
}

// Log the actual path being used (for debugging)
console.log(`📁 Base directory: ${BASE_DIR}`);
console.log(`📁 Incoming directory: ${INCOMING_DIR}`);

// Use Ollama server directly, not Next.js
const OLLAMA_URL = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || 'https://ollama.frostech.site';
const OLLAMA_LOCAL_URL = process.env.OLLAMA_LOCAL_URL || 'http://127.0.0.1:5000';

// Try local first, fallback to remote
const PROCESSING_URL = OLLAMA_LOCAL_URL;
const PROCESS_ENDPOINT = `${PROCESSING_URL}/api/files/process`;

const FILE_DEBOUNCE_MS = 5000; // Wait 5 seconds after file appears before processing
const PROCESS_INTERVAL_MS = 30000; // Also check every 30 seconds for any missed files

// Track files being processed to avoid duplicates
const processingFiles = new Set();
const processedFiles = new Set();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

async function processPendingDocuments() {
  // Not needed when using Ollama directly - files are processed from folder
  return;
}

async function processFilesInFolder() {
  try {
    // Check if folder exists
    try {
      await fs.access(INCOMING_DIR);
    } catch {
      log(`⚠️  Incoming directory does not exist: ${INCOMING_DIR}`, 'yellow');
      log('💡 Creating directory...', 'cyan');
      await fs.mkdir(INCOMING_DIR, { recursive: true });
      return;
    }

    // List files in incoming folder
    const files = await fs.readdir(INCOMING_DIR);
    const validFiles = [];

    for (const file of files) {
      const filePath = path.join(INCOMING_DIR, file);
      
      try {
        const stats = await fs.stat(filePath);
        
        // Only process files (not directories) that haven't been processed
        if (stats.isFile() && !processedFiles.has(file)) {
          // Check if file is still being written (size changed in last 2 seconds)
          const now = Date.now();
          const mtime = stats.mtimeMs;
          
          // If file was modified more than 5 seconds ago, it's ready to process
          if (now - mtime > FILE_DEBOUNCE_MS) {
            validFiles.push(file);
          }
        }
      } catch (err) {
        log(`⚠️  Error checking file ${file}: ${err.message}`, 'yellow');
      }
    }

    if (validFiles.length > 0) {
      log(`📄 Found ${validFiles.length} file(s) ready for processing`, 'cyan');
      
      // Call Ollama server directly to process files
      try {
        log(`🔗 Calling Ollama processing API: ${PROCESS_ENDPOINT}`, 'cyan');
        const response = await fetch(PROCESS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(60000) // 60 second timeout
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            log(`✅ Processed ${result.processed || 0} file(s) successfully`, 'green');
            if (result.errors > 0) {
              log(`⚠️ ${result.errors} file(s) had errors`, 'yellow');
            }
            // Mark files as processed
            validFiles.forEach(file => processedFiles.add(file));
          } else {
            log(`❌ Processing failed: ${result.error || result.message || 'Unknown error'}`, 'red');
          }
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          log(`❌ Processing endpoint returned ${response.status}: ${errorText}`, 'red');
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          log(`❌ Processing request timed out after 60 seconds`, 'red');
        } else if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
          log(`❌ Cannot connect to Ollama server at ${PROCESS_ENDPOINT}`, 'red');
          log(`   Make sure your Ollama server is running!`, 'yellow');
          log(`   Expected URL: ${PROCESSING_URL}`, 'yellow');
          log(`   Try running: python ollama/server.py (in vofc-viewer directory)`, 'yellow');
        } else {
          log(`❌ Error processing files: ${error.message}`, 'red');
          log(`   Endpoint: ${PROCESS_ENDPOINT}`, 'yellow');
          if (error.code) {
            log(`   Error code: ${error.code}`, 'yellow');
          }
        }
      }
    }
  } catch (error) {
    log(`❌ Error checking incoming folder: ${error.message}`, 'red');
  }
}

// Main file watcher
function startWatcher() {
  log(`🚀 Starting file watcher service`, 'bright');
  log(`📁 Monitoring: ${INCOMING_DIR}`, 'cyan');
  log(`🔗 Ollama Server: ${PROCESSING_URL}`, 'cyan');
  log(`🔗 Processing API: ${PROCESS_ENDPOINT}`, 'cyan');

  // Ensure directory exists
  fs.mkdir(INCOMING_DIR, { recursive: true }).catch(err => {
    log(`⚠️  Could not create directory: ${err.message}`, 'yellow');
  });

  // Watch for file changes
  const watcher = chokidar.watch(INCOMING_DIR, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // Don't process existing files on startup
    awaitWriteFinish: {
      stabilityThreshold: FILE_DEBOUNCE_MS,
      pollInterval: 1000
    }
  });

  // Handle file additions
  watcher.on('add', async (filePath) => {
    const fileName = path.basename(filePath);
    
    if (processingFiles.has(fileName)) {
      return; // Already processing
    }

    log(`📄 New file detected: ${fileName}`, 'green');
    processingFiles.add(fileName);

    // Wait a bit more to ensure file is fully written
    setTimeout(async () => {
      try {
        // First try to process via pending submissions (if file is linked to a submission)
        await processPendingDocuments();
        
        // Also try direct file processing (for files not linked to submissions)
        await processFilesInFolder();
      } catch (error) {
        log(`❌ Error processing ${fileName}: ${error.message}`, 'red');
      } finally {
        processingFiles.delete(fileName);
      }
    }, FILE_DEBOUNCE_MS);
  });

  watcher.on('error', (error) => {
    log(`❌ File watcher error: ${error.message}`, 'red');
  });

  watcher.on('ready', () => {
    log(`✅ File watcher ready and monitoring`, 'green');
    
    // Also process any existing files
    processFilesInFolder();
    
    // Set up periodic processing check (in case files are added when watcher misses them)
    setInterval(async () => {
      await processFilesInFolder();
    }, PROCESS_INTERVAL_MS);
    
    log(`⏰ Periodic checks every ${PROCESS_INTERVAL_MS / 1000} seconds`, 'cyan');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    log('🛑 Shutting down file watcher...', 'yellow');
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('🛑 Shutting down file watcher...', 'yellow');
    watcher.close();
    process.exit(0);
  });

  return watcher;
}

// Start the watcher
if (require.main === module) {
  startWatcher();
}

module.exports = { startWatcher };

