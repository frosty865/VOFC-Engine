# NSSM Service Installation Script for VOFC Flask
# Run this script as Administrator

param(
    [string]$ServiceName = "vofc-flask",
    [string]$PythonPath = "C:\Users\frost\AppData\Local\Programs\Python\Python311\python.exe",
    [string]$ServerPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama\server.py",
    [string]$WorkingDir = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama",
    [string]$LogPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\flask.log"
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if NSSM is available
$nssmPath = Get-Command nssm.exe -ErrorAction SilentlyContinue
if (-not $nssmPath) {
    Write-Host "ERROR: nssm.exe not found in PATH" -ForegroundColor Red
    Write-Host "Please download NSSM from https://nssm.cc/download and add it to your PATH" -ForegroundColor Yellow
    Write-Host "Or specify the full path to nssm.exe" -ForegroundColor Yellow
    exit 1
}

Write-Host "Installing VOFC Flask service with NSSM..." -ForegroundColor Green
Write-Host "Service Name: $ServiceName" -ForegroundColor Cyan
Write-Host "Python: $PythonPath" -ForegroundColor Cyan
Write-Host "Server: $ServerPath" -ForegroundColor Cyan
Write-Host "Working Directory: $WorkingDir" -ForegroundColor Cyan
Write-Host ""

# Verify paths exist
if (-not (Test-Path $PythonPath)) {
    Write-Host "ERROR: Python executable not found: $PythonPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ServerPath)) {
    Write-Host "ERROR: Server file not found: $ServerPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $WorkingDir)) {
    Write-Host "WARNING: Working directory does not exist, creating: $WorkingDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $WorkingDir -Force | Out-Null
}

# Create log directory if it doesn't exist
$logDir = Split-Path $LogPath -Parent
if (-not (Test-Path $logDir)) {
    Write-Host "Creating log directory: $logDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Check if service already exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Service '$ServiceName' already exists. Removing..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    & nssm.exe remove $ServiceName confirm
    Start-Sleep -Seconds 1
}

# Install service
Write-Host "Installing service..." -ForegroundColor Green
& nssm.exe install $ServiceName $PythonPath $ServerPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install service" -ForegroundColor Red
    exit 1
}

# Configure service settings
Write-Host "Configuring service settings..." -ForegroundColor Green

# Set startup directory
& nssm.exe set $ServiceName AppDirectory $WorkingDir

# Set log output
& nssm.exe set $ServiceName AppStdout $LogPath
& nssm.exe set $ServiceName AppStderr $LogPath

# Configure I/O settings
& nssm.exe set $ServiceName AppRotateFiles 1
& nssm.exe set $ServiceName AppRotateOnline 1
& nssm.exe set $ServiceName AppRotateSeconds 86400  # Rotate daily
& nssm.exe set $ServiceName AppRotateBytes 10485760  # 10MB per file

# Enable restart on crash
& nssm.exe set $ServiceName AppRestartDelay 10000  # 10 seconds
& nssm.exe set $ServiceName AppExit Default Restart

# Set service description
& nssm.exe set $ServiceName Description "VOFC Flask Backend Server - Document Processing Service"

# Set service to start automatically
& nssm.exe set $ServiceName Start SERVICE_AUTO_START

Write-Host ""
Write-Host "Service installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the service, run:" -ForegroundColor Cyan
Write-Host "  nssm start $ServiceName" -ForegroundColor White
Write-Host ""
Write-Host "To stop the service, run:" -ForegroundColor Cyan
Write-Host "  nssm stop $ServiceName" -ForegroundColor White
Write-Host ""
Write-Host "To view service status, run:" -ForegroundColor Cyan
Write-Host "  nssm status $ServiceName" -ForegroundColor White
Write-Host ""
Write-Host "Log file location: $LogPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Would you like to start the service now? (Y/N)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "Y" -or $response -eq "y") {
    Write-Host "Starting service..." -ForegroundColor Green
    & nssm.exe start $ServiceName
    Start-Sleep -Seconds 2
    $status = Get-Service -Name $ServiceName
    if ($status.Status -eq "Running") {
        Write-Host "Service started successfully!" -ForegroundColor Green
    } else {
        Write-Host "Service may still be starting. Check status with: nssm status $ServiceName" -ForegroundColor Yellow
    }
}

