# ========================================
# VOFC Processing System - Stop All Services
# ========================================

Write-Host ""
Write-Host "Stopping VOFC Processing Services..." -ForegroundColor Yellow
Write-Host ""

# Stop Flask servers (Python processes - we'll check port 5000)
$flaskProcesses = @()
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port5000) {
    $pids = $port5000 | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -eq 'python') {
            $flaskProcesses += $proc
        }
    }
}

if ($flaskProcesses) {
    Write-Host "Stopping Flask servers..." -ForegroundColor Yellow
    foreach ($proc in $flaskProcesses) {
        Write-Host "  Stopping PID: $($proc.Id)" -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  Done." -ForegroundColor Green
} else {
    Write-Host "No Flask servers found running" -ForegroundColor Gray
}

# Stop service monitor and all monitored services (Node.js processes)
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Stopping service monitor and monitored services..." -ForegroundColor Yellow
    foreach ($proc in $nodeProcesses) {
        # Check if it's the service monitor or file watcher
        $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
        if ($commandLine -and ($commandLine -like '*service-monitor*' -or $commandLine -like '*file-watcher*')) {
            Write-Host "  Stopping PID: $($proc.Id) ($($proc.ProcessName))" -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "  Done." -ForegroundColor Green
} else {
    Write-Host "No service monitor or file watcher found running" -ForegroundColor Gray
}


Write-Host ""
Write-Host "All services stopped!" -ForegroundColor Green
Write-Host ""

