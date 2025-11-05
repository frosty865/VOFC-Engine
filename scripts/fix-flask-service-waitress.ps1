# Fix VOFC-Flask Service - Waitress Configuration
# Run as Administrator
# This fixes the module path issue for waitress

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

Write-Host "=== Fixing VOFC-Flask Service - Waitress Configuration ===" -ForegroundColor Cyan
Write-Host ""

# Find NSSM
$nssmPath = "C:\Tools\nssm\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "ERROR: NSSM not found at: $nssmPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found NSSM at: $nssmPath" -ForegroundColor Green
Write-Host ""

# Check service exists
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "ERROR: Service '$ServiceName' not found" -ForegroundColor Red
    exit 1
}

Write-Host "Current service status: $($service.Status)" -ForegroundColor Cyan
Write-Host ""

# Stop service if running/paused
if ($service.Status -ne "Stopped") {
    Write-Host "Stopping service..." -ForegroundColor Yellow
    try {
        Stop-Service -Name $ServiceName -Force -ErrorAction Stop
        Start-Sleep -Seconds 3
        Write-Host "[OK] Service stopped" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Could not stop service: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Paths - Production structure
$pythonPath = "C:\Tools\python\python.exe"
$workingDir = "C:\Tools\VOFC-Flask"

# Verify paths
Write-Host "Verifying paths..." -ForegroundColor Yellow
if (-not (Test-Path $pythonPath)) {
    Write-Host "ERROR: Python not found: $pythonPath" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Python: $pythonPath" -ForegroundColor Green

if (-not (Test-Path $workingDir)) {
    Write-Host "ERROR: Working directory not found: $workingDir" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Working directory: $workingDir" -ForegroundColor Green

# Verify service configuration
Write-Host "Verifying service configuration..." -ForegroundColor Yellow
$currentApp = & $nssmPath get $ServiceName Application 2>&1
$currentParams = & $nssmPath get $ServiceName AppParameters 2>&1
if ($currentApp -ne $pythonPath) {
    Write-Host "Setting Application path..." -ForegroundColor Yellow
    & $nssmPath set $ServiceName Application $pythonPath
}
if ($currentParams -notlike "*-m waitress*") {
    Write-Host "Setting AppParameters..." -ForegroundColor Yellow
    & $nssmPath set $ServiceName AppParameters "-m waitress --listen=0.0.0.0:8080 server:app"
}

Write-Host ""

# Get current settings
Write-Host "Current NSSM settings:" -ForegroundColor Yellow
$currentApp = & $nssmPath get $ServiceName Application 2>&1
$currentParams = & $nssmPath get $ServiceName AppParameters 2>&1
$currentDir = & $nssmPath get $ServiceName AppDirectory 2>&1

Write-Host "  Application: $currentApp" -ForegroundColor Gray
Write-Host "  Parameters: $currentParams" -ForegroundColor Gray
Write-Host "  Directory: $currentDir" -ForegroundColor Gray
Write-Host ""

# Set log paths (production structure)
$logDir = "C:\Tools\nssm\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$logPath = Join-Path $logDir "vofc_flask_out.log"
$errorLogPath = Join-Path $logDir "vofc_flask_err.log"

# Set working directory (should already be set, but ensure it's correct)
Write-Host "Setting working directory..." -ForegroundColor Yellow
& $nssmPath set $ServiceName AppDirectory $workingDir
Write-Host "[OK] Working directory: $workingDir" -ForegroundColor Green

# Verify the module path is correct
Write-Host "Verifying module path..." -ForegroundColor Yellow
$modulePath = "server:app"
Write-Host "  Module path: $modulePath" -ForegroundColor Gray
Write-Host "  (server.py should be in: $workingDir)" -ForegroundColor Gray

& $nssmPath set $ServiceName AppStdout $logPath
& $nssmPath set $ServiceName AppStderr $errorLogPath
Write-Host "[OK] Log paths configured" -ForegroundColor Green

# Configure restart on crash
& $nssmPath set $ServiceName AppRestartDelay 10000
& $nssmPath set $ServiceName AppExit Default Restart

Write-Host ""
Write-Host "[OK] Configuration updated" -ForegroundColor Green
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
        Write-Host "Check logs at: $logPath" -ForegroundColor Cyan
    }
} catch {
    Write-Host "[ERROR] Failed to start service: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check logs at: $logPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Recent log output:" -ForegroundColor Yellow
    Get-Content $logPath -Tail 20 -ErrorAction SilentlyContinue
}

Write-Host ""

# Show service status
$service = Get-Service -Name $ServiceName
Write-Host "Final service status: $($service.Status)" -ForegroundColor Cyan
Write-Host ""

if ($service.Status -eq "Running") {
    Write-Host "Testing Flask endpoint..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/system/health" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "[OK] Flask is responding: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Flask not responding yet: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Service may still be starting. Wait a few seconds and try again." -ForegroundColor Yellow
        Write-Host "Check logs at: $logPath" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "To check logs:" -ForegroundColor Cyan
Write-Host "  Get-Content '$logPath' -Tail 50" -ForegroundColor White
Write-Host ""

