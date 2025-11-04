# View Live Server Logs
# Shows server logs in real-time

$logDir = "C:\Users\frost\AppData\Local\Ollama\logs"

Write-Host "📋 VOFC Backend - Live Log Viewer`n" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop watching logs`n" -ForegroundColor Yellow

# Check which log files exist
$logs = @(
    @{Name="server.log"; Path=Join-Path $logDir "server.log"},
    @{Name="processing.log"; Path=Join-Path $logDir "processing.log"},
    @{Name="system.log"; Path=Join-Path $logDir "system.log"},
    @{Name="error.log"; Path=Join-Path $logDir "error.log"}
)

$existingLogs = $logs | Where-Object { Test-Path $_.Path }

if ($existingLogs.Count -eq 0) {
    Write-Host "⚠️ No log files found in: $logDir" -ForegroundColor Yellow
    exit
}

Write-Host "Watching log files:`n" -ForegroundColor Cyan
$existingLogs | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
Write-Host ""

# Show recent entries from each log
foreach ($log in $existingLogs) {
    Write-Host "=== $($log.Name) ===" -ForegroundColor Yellow
    if (Test-Path $log.Path) {
        Get-Content $log.Path -Tail 20
        Write-Host ""
    }
}

Write-Host "`nFollowing logs in real-time...`n" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Follow all logs
$watchers = @()
foreach ($log in $existingLogs) {
    if (Test-Path $log.Path) {
        $watcher = New-Object System.IO.FileSystemWatcher
        $watcher.Path = $logDir
        $watcher.Filter = $log.Name
        $watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite
        $watcher.EnableRaisingEvents = $true
        
        Register-ObjectEvent -InputObject $watcher -EventName Changed -Action {
            $content = Get-Content $Event.SourceEventArgs.FullPath -Tail 1
            Write-Host "[$($Event.SourceEventArgs.Name)] $content" -ForegroundColor Cyan
        } | Out-Null
        
        $watchers += $watcher
    }
}

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
        # Also manually check for new lines periodically
        foreach ($log in $existingLogs) {
            if (Test-Path $log.Path) {
                $currentLines = Get-Content $log.Path
                if ($script:lastLines -and $script:lastLines.Count -lt $currentLines.Count) {
                    $newLines = $currentLines[$script:lastLines.Count..($currentLines.Count-1)]
                    foreach ($line in $newLines) {
                        Write-Host "[$($log.Name)] $line" -ForegroundColor Cyan
                    }
                }
                $script:lastLines = $currentLines
            }
        }
    }
} catch {
    Write-Host "`nStopped watching logs." -ForegroundColor Yellow
} finally {
    $watchers | ForEach-Object { $_.Dispose() }
}

