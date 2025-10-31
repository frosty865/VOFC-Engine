# ========================================
# VOFC Processing System - Unified Startup (PowerShell)
# Starts Flask server, file watcher, and all services
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VOFC Processing System - Unified Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot
Set-Location "vofc-viewer"

# Check Python
Write-Host "[1/4] Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js
Write-Host "[2/4] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install Python dependencies
Write-Host "[3/4] Installing Python dependencies..." -ForegroundColor Yellow
try {
    python -m pip install -q -r ollama/requirements.txt
    Write-Host "  Done." -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Failed to install Python dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js dependencies
Write-Host "[4/4] Checking Node.js dependencies..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    if (-not (Test-Path "node_modules")) {
        Write-Host "  Installing Node.js packages..." -ForegroundColor Yellow
        npm install --silent
    } else {
        Write-Host "  Node.js packages already installed" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Flask Server (Python) will run on: http://127.0.0.1:5000" -ForegroundColor Cyan
Write-Host "File Watcher will monitor: C:\Users\frost\AppData\Local\Ollama\data\incoming" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Flask server in new window
Write-Host "Starting Flask server..." -ForegroundColor Yellow
$flaskPath = (Get-Location).Path
$flaskJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$flaskPath'; python ollama\server.py; Write-Host 'Flask server stopped. Press any key...'; Read-Host" -PassThru
Start-Sleep -Seconds 3

# Start file watcher in new window
Write-Host "Starting file watcher..." -ForegroundColor Yellow
$watcherPath = (Get-Location).Path
$watcherJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$watcherPath'; node scripts-dev\file-watcher.js; Write-Host 'File watcher stopped. Press any key...'; Read-Host" -PassThru
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Services Started" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Flask Server PID: $($flaskJob.Id)" -ForegroundColor Green
Write-Host "File Watcher PID: $($watcherJob.Id)" -ForegroundColor Green
Write-Host ""

# Test Flask server
Write-Host "Testing Flask server..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:5000/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  SUCCESS: Flask server is responding" -ForegroundColor Green
    Write-Host "  Status: $($response.status)" -ForegroundColor Cyan
    Write-Host "  Incoming files: $($response.directories.incoming.file_count)" -ForegroundColor Cyan
    Write-Host "  Library files: $($response.directories.library.file_count)" -ForegroundColor Cyan
} catch {
    Write-Host "  WARNING: Flask server may not be responding yet" -ForegroundColor Yellow
    Write-Host "  Give it a few more seconds to start up" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All services are running!" -ForegroundColor Green
Write-Host ""
Write-Host "To stop services, run:" -ForegroundColor Yellow
Write-Host "  Stop-Process -Id $($flaskJob.Id) -Force  # Stop Flask" -ForegroundColor Gray
Write-Host "  Stop-Process -Id $($watcherJob.Id) -Force  # Stop Watcher" -ForegroundColor Gray
Write-Host ""
Write-Host "Or close this window to keep services running in background." -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit (services will continue running)"

