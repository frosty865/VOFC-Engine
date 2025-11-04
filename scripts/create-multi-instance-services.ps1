# Create Multiple Flask Instance Services for Nginx Load Balancing
# This script creates multiple NSSM services running Flask on different ports

param(
    [int]$InstanceCount = 3,
    [int]$StartPort = 5000,
    [string]$BaseServiceName = "vofc-flask",
    [string]$PythonPath = "C:\Users\frost\AppData\Local\Programs\Python\Python311\python.exe",
    [string]$ServerPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama\server.py",
    [string]$WorkingDir = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama",
    [string]$LogBaseDir = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs"
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    exit 1
}

Write-Host "Creating $InstanceCount Flask instance services..." -ForegroundColor Green
Write-Host ""

# Verify paths
if (-not (Test-Path $PythonPath)) {
    Write-Host "ERROR: Python not found: $PythonPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ServerPath)) {
    Write-Host "ERROR: Server file not found: $ServerPath" -ForegroundColor Red
    exit 1
}

# Create log directory
if (-not (Test-Path $LogBaseDir)) {
    New-Item -ItemType Directory -Path $LogBaseDir -Force | Out-Null
}

# Check if NSSM is available
$nssmPath = Get-Command nssm.exe -ErrorAction SilentlyContinue
if (-not $nssmPath) {
    Write-Host "ERROR: nssm.exe not found in PATH" -ForegroundColor Red
    exit 1
}

$createdServices = @()

for ($i = 0; $i -lt $InstanceCount; $i++) {
    $port = $StartPort + $i
    $serviceName = "$BaseServiceName-$port"
    $logPath = Join-Path $LogBaseDir "flask-$port.log"
    
    Write-Host "Creating service: $serviceName (port $port)..." -ForegroundColor Cyan
    
    # Check if service already exists
    $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Host "  Service already exists. Removing..." -ForegroundColor Yellow
        Stop-Service -Name $serviceName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        & nssm.exe remove $serviceName confirm
        Start-Sleep -Seconds 1
    }
    
    # Install service
    & nssm.exe install $serviceName $PythonPath $ServerPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Failed to install service" -ForegroundColor Red
        continue
    }
    
    # Configure service
    & nssm.exe set $serviceName AppDirectory $WorkingDir
    & nssm.exe set $serviceName AppStdout $logPath
    & nssm.exe set $serviceName AppStderr $logPath
    & nssm.exe set $serviceName AppRotateFiles 1
    & nssm.exe set $serviceName AppRotateOnline 1
    & nssm.exe set $serviceName AppRotateSeconds 86400
    & nssm.exe set $serviceName AppRotateBytes 10485760
    & nssm.exe set $serviceName AppRestartDelay 10000
    & nssm.exe set $serviceName AppExit Default Restart
    & nssm.exe set $serviceName Description "VOFC Flask Instance on Port $port"
    & nssm.exe set $serviceName Start SERVICE_AUTO_START
    
    # Set environment variable for port
    & nssm.exe set $serviceName AppEnvironmentExtra "SERVER_PORT=$port"
    
    $createdServices += @{
        Name = $serviceName
        Port = $port
        LogPath = $logPath
    }
    
    Write-Host "  Service created successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "Services created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Created services:" -ForegroundColor Cyan
foreach ($svc in $createdServices) {
    Write-Host "  - $($svc.Name) (Port $($svc.Port))" -ForegroundColor White
}

Write-Host ""
Write-Host "To start all services:" -ForegroundColor Cyan
foreach ($svc in $createdServices) {
    Write-Host "  nssm start $($svc.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "To stop all services:" -ForegroundColor Cyan
foreach ($svc in $createdServices) {
    Write-Host "  nssm stop $($svc.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start all services using the commands above" -ForegroundColor White
Write-Host "2. Configure Nginx to load balance between ports $StartPort-$($StartPort + $InstanceCount - 1)" -ForegroundColor White
Write-Host "3. Update Cloudflare tunnel to point to Nginx (port 8080)" -ForegroundColor White
Write-Host ""
Write-Host "See LOAD_BALANCING_GUIDE.md for Nginx configuration details" -ForegroundColor Cyan
Write-Host ""

