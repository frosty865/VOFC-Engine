# Restart Cloudflare Tunnel with Updated Config
# This script restarts the tunnel after config changes

param(
    [string]$ConfigPath = "C:\Users\frost\cloudflared\config.yml"
)

Write-Host "Restarting Cloudflare Tunnel..." -ForegroundColor Green
Write-Host ""

# Find cloudflared from running processes
$cloudflaredExe = $null
$processes = Get-Process -Name cloudflared -ErrorAction SilentlyContinue

if ($processes) {
    Write-Host "Finding cloudflared.exe..." -ForegroundColor Yellow
    foreach ($proc in $processes) {
        try {
            if ($proc.MainModule -and $proc.MainModule.FileName -and (Test-Path $proc.MainModule.FileName)) {
                $cloudflaredExe = $proc.MainModule.FileName
                Write-Host "  Found: $cloudflaredExe" -ForegroundColor Green
                break
            }
        } catch {
            # Try other methods
            if ($proc.Path -and (Test-Path $proc.Path)) {
                $cloudflaredExe = $proc.Path
                Write-Host "  Found: $cloudflaredExe" -ForegroundColor Green
                break
            }
        }
    }
}

# If not found, try common locations
if (-not $cloudflaredExe) {
    $paths = @(
        "C:\Program Files\Cloudflare\Cloudflare Tunnel\cloudflared.exe",
        "C:\Program Files (x86)\Cloudflare\Cloudflare Tunnel\cloudflared.exe",
        "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"
    )
    foreach ($path in $paths) {
        if (Test-Path $path) {
            $cloudflaredExe = $path
            break
        }
    }
}

if (-not $cloudflaredExe) {
    Write-Host "ERROR: cloudflared.exe not found" -ForegroundColor Red
    Write-Host "Please specify the path to cloudflared.exe manually" -ForegroundColor Yellow
    exit 1
}

# Read tunnel ID
$configContent = Get-Content $ConfigPath -Raw
$tunnelId = $null
if ($configContent -match 'tunnel:\s*([a-f0-9-]+)') {
    $tunnelId = $matches[1]
}

# Stop existing processes
Write-Host ""
Write-Host "Stopping existing tunnel processes..." -ForegroundColor Yellow
if ($processes) {
    foreach ($proc in $processes) {
        Write-Host "  Stopping PID: $($proc.Id)" -ForegroundColor Cyan
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
    Write-Host "  [OK] All processes stopped" -ForegroundColor Green
}

# Start tunnel
Write-Host ""
Write-Host "Starting tunnel..." -ForegroundColor Yellow
if ($tunnelId) {
    Write-Host "  Tunnel ID: $tunnelId" -ForegroundColor Cyan
    Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "--config", $ConfigPath, "run", $tunnelId -WindowStyle Hidden
} else {
    Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "--config", $ConfigPath, "run" -WindowStyle Hidden
}

Start-Sleep -Seconds 5

# Verify
$newProcesses = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($newProcesses) {
    Write-Host "  [OK] Tunnel started (PID: $($newProcesses[0].Id))" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Tunnel process may not have started" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Waiting 10 seconds for tunnel to establish..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test endpoints
Write-Host ""
Write-Host "Testing endpoints..." -ForegroundColor Yellow
Write-Host ""

try {
    $flask = Invoke-WebRequest -Uri "https://flask.frostech.site/api/system/health" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Flask: $($flask.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Flask: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $ollama = Invoke-WebRequest -Uri "https://ollama.frostech.site/api/tags" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Ollama: $($ollama.StatusCode)" -ForegroundColor Green
} catch {
    $status = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "Unknown" }
    Write-Host "[FAIL] Ollama: Status $status - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Tunnel restart completed!" -ForegroundColor Green

