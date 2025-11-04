# Quick script to start Flask server
# This can be used to start Flask manually or test it before setting up as a service

param(
    [string]$ServerPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\server.py",
    [string]$PythonPath = "C:\Users\frost\AppData\Local\Programs\Python\Python311\python.exe"
)

Write-Host "Starting Flask server..." -ForegroundColor Green

# Check if Python exists
if (-not (Test-Path $PythonPath)) {
    Write-Host "ERROR: Python not found at: $PythonPath" -ForegroundColor Red
    Write-Host "Trying to find Python..." -ForegroundColor Yellow
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        $PythonPath = $python.Source
        Write-Host "Found Python at: $PythonPath" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Python not found in PATH" -ForegroundColor Red
        exit 1
    }
}

# Check if server file exists
if (-not (Test-Path $ServerPath)) {
    Write-Host "ERROR: Server file not found: $ServerPath" -ForegroundColor Red
    exit 1
}

# Change to server directory
$serverDir = Split-Path $ServerPath -Parent
Set-Location $serverDir

Write-Host "Server directory: $serverDir" -ForegroundColor Cyan
Write-Host "Python: $PythonPath" -ForegroundColor Cyan
Write-Host "Server: $ServerPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting Flask server on http://127.0.0.1:5000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start Flask
& $PythonPath $ServerPath

