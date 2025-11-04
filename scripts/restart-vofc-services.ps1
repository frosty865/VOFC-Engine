# Restart VOFC Services Script
# Restarts all VOFC-related Windows services

param(
    [switch]$RestartTunnel = $false,
    [switch]$RestartAll = $false,
    [switch]$StatusOnly = $false
)

$services = @(
    "VOFC-Tunnel",
    "VOFC-Flask", 
    "VOFC-Ollama"
)

Write-Host "=== VOFC Services Management ===" -ForegroundColor Cyan
Write-Host ""

if ($StatusOnly) {
    Write-Host "Current Status:" -ForegroundColor Yellow
    Write-Host ""
    foreach ($svcName in $services) {
        $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
        if ($svc) {
            $statusColor = if ($svc.Status -eq "Running") { "Green" } else { "Red" }
            Write-Host "  $svcName: " -NoNewline -ForegroundColor White
            Write-Host $svc.Status -ForegroundColor $statusColor
            Write-Host "    Startup: $($svc.StartType)" -ForegroundColor Gray
        } else {
            Write-Host "  $svcName: " -NoNewline -ForegroundColor White
            Write-Host "NOT FOUND" -ForegroundColor Yellow
        }
    }
    exit 0
}

if ($RestartAll) {
    Write-Host "Restarting all VOFC services..." -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($svcName in $services) {
        $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
        if ($svc) {
            Write-Host "Restarting $svcName..." -ForegroundColor Cyan
            try {
                Restart-Service -Name $svcName -Force -ErrorAction Stop
                Start-Sleep -Seconds 2
                $svc = Get-Service -Name $svcName
                if ($svc.Status -eq "Running") {
                    Write-Host "  [OK] $svcName is running" -ForegroundColor Green
                } else {
                    Write-Host "  [WARNING] $svcName status: $($svc.Status)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  [ERROR] Failed to restart $svcName : $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  [SKIP] $svcName not found" -ForegroundColor Yellow
        }
    }
} elseif ($RestartTunnel) {
    Write-Host "Restarting VOFC-Tunnel service..." -ForegroundColor Yellow
    Write-Host ""
    
    $svc = Get-Service -Name "VOFC-Tunnel" -ErrorAction SilentlyContinue
    if ($svc) {
        try {
            Restart-Service -Name "VOFC-Tunnel" -Force -ErrorAction Stop
            Start-Sleep -Seconds 5
            $svc = Get-Service -Name "VOFC-Tunnel"
            if ($svc.Status -eq "Running") {
                Write-Host "[OK] VOFC-Tunnel restarted successfully" -ForegroundColor Green
            } else {
                Write-Host "[WARNING] VOFC-Tunnel status: $($svc.Status)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "[ERROR] Failed to restart: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "[ERROR] VOFC-Tunnel service not found" -ForegroundColor Red
    }
} else {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\restart-vofc-services.ps1 -StatusOnly     # Show status" -ForegroundColor White
    Write-Host "  .\restart-vofc-services.ps1 -RestartTunnel # Restart tunnel only" -ForegroundColor White
    Write-Host "  .\restart-vofc-services.ps1 -RestartAll    # Restart all services" -ForegroundColor White
    Write-Host ""
    Write-Host "Current Status:" -ForegroundColor Cyan
    foreach ($svcName in $services) {
        $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
        if ($svc) {
            $statusColor = if ($svc.Status -eq "Running") { "Green" } else { "Red" }
            Write-Host "  $svcName: $($svc.Status)" -ForegroundColor $statusColor
        } else {
            Write-Host "  $svcName: NOT FOUND" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

