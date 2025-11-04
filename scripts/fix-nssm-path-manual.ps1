# Manual Fix for NSSM Path Issue
# Run as Administrator
# This script fixes the path quoting issue in NSSM

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

Write-Host "=== Fixing NSSM Path Configuration ===" -ForegroundColor Cyan
Write-Host ""

# Find NSSM
$nssmPath = "C:\Users\frost\Downloads\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "ERROR: NSSM not found at: $nssmPath" -ForegroundColor Red
    exit 1
}

# Stop service first
Write-Host "Stopping service..." -ForegroundColor Yellow
Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Get current config
Write-Host "Current AppParameters:" -ForegroundColor Yellow
$current = & $nssmPath get $ServiceName AppParameters 2>&1
Write-Host "  $current" -ForegroundColor Gray
Write-Host ""

# The full path with spaces
$serverPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\server.py"
$workingDir = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama"

Write-Host "Setting new AppParameters (with quotes)..." -ForegroundColor Yellow

# Method 1: Try with escaped quotes
& $nssmPath set $ServiceName AppParameters "`"$serverPath`""

# Verify
Write-Host ""
Write-Host "Verifying configuration..." -ForegroundColor Yellow
$newParams = & $nssmPath get $ServiceName AppParameters 2>&1
Write-Host "  New AppParameters: $newParams" -ForegroundColor Gray

# Ensure working directory is set
& $nssmPath set $ServiceName AppDirectory $workingDir
Write-Host "  AppDirectory: $workingDir" -ForegroundColor Gray

Write-Host ""

# Start service
Write-Host "Starting service..." -ForegroundColor Yellow
Start-Service -Name $ServiceName
Start-Sleep -Seconds 5

# Check status
$service = Get-Service -Name $ServiceName
Write-Host "Service Status: $($service.Status)" -ForegroundColor Cyan

if ($service.Status -eq "Running") {
    Write-Host "[OK] Service is running!" -ForegroundColor Green
    
    # Test Flask
    Start-Sleep -Seconds 3
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/system/health" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "[OK] Flask is responding: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Flask not responding yet: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] Service status: $($service.Status)" -ForegroundColor Red
    Write-Host "Check logs: C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\flask_err.log" -ForegroundColor Yellow
}

Write-Host ""

