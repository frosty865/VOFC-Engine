# Fix VOFC-Flask Service Startup Issues
# Run as Administrator

param(
    [string]$ServiceName = "VOFC-Flask",
    [string]$PythonPath = "",
    [string]$ServerPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\server.py",
    [string]$WorkingDir = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama"
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== Fixing VOFC-Flask Service ===" -ForegroundColor Cyan
Write-Host ""

# Find NSSM
$nssmPath = $null
$possiblePaths = @(
    "C:\Users\frost\Downloads\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe",
    "C:\Program Files\nssm\nssm.exe",
    "C:\Program Files (x86)\nssm\nssm.exe",
    "$env:ProgramFiles\nssm\nssm.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $nssmPath = $path
        break
    }
}

# Also check if nssm is in PATH
if (-not $nssmPath) {
    $nssmCmd = Get-Command nssm.exe -ErrorAction SilentlyContinue
    if ($nssmCmd) {
        $nssmPath = $nssmCmd.Source
    }
}

if (-not $nssmPath) {
    Write-Host "ERROR: NSSM not found" -ForegroundColor Red
    Write-Host "Please install NSSM or specify the path" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found NSSM at: $nssmPath" -ForegroundColor Green
Write-Host ""

# Check service status
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
        Start-Sleep -Seconds 2
        Write-Host "[OK] Service stopped" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Could not stop service: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Verify paths
Write-Host "Verifying paths..." -ForegroundColor Yellow

# Auto-detect Python if not provided
if (-not $PythonPath -or -not (Test-Path $PythonPath)) {
    Write-Host "Searching for Python..." -ForegroundColor Yellow
    
    # Try common locations
    $pythonPaths = @(
        "C:\Users\frost\AppData\Local\Programs\Python\Python313\python.exe",
        "C:\Users\frost\AppData\Local\Programs\Python\Python311\python.exe",
        "C:\Users\frost\AppData\Local\Programs\Python\Python312\python.exe",
        "C:\Python*\python.exe"
    )
    
    $found = $false
    foreach ($path in $pythonPaths) {
        if ($path -like "*Python*") {
            $dirs = Get-ChildItem "C:\Users\frost\AppData\Local\Programs\Python" -Directory -ErrorAction SilentlyContinue
            foreach ($dir in $dirs) {
                $testPath = Join-Path $dir.FullName "python.exe"
                if (Test-Path $testPath) {
                    $PythonPath = $testPath
                    $found = $true
                    break
                }
            }
            if ($found) { break }
        } elseif (Test-Path $path) {
            $PythonPath = $path
            $found = $true
            break
        }
    }
    
    # Try PATH as last resort
    if (-not $found) {
        $python = Get-Command python.exe -ErrorAction SilentlyContinue
        if ($python) {
            $PythonPath = $python.Source
            $found = $true
        }
    }
    
    if (-not $found) {
        Write-Host "ERROR: Python not found" -ForegroundColor Red
        Write-Host "Please specify Python path or ensure Python is in PATH" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "[OK] Found Python: $PythonPath" -ForegroundColor Green
    }
} else {
    Write-Host "[OK] Python: $PythonPath" -ForegroundColor Green
}

if (-not (Test-Path $ServerPath)) {
    Write-Host "ERROR: Server file not found: $ServerPath" -ForegroundColor Red
    exit 1
} else {
    Write-Host "[OK] Server: $ServerPath" -ForegroundColor Green
}

if (-not (Test-Path $WorkingDir)) {
    Write-Host "WARNING: Working directory does not exist, creating: $WorkingDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $WorkingDir -Force | Out-Null
} else {
    Write-Host "[OK] Working directory: $WorkingDir" -ForegroundColor Green
}

Write-Host ""

# Get current NSSM settings
Write-Host "Current NSSM settings:" -ForegroundColor Yellow
$currentApp = & $nssmPath get $ServiceName Application 2>&1
$currentParams = & $nssmPath get $ServiceName AppParameters 2>&1
$currentDir = & $nssmPath get $ServiceName AppDirectory 2>&1

Write-Host "  Application: $currentApp" -ForegroundColor Gray
Write-Host "  Parameters: $currentParams" -ForegroundColor Gray
Write-Host "  Directory: $currentDir" -ForegroundColor Gray
Write-Host ""

# Update NSSM settings
Write-Host "Updating NSSM settings..." -ForegroundColor Yellow

& $nssmPath set $ServiceName Application $PythonPath
& $nssmPath set $ServiceName AppParameters "`"$ServerPath`""
& $nssmPath set $ServiceName AppDirectory $WorkingDir

# Set log paths
$logDir = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$logPath = Join-Path $logDir "flask.log"

& $nssmPath set $ServiceName AppStdout $logPath
& $nssmPath set $ServiceName AppStderr $logPath

# Configure restart on crash
& $nssmPath set $ServiceName AppRestartDelay 10000
& $nssmPath set $ServiceName AppExit Default Restart

Write-Host "[OK] Settings updated" -ForegroundColor Green
Write-Host ""

# Test Python can run the server
Write-Host "Testing Python execution..." -ForegroundColor Yellow
try {
    $testResult = & $PythonPath -c "import sys; print('Python OK')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Python can execute" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Python test returned: $testResult" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] Python test failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test server file syntax
Write-Host "Testing server.py syntax..." -ForegroundColor Yellow
try {
    $syntaxResult = & $PythonPath -m py_compile $ServerPath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Server.py syntax is valid" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Server.py has syntax errors:" -ForegroundColor Red
        Write-Host $syntaxResult -ForegroundColor Red
    }
} catch {
    Write-Host "[WARNING] Could not check syntax: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Start service
Write-Host "Starting service..." -ForegroundColor Yellow
try {
    Start-Service -Name $ServiceName -ErrorAction Stop
    Start-Sleep -Seconds 3
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
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/system/health" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "[OK] Flask is responding: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Flask not responding yet: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Service may still be starting. Wait a few seconds and try again." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "To check logs:" -ForegroundColor Cyan
Write-Host "  Get-Content '$logPath' -Tail 50" -ForegroundColor White
Write-Host ""

