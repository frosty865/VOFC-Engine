# Setup Gunicorn for VOFC Flask Service
# This script updates the NSSM service to use Gunicorn instead of direct Python execution

param(
    [string]$ServiceName = "vofc-flask",
    [string]$PythonPath = "C:\Users\frost\AppData\Local\Programs\Python\Python311\python.exe",
    [string]$GunicornPath = "C:\Users\frost\AppData\Local\Programs\Python\Python311\Scripts\gunicorn.exe",
    [string]$ServerPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama\server.py",
    [string]$WorkingDir = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama",
    [string]$ConfigPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama\gunicorn_config.py",
    [int]$Workers = 4
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    exit 1
}

Write-Host "Setting up Gunicorn for VOFC Flask service..." -ForegroundColor Green
Write-Host ""

# Check if Gunicorn is installed
if (-not (Test-Path $GunicornPath)) {
    Write-Host "Gunicorn not found. Installing..." -ForegroundColor Yellow
    $pythonDir = Split-Path $PythonPath -Parent
    & $PythonPath -m pip install gunicorn
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install Gunicorn" -ForegroundColor Red
        exit 1
    }
    Write-Host "Gunicorn installed successfully" -ForegroundColor Green
}

# Verify Gunicorn exists
if (-not (Test-Path $GunicornPath)) {
    Write-Host "ERROR: Gunicorn executable still not found at: $GunicornPath" -ForegroundColor Red
    Write-Host "Please install Gunicorn manually: pip install gunicorn" -ForegroundColor Yellow
    exit 1
}

# Create Gunicorn config file if it doesn't exist
if (-not (Test-Path $ConfigPath)) {
    Write-Host "Creating Gunicorn configuration file..." -ForegroundColor Yellow
    
    $configContent = @"
# Gunicorn configuration file for VOFC Flask
import multiprocessing
import os

# Server socket
bind = "127.0.0.1:5000"
backlog = 2048

# Worker processes
workers = $Workers
worker_class = "sync"
worker_connections = 1000
timeout = 1800  # 30 minutes for large document processing
keepalive = 5

# Logging
log_dir = r"C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs"
os.makedirs(log_dir, exist_ok=True)
accesslog = os.path.join(log_dir, "gunicorn-access.log")
errorlog = os.path.join(log_dir, "gunicorn-error.log")
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "vofc-flask"

# Server mechanics
daemon = False
pidfile = os.path.join(log_dir, "gunicorn.pid")
user = None
group = None

# Graceful timeout
graceful_timeout = 30

# Preload app for faster worker startup
preload_app = False
"@
    
    $configDir = Split-Path $ConfigPath -Parent
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    
    Set-Content -Path $ConfigPath -Value $configContent
    Write-Host "Configuration file created: $ConfigPath" -ForegroundColor Green
}

# Check if service exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $existingService) {
    Write-Host "ERROR: Service '$ServiceName' not found. Please install it first using install-nssm-service.ps1" -ForegroundColor Red
    exit 1
}

# Stop service if running
if ($existingService.Status -eq "Running") {
    Write-Host "Stopping service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 3
}

# Update service to use Gunicorn
Write-Host "Updating service configuration..." -ForegroundColor Green

# Get the server directory (parent of server.py)
$serverDir = Split-Path $ServerPath -Parent
$serverModule = "server:app"  # Gunicorn format: module:app_variable

# Update application path
& nssm.exe set $ServiceName Application $GunicornPath

# Update parameters
$appParams = "--config `"$ConfigPath`" $serverModule"
& nssm.exe set $ServiceName AppParameters $appParams

# Ensure working directory is correct
& nssm.exe set $ServiceName AppDirectory $WorkingDir

Write-Host ""
Write-Host "Service updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Service: $ServiceName" -ForegroundColor White
Write-Host "  Executable: $GunicornPath" -ForegroundColor White
Write-Host "  Workers: $Workers" -ForegroundColor White
Write-Host "  Config: $ConfigPath" -ForegroundColor White
Write-Host ""
Write-Host "To start the service:" -ForegroundColor Cyan
Write-Host "  nssm start $ServiceName" -ForegroundColor White
Write-Host ""
Write-Host "To test Gunicorn manually (before starting service):" -ForegroundColor Cyan
Write-Host "  cd `"$WorkingDir`"" -ForegroundColor White
Write-Host "  gunicorn --workers $Workers --bind 127.0.0.1:5000 server:app" -ForegroundColor White
Write-Host ""

