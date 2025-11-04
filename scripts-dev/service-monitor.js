#!/usr/bin/env node
/**
 * VOFC Service Monitor
 * Monitors Flask and Ollama services and automatically restarts them on failure
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Configuration
const FLASK_PORT = 5000;
const FLASK_URL = `http://127.0.0.1:${FLASK_PORT}`;
const OLLAMA_PORT = 11434;
const OLLAMA_URL = `http://127.0.0.1:${OLLAMA_PORT}`;
const CHECK_INTERVAL = 10000; // Check every 10 seconds
const RESTART_DELAY = 3000; // Wait 3 seconds before restarting

// Paths - resolve to absolute paths to handle spaces in directory names
const scriptDir = __dirname;
const projectRoot = path.resolve(scriptDir, '..');
const flaskScript = path.resolve(projectRoot, 'ollama', 'server.py');
const watcherScript = path.resolve(projectRoot, 'scripts-dev', 'file-watcher.js');

// Verify paths exist and log them for debugging (only once on startup)
if (process.env.DEBUG_PATHS !== 'false') {
  console.log(`[DEBUG] Script directory: ${scriptDir}`);
  console.log(`[DEBUG] Project root: ${projectRoot}`);
  console.log(`[DEBUG] Flask script: ${flaskScript}`);
  console.log(`[DEBUG] Watcher script: ${watcherScript}`);
}

if (!fs.existsSync(flaskScript)) {
  console.error(`ERROR: Flask script not found at: ${flaskScript}`);
  console.error(`Please run this script from the vofc-viewer directory.`);
  console.error(`Current working directory: ${process.cwd()}`);
  process.exit(1);
}
if (!fs.existsSync(watcherScript)) {
  console.error(`ERROR: Watcher script not found at: ${watcherScript}`);
  console.error(`Please run this script from the vofc-viewer directory.`);
  console.error(`Current working directory: ${process.cwd()}`);
  process.exit(1);
}

// Service state
const services = {
  flask: {
    name: 'Flask Server',
    url: FLASK_URL,
    port: FLASK_PORT,
    process: null,
    pid: null,
    restartCount: 0,
    lastCheck: null,
    status: 'unknown'
  },
  ollama: {
    name: 'Ollama API',
    url: OLLAMA_URL,
    port: OLLAMA_PORT,
    process: null,
    pid: null,
    restartCount: 0,
    lastCheck: null,
    status: 'unknown'
  },
  watcher: {
    name: 'File Watcher',
    process: null,
    pid: null,
    restartCount: 0,
    lastCheck: null,
    status: 'unknown'
  }
};

/**
 * Logging utility
 */
function log(service, message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  const serviceName = service ? `[${service}]` : '[MONITOR]';
  console.log(`${timestamp} ${prefix} ${serviceName} ${message}`);
}

/**
 * Check if a service is responding via HTTP
 */
function checkService(service) {
  return new Promise((resolve) => {
    const url = service.url;
    if (!url) {
      resolve({ online: false, error: 'No URL configured' });
      return;
    }

    const req = http.get(url, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ 
          online: res.statusCode < 400, 
          statusCode: res.statusCode,
          data: data.substring(0, 100) // First 100 chars for logging
        });
      });
    });

    req.on('error', (err) => {
      resolve({ online: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ online: false, error: 'Timeout' });
    });

    setTimeout(() => {
      req.destroy();
      resolve({ online: false, error: 'Timeout' });
    }, 3000);
  });
}

/**
 * Check if a process is running by PID
 */
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0); // Signal 0 checks if process exists
    return true;
  } catch {
    return false;
  }
}

/**
 * Find process by port
 */
function findProcessByPort(port) {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}` 
      : `lsof -ti:${port}`;
    
    exec(cmd, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve(null);
        return;
      }
      
      if (process.platform === 'win32') {
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        lines.forEach(line => {
          const match = line.match(/\s+(\d+)$/);
          if (match) pids.add(parseInt(match[1]));
        });
        resolve(Array.from(pids)[0] || null);
      } else {
        resolve(parseInt(stdout.trim()) || null);
      }
    });
  });
}

/**
 * Start Flask server
 */
async function startFlask() {
  if (services.flask.process && isProcessRunning(services.flask.pid)) {
    log('Flask', 'Already running', 'warning');
    return;
  }

  log('Flask', `Starting on port ${FLASK_PORT}...`);
  
  // Check if port is already in use
  const existingPid = await findProcessByPort(FLASK_PORT);
  if (existingPid && existingPid !== process.pid) {
    log('Flask', `Port ${FLASK_PORT} in use by PID ${existingPid}, killing...`, 'warning');
    try {
      process.kill(existingPid, 'SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (isProcessRunning(existingPid)) {
        process.kill(existingPid, 'SIGKILL');
      }
    } catch (err) {
      log('Flask', `Failed to kill existing process: ${err.message}`, 'error');
    }
  }

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  // Use absolute path - construct command string for Windows to handle spaces properly
  // Escape quotes properly for Windows PowerShell/cmd
  const flaskProcess = process.platform === 'win32'
    ? spawn(`python "${flaskScript}"`, [], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      })
    : spawn(pythonCmd, [flaskScript], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

  flaskProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) log('Flask', output);
  });

  flaskProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) log('Flask', output, 'error');
  });

  flaskProcess.on('exit', (code, signal) => {
    log('Flask', `Process exited with code ${code} (signal: ${signal || 'none'})`, 'error');
    services.flask.process = null;
    services.flask.pid = null;
    
    // Auto-restart after delay
    setTimeout(() => {
      if (!services.flask.process || !isProcessRunning(services.flask.pid)) {
        services.flask.restartCount++;
        log('Flask', `Auto-restarting (attempt ${services.flask.restartCount})...`);
        startFlask();
      }
    }, RESTART_DELAY);
  });

  services.flask.process = flaskProcess;
  services.flask.pid = flaskProcess.pid;
  services.flask.restartCount++;
  log('Flask', `Started with PID ${flaskProcess.pid}`, 'success');
  
  // Wait a moment before checking health
  await new Promise(resolve => setTimeout(resolve, 3000));
}

/**
 * Start Ollama (check if running, or provide instructions)
 */
async function startOllama() {
  log('Ollama', 'Checking if Ollama service is running...');
  
  // Ollama typically runs as a system service, so we just check if it's responding
  const check = await checkService(services.ollama);
  if (check.online) {
    log('Ollama', 'Service is running', 'success');
    services.ollama.status = 'online';
    return;
  }

  log('Ollama', 'Service not responding. Ollama should be running as a system service.', 'warning');
  log('Ollama', 'Please start Ollama manually or ensure the Ollama service is configured to auto-start.', 'warning');
  services.ollama.status = 'offline';
}

/**
 * Start file watcher
 */
async function startWatcher() {
  if (services.watcher.process && isProcessRunning(services.watcher.pid)) {
    log('Watcher', 'Already running', 'warning');
    return;
  }

  log('Watcher', 'Starting file watcher...');

  // Use absolute path - construct command string for Windows to handle spaces properly
  const watcherProcess = process.platform === 'win32'
    ? spawn(`node "${watcherScript}"`, [], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      })
    : spawn('node', [watcherScript], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      });

  watcherProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) log('Watcher', output);
  });

  watcherProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) log('Watcher', output, 'error');
  });

  watcherProcess.on('exit', (code, signal) => {
    log('Watcher', `Process exited with code ${code} (signal: ${signal || 'none'})`, 'error');
    services.watcher.process = null;
    services.watcher.pid = null;
    
    // Auto-restart after delay
    setTimeout(() => {
      if (!services.watcher.process || !isProcessRunning(services.watcher.pid)) {
        services.watcher.restartCount++;
        log('Watcher', `Auto-restarting (attempt ${services.watcher.restartCount})...`);
        startWatcher();
      }
    }, RESTART_DELAY);
  });

  services.watcher.process = watcherProcess;
  services.watcher.pid = watcherProcess.pid;
  services.watcher.restartCount++;
  log('Watcher', `Started with PID ${watcherProcess.pid}`, 'success');
}

/**
 * Monitor all services
 */
async function monitorServices() {
  // Check Flask
  const flaskCheck = await checkService(services.flask);
  services.flask.lastCheck = new Date();
  
  if (!flaskCheck.online) {
    if (services.flask.status !== 'offline') {
      log('Flask', `Service offline: ${flaskCheck.error}`, 'error');
      services.flask.status = 'offline';
    }
    
    // Check if process is still running
    if (!services.flask.process || !isProcessRunning(services.flask.pid)) {
      log('Flask', 'Process not running, restarting...', 'warning');
      await startFlask();
    }
  } else {
    if (services.flask.status !== 'online') {
      log('Flask', 'Service is now online', 'success');
    }
    services.flask.status = 'online';
  }

  // Check Ollama
  const ollamaCheck = await checkService(services.ollama);
  services.ollama.lastCheck = new Date();
  
  if (!ollamaCheck.online) {
    if (services.ollama.status !== 'offline') {
      log('Ollama', `Service offline: ${ollamaCheck.error}`, 'error');
      services.ollama.status = 'offline';
      // Note: We don't auto-start Ollama as it's typically a system service
    }
  } else {
    if (services.ollama.status !== 'online') {
      log('Ollama', 'Service is now online', 'success');
    }
    services.ollama.status = 'online';
  }

  // Check file watcher
  if (!services.watcher.process || !isProcessRunning(services.watcher.pid)) {
    if (services.watcher.status !== 'offline') {
      log('Watcher', 'Process not running, restarting...', 'warning');
      services.watcher.status = 'offline';
    }
    await startWatcher();
  } else {
    services.watcher.status = 'online';
  }
}

/**
 * Print status summary
 */
function printStatus() {
  console.log('');
  console.log('='.repeat(60));
  console.log('VOFC Service Monitor - Status Summary');
  console.log('='.repeat(60));
  Object.values(services).forEach(service => {
    const statusIcon = service.status === 'online' ? '✅' : service.status === 'offline' ? '❌' : '⚠️';
    const pidInfo = service.pid ? ` (PID: ${service.pid})` : '';
    const restartInfo = service.restartCount > 0 ? ` [Restarts: ${service.restartCount}]` : '';
    const lastCheck = service.lastCheck ? ` [Last check: ${service.lastCheck.toLocaleTimeString()}]` : '';
    console.log(`${statusIcon} ${service.name}: ${service.status}${pidInfo}${restartInfo}${lastCheck}`);
  });
  console.log('='.repeat(60));
  console.log('');
}

/**
 * Graceful shutdown
 */
function shutdown() {
  log(null, 'Shutting down service monitor...', 'warning');
  
  Object.values(services).forEach(service => {
    if (service.process && isProcessRunning(service.pid)) {
      log(service.name, `Stopping process ${service.pid}...`);
      try {
        service.process.kill('SIGTERM');
        setTimeout(() => {
          if (isProcessRunning(service.pid)) {
            service.process.kill('SIGKILL');
          }
        }, 2000);
      } catch (err) {
        log(service.name, `Error stopping process: ${err.message}`, 'error');
      }
    }
  });

  setTimeout(() => {
    log(null, 'Service monitor stopped', 'success');
    process.exit(0);
  }, 3000);
}

// Handle process signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGUSR2', () => {
  printStatus();
});

// Main loop
async function main() {
  log(null, 'Starting VOFC Service Monitor...', 'success');
  log(null, `Flask URL: ${FLASK_URL}`);
  log(null, `Ollama URL: ${OLLAMA_URL}`);
  log(null, `Check interval: ${CHECK_INTERVAL / 1000}s`);
  log(null, 'Press Ctrl+C to stop');
  console.log('');

  // Initial startup
  await startFlask();
  await startOllama();
  await startWatcher();

  // Print initial status
  printStatus();

  // Monitor loop
  setInterval(async () => {
    await monitorServices();
  }, CHECK_INTERVAL);

  // Print status every minute
  setInterval(() => {
    printStatus();
  }, 60000);
}

// Start monitoring
main().catch(err => {
  log(null, `Fatal error: ${err.message}`, 'error');
  console.error(err);
  process.exit(1);
});

