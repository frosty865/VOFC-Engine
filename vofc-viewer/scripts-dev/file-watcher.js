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

// Configuration
const INCOMING_DIR = process.env.OLLAMA_INCOMING_PATH || 
  path.join(process.env.OLLAMA_FILE_STORAGE || 'C:/Users/frost/AppData/Local/Ollama/data', 'incoming');

const PROCESSING_URL = process.env.PROCESSING_API_URL || 
  process.env.NEXT_PUBLIC_APP_URL || 
  'http://localhost:3000';

const PROCESS_ENDPOINT = `${PROCESSING_URL}/api/documents/process-pending`;
const PROCESS_SIMPLE_ENDPOINT = `${PROCESSING_URL}/api/documents/process-simple`;

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
  try {
    log('🔍 Checking for pending documents to process...', 'cyan');
    
    const response = await fetch(PROCESS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`❌ Processing API error (${response.status}): ${errorText}`, 'red');
      return;
    }

    const result = await response.json();
    
    if (result.success) {
      if (result.processed > 0) {
        log(`✅ Processed ${result.processed} document(s)`, 'green');
        if (result.failed > 0) {
          log(`⚠️ ${result.failed} document(s) failed to process`, 'yellow');
        }
      } else {
        log('ℹ️  No pending documents to process', 'blue');
      }
    } else {
      log(`❌ Processing failed: ${result.error}`, 'red');
    }
  } catch (error) {
    log(`❌ Error calling processing API: ${error.message}`, 'red');
  }
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
      
      // Use process-simple to handle files directly from folder
      try {
        const response = await fetch(PROCESS_SIMPLE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
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
          }
        } else {
          log(`❌ Processing endpoint returned ${response.status}`, 'red');
        }
      } catch (error) {
        log(`❌ Error processing files: ${error.message}`, 'red');
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
      await processPendingDocuments();
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

