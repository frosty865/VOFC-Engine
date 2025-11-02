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

# Start Service Monitor (handles Flask, Ollama, and File Watcher with auto-restart)
Write-Host "Starting Service Monitor..." -ForegroundColor Yellow
$monitorPath = (Get-Location).Path
$monitorJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$monitorPath'; node scripts-dev\service-monitor.js" -PassThru
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Service Monitor Started" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service Monitor PID: $($monitorJob.Id)" -ForegroundColor Green
Write-Host ""
Write-Host "The monitor will:" -ForegroundColor Cyan
Write-Host "  - Keep Flask server running on port 5000" -ForegroundColor Gray
Write-Host "  - Keep File Watcher running" -ForegroundColor Gray
Write-Host "  - Monitor Ollama on port 11434" -ForegroundColor Gray
Write-Host "  - Auto-restart services if they fail" -ForegroundColor Gray
Write-Host ""

# Test services
Write-Host "Testing services..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:5000/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  SUCCESS: Flask server is responding" -ForegroundColor Green
    Write-Host "  Status: $($response.status)" -ForegroundColor Cyan
    Write-Host "  Incoming files: $($response.directories.incoming.file_count)" -ForegroundColor Cyan
    Write-Host "  Library files: $($response.directories.library.file_count)" -ForegroundColor Cyan
} catch {
    Write-Host "  WARNING: Flask server may not be responding yet" -ForegroundColor Yellow
    Write-Host "  The monitor will automatically restart it" -ForegroundColor Yellow
}

try {
    $ollamaResponse = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  SUCCESS: Ollama is responding" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Ollama may not be running" -ForegroundColor Yellow
    Write-Host "  Ensure Ollama service is started (or run: ollama serve)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All services are being monitored!" -ForegroundColor Green
Write-Host ""
Write-Host "To stop the monitor and all services, run:" -ForegroundColor Yellow
Write-Host "  Stop-Process -Id $($monitorJob.Id) -Force  # Stop Service Monitor" -ForegroundColor Gray
Write-Host ""
Write-Host "Or use: .\scripts-dev\stop-all.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Services will auto-restart on failure." -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit (services will continue running)"

