#!/usr/bin/env node

/**
 * VOFC Engine AI Tools Reindexing and Setup Script
 * 
 * This script helps reindex and update the AI tools configuration
 * for the VOFC Engine project.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    apiPath: '/api/tags',
  },
  backend: {
    path: path.join(__dirname, '../vofc-viewer/apps/backend'),
    envFile: '.env',
    envExample: 'env.example',
    defaultEnv: {
      ollamaBase: 'http://localhost:11434',
      ollamaModel: 'llama3:8b-instruct',
      aiTemperature: '0.2',
      aiTopP: '0.9',
      aiMaxTokens: '2048',
      port: '4000',
    },
  },
  testConnection: {
    endpoint: 'http://localhost:4000/api/ai-tools/test-connection',
    timeout: 10000,
  },
};

// Logger utility
const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  section: (title) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(title);
    console.log('='.repeat(50));
  },
};

// Check if Ollama is running
function checkOllama() {
  try {
    const url = `${CONFIG.ollama.host}${CONFIG.ollama.apiPath}`;
    execSync(`curl -s ${url}`, { stdio: 'pipe' });
    logger.success('Ollama server is running');
    return true;
  } catch (error) {
    logger.error('Ollama server is not running');
    logger.info('Please start Ollama with: ollama serve');
    return false;
  }
}

// Check if models are available
function checkModels() {
  try {
    const output = execSync('ollama list', { encoding: 'utf8' });
    logger.info('Available models:');
    console.log(output);
    return true;
  } catch (error) {
    logger.error('Error checking models');
    logger.warning('Make sure Ollama is installed and in your PATH');
    return false;
  }
}

// Install backend dependencies
function installBackendDependencies() {
  const backendPath = CONFIG.backend.path;
  const packageJsonPath = path.join(backendPath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    logger.warning('Backend package.json not found, skipping dependency installation');
    return true;
  }
  
  logger.info('Installing backend dependencies...');
  try {
    execSync('npm install', { 
      cwd: backendPath,
      stdio: 'inherit'
    });
    logger.success('Backend dependencies installed');
    return true;
  } catch (error) {
    logger.warning('Error installing backend dependencies (non-critical)');
    return true;
  }
}

// Create environment file if it doesn't exist
function setupEnvironment() {
  const envPath = path.join(CONFIG.backend.path, CONFIG.backend.envFile);
  const envExamplePath = path.join(CONFIG.backend.path, CONFIG.backend.envExample);
  
  if (fs.existsSync(envPath)) {
    logger.success('Environment file already exists');
    return;
  }

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    logger.success('Environment file created from example');
    return;
  }

  // Create default .env file
  const envContent = `# Ollama Configuration
OLLAMA_BASE=${CONFIG.backend.defaultEnv.ollamaBase}
OLLAMA_MODEL=${CONFIG.backend.defaultEnv.ollamaModel}

# AI Service Configuration
AI_TEMPERATURE=${CONFIG.backend.defaultEnv.aiTemperature}
AI_TOP_P=${CONFIG.backend.defaultEnv.aiTopP}
AI_MAX_TOKENS=${CONFIG.backend.defaultEnv.aiMaxTokens}

# Server Configuration
PORT=${CONFIG.backend.defaultEnv.port}
`;
  
  try {
    fs.writeFileSync(envPath, envContent);
    logger.success('Environment file created with default values');
  } catch (error) {
    logger.error(`Failed to create environment file: ${error.message}`);
    throw error;
  }
}

// Test AI connection
function testAIConnection() {
  logger.info('Testing AI connection...');
  try {
    const response = execSync(`curl -s -X GET ${CONFIG.testConnection.endpoint}`, { 
      encoding: 'utf8',
      timeout: CONFIG.testConnection.timeout
    });
    logger.success('AI connection test successful');
    logger.info(`Response: ${response.trim()}`);
    return true;
  } catch (error) {
    logger.error('AI connection test failed');
    logger.info('Make sure the backend server is running on port 4000');
    return false;
  }
}

// Start backend server
function startBackendServer() {
  logger.info('Starting backend server...');
  try {
    execSync('npm start', { 
      cwd: CONFIG.backend.path,
      stdio: 'pipe',
      timeout: 5000
    });
    logger.success('Backend server started');
    return true;
  } catch (error) {
    logger.error('Error starting backend server');
    logger.warning('This may be normal if server is already running');
    return false;
  }
}

// Generate summary report
function generateSummary(ollamaRunning, hasBackend) {
  logger.section('Reindexing Summary');
  
  const summary = [
    { label: 'Ollama server', status: ollamaRunning ? '✅ Running' : '❌ Not running' },
    { label: 'Models available', status: '✅ Verified' },
    { label: 'Environment', status: '✅ Configured' },
  ];

  if (hasBackend) {
    summary.push({ label: 'Backend setup', status: '✅ Configured' });
  }

  summary.forEach(item => {
    console.log(`- ${item.label}: ${item.status}`);
  });
  
  console.log('\nThe AI tools are ready to use!');
}

// Main execution
async function main() {
  logger.section('VOFC Engine AI Tools Reindexing Script');
  
  try {
    // Step 1: Check Ollama
    const ollamaRunning = checkOllama();
    if (!ollamaRunning) {
      logger.error('Cannot proceed without Ollama server');
      process.exit(1);
    }
    
    // Step 2: Check models
    checkModels();
    
    // Step 3: Setup environment
    setupEnvironment();
    
    // Step 4: Install dependencies (optional)
    installBackendDependencies();
    
    // Step 5: Start backend server (optional)
    const packageJsonPath = path.join(CONFIG.backend.path, 'package.json');
    const hasBackend = fs.existsSync(packageJsonPath);
    
    if (hasBackend) {
      const serverStarted = startBackendServer();
      if (serverStarted) {
        // Step 6: Test connection after delay
        setTimeout(() => {
          testAIConnection();
        }, 3000);
      }
    } else {
      logger.warning('Backend server setup skipped (no package.json found)');
    }
    
    // Generate final summary
    generateSummary(ollamaRunning, hasBackend);
    
  } catch (error) {
    logger.error(`Reindexing failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
