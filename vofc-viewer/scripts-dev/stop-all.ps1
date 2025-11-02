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

# Stop file watchers (Node.js processes)
# We'll stop all node processes that might be the watcher
$watcherProcesses = Get-Process node -ErrorAction SilentlyContinue

if ($watcherProcesses) {
    Write-Host "Stopping file watchers..." -ForegroundColor Yellow
    foreach ($proc in $watcherProcesses) {
        Write-Host "  Stopping PID: $($proc.Id)" -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  Done." -ForegroundColor Green
} else {
    Write-Host "No file watchers found running" -ForegroundColor Gray
}


Write-Host ""
Write-Host "All services stopped!" -ForegroundColor Green
Write-Host ""

