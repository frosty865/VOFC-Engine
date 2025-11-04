# View Flask/FastAPI Server Logs
# This script shows the server logs and optionally opens the log directory

param(
    [switch]$Follow,
    [switch]$OpenFolder
)

$logDir = "C:\Users\frost\AppData\Local\Ollama\logs"
$serverLog = Join-Path $logDir "server.log"
$processingLog = Join-Path $logDir "processing.log"

Write-Host "`n📋 VOFC Backend Logs`n" -ForegroundColor Cyan

if ($OpenFolder) {
    if (Test-Path $logDir) {
        explorer.exe $logDir
        Write-Host "✅ Opened log directory" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Log directory not found: $logDir" -ForegroundColor Yellow
    }
    exit
}

# Check if server is running
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/status" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server Status: Running" -ForegroundColor Green
    Write-Host "   Service: $($response.service)" -ForegroundColor Gray
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Server Status: Not responding" -ForegroundColor Yellow
}

Write-Host "`n📄 Recent Log Entries:`n" -ForegroundColor Cyan

# Show server log
if (Test-Path $serverLog) {
    Write-Host "=== server.log ===" -ForegroundColor Yellow
    if ($Follow) {
        Get-Content $serverLog -Wait -Tail 50
    } else {
        Get-Content $serverLog -Tail 50
    }
} else {
    Write-Host "⚠️ server.log not found" -ForegroundColor Yellow
}

Write-Host "`n"

# Show processing log
if (Test-Path $processingLog) {
    Write-Host "=== processing.log ===" -ForegroundColor Yellow
    if ($Follow) {
        Get-Content $processingLog -Wait -Tail 50
    } else {
        Get-Content $processingLog -Tail 50
    }
} else {
    Write-Host "⚠️ processing.log not found" -ForegroundColor Yellow
}

Write-Host "`n💡 Tips:" -ForegroundColor Cyan
Write-Host "  - Use -Follow to watch logs in real-time" -ForegroundColor Gray
Write-Host "  - Use -OpenFolder to open the log directory" -ForegroundColor Gray
Write-Host "  - Log directory: $logDir" -ForegroundColor Gray

