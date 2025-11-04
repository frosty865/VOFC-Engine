# Fix NSSM using 8.3 short path to avoid spaces
# Run as Administrator

param(
    [string]$ServiceName = "VOFC-Flask"
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    exit 1
}

Write-Host "=== Fixing NSSM with 8.3 Short Path ===" -ForegroundColor Cyan
Write-Host ""

# Find NSSM
$nssmPath = "C:\Users\frost\Downloads\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "ERROR: NSSM not found" -ForegroundColor Red
    exit 1
}

# Stop service
Write-Host "Stopping service..." -ForegroundColor Yellow
Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Get 8.3 short path (no spaces)
try {
    $fso = New-Object -ComObject Scripting.FileSystemObject
    $fullPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\server.py"
    $file = $fso.GetFile($fullPath)
    $shortPath = $file.ShortPath
    
    Write-Host "Full path: $fullPath" -ForegroundColor Gray
    Write-Host "Short path: $shortPath" -ForegroundColor Green
    Write-Host ""
    
    # Update NSSM with short path (no spaces, no quotes needed)
    Write-Host "Updating NSSM AppParameters with short path..." -ForegroundColor Yellow
    & $nssmPath set $ServiceName AppParameters $shortPath
    
    Write-Host "[OK] AppParameters updated" -ForegroundColor Green
    
    # Verify
    $newParams = & $nssmPath get $ServiceName AppParameters 2>&1
    Write-Host "New AppParameters: $newParams" -ForegroundColor Gray
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
            Write-Host "[WARNING] Flask not responding yet" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[ERROR] Service status: $($service.Status)" -ForegroundColor Red
        Write-Host "Check logs: C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\flask_err.log" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "[ERROR] Failed to get short path: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Trying alternative method with quotes..." -ForegroundColor Yellow
    
    # Alternative: Use quotes with proper escaping
    $fullPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\server.py"
    & $nssmPath set $ServiceName AppParameters "`"$fullPath`""
    
    Write-Host "Updated with quoted path" -ForegroundColor Green
    Start-Service -Name $ServiceName
}

Write-Host ""

