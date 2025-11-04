# Fix VOFC-Flask Service - Quote Path Issue
# Run as Administrator

param(
    [string]$ServiceName = "VOFC-Flask"
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== Fixing VOFC-Flask Service Path Issue ===" -ForegroundColor Cyan
Write-Host ""

# Find NSSM
$nssmPath = "C:\Users\frost\Downloads\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "ERROR: NSSM not found at: $nssmPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found NSSM at: $nssmPath" -ForegroundColor Green
Write-Host ""

# Get current configuration
Write-Host "Current Configuration:" -ForegroundColor Yellow
$currentApp = & $nssmPath get $ServiceName Application 2>&1
$currentParams = & $nssmPath get $ServiceName AppParameters 2>&1
$currentDir = & $nssmPath get $ServiceName AppDirectory 2>&1

Write-Host "  Application: $currentApp" -ForegroundColor Gray
Write-Host "  Parameters: $currentParams" -ForegroundColor Gray
Write-Host "  Directory: $currentDir" -ForegroundColor Gray
Write-Host ""

# Paths
$serverPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\server.py"
$workingDir = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama"
$logDir = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs"

# Stop service first
Write-Host "Stopping service..." -ForegroundColor Yellow
try {
    Stop-Service -Name $ServiceName -Force -ErrorAction Stop
    Start-Sleep -Seconds 2
    Write-Host "[OK] Service stopped" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Could not stop service: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Verify paths exist
Write-Host "Verifying paths..." -ForegroundColor Yellow
if (-not (Test-Path $serverPath)) {
    Write-Host "ERROR: Server file not found: $serverPath" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Server file exists" -ForegroundColor Green

if (-not (Test-Path $workingDir)) {
    Write-Host "ERROR: Working directory not found: $workingDir" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Working directory exists" -ForegroundColor Green

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "[OK] Created log directory" -ForegroundColor Green
} else {
    Write-Host "[OK] Log directory exists" -ForegroundColor Green
}

Write-Host ""

# Fix AppParameters - Properly quote the path
Write-Host "Fixing AppParameters (adding quotes for path with spaces)..." -ForegroundColor Yellow
& $nssmPath set $ServiceName AppParameters "`"$serverPath`""
Write-Host "[OK] AppParameters updated" -ForegroundColor Green

# Ensure working directory is set
Write-Host "Setting AppDirectory..." -ForegroundColor Yellow
& $nssmPath set $ServiceName AppDirectory $workingDir
Write-Host "[OK] AppDirectory updated" -ForegroundColor Green

# Set log paths
Write-Host "Setting log paths..." -ForegroundColor Yellow
$outLog = Join-Path $logDir "flask_out.log"
$errLog = Join-Path $logDir "flask_err.log"
& $nssmPath set $ServiceName AppStdout $outLog
& $nssmPath set $ServiceName AppStderr $errLog
Write-Host "[OK] Log paths updated" -ForegroundColor Green

Write-Host ""

# Verify configuration
Write-Host "Updated Configuration:" -ForegroundColor Yellow
$newParams = & $nssmPath get $ServiceName AppParameters 2>&1
Write-Host "  AppParameters: $newParams" -ForegroundColor Gray
Write-Host ""

# Start service
Write-Host "Starting service..." -ForegroundColor Yellow
try {
    Start-Service -Name $ServiceName -ErrorAction Stop
    Start-Sleep -Seconds 5
    $service = Get-Service -Name $ServiceName
    if ($service.Status -eq "Running") {
        Write-Host "[OK] Service started successfully!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Service status: $($service.Status)" -ForegroundColor Yellow
        Write-Host "Check logs at:" -ForegroundColor Cyan
        Write-Host "  $errLog" -ForegroundColor White
    }
} catch {
    Write-Host "[ERROR] Failed to start service: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check logs at:" -ForegroundColor Cyan
    Write-Host "  $errLog" -ForegroundColor White
}

Write-Host ""

# Final status
$service = Get-Service -Name $ServiceName
Write-Host "Final service status: $($service.Status)" -ForegroundColor Cyan
Write-Host ""

if ($service.Status -eq "Running") {
    Write-Host "Testing Flask endpoint..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/system/health" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "[OK] Flask is responding: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Flask not responding yet: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Service may still be starting. Wait a few seconds and try again." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "To check logs:" -ForegroundColor Cyan
Write-Host "  Get-Content '$errLog' -Tail 50" -ForegroundColor White
Write-Host ""

