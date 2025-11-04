# ===============================================
# VOFC Engine Autostart & Health Monitor Script
# ===============================================

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = $ScriptDir   # ✅ Instead of Split-Path again
$ollamaExe = "C:\Program Files\Ollama\ollama.exe"
$flaskDir       = Join-Path $ProjectRoot "vofc-viewer\ollama"
$cloudflareExe  = "C:\Users\frost\cloudflared\cloudflared.exe"
$tunnelName     = "ollama-tunnel"
$flaskPort      = 5000
$ollamaPort     = 11434
$pollInterval   = 10

Write-Host "`n===============================" -ForegroundColor Cyan
Write-Host "🚀 Starting VOFC Engine Stack" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "Project Root: $ProjectRoot"
Write-Host "Flask Dir:    $flaskDir`n"

function Wait-ForPort($port, $label, $timeoutSec = 30) {
    Write-Host "⏳ Waiting for $label on port $port..."
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient("localhost", $port)
            if ($tcp.Connected) {
                $tcp.Close()
                Write-Host "✅ $label is online!" -ForegroundColor Green
                return $true
            }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }
    Write-Host "❌ $label failed to start on port $port" -ForegroundColor Red
    return $false
}

function Start-Tunnel {
    if (Test-Path $cloudflareExe) {
        Write-Host "🌐 Launching Cloudflare Tunnel ($tunnelName)..."
        Start-Process -WindowStyle Hidden -FilePath $cloudflareExe -ArgumentList "tunnel run $tunnelName"
    } else {
        Write-Host "⚠️ Cloudflare not found at $cloudflareExe — skipping tunnel." -ForegroundColor Yellow
    }
}

function Start-Ollama {
    Write-Host "🧠 Starting Ollama model server..."
    Start-Process -WindowStyle Hidden -FilePath $ollamaExe -ArgumentList "serve"
    Start-Sleep -Seconds 5
    Wait-ForPort $ollamaPort "Ollama"
}

function Start-Flask {
    Write-Host "🔥 Launching Flask VOFC backend..."
    if (-not (Test-Path $flaskDir)) {
        Write-Host "❌ Flask directory not found at $flaskDir" -ForegroundColor Red
        return
    }
    Set-Location $flaskDir
    Start-Process -FilePath "python" -ArgumentList "server.py"
    Start-Sleep -Seconds 5
    Wait-ForPort $flaskPort "Flask Server"
}

function Check-Health {
    $ollamaHealth = $false
    $flaskHealth = $false
    try {
        $ollamaRes = Invoke-WebRequest -Uri "http://localhost:$ollamaPort/api/tags" -TimeoutSec 5 -ErrorAction Stop
        if ($ollamaRes.StatusCode -eq 200) { $ollamaHealth = $true }
    } catch {}
    try {
        $flaskRes = Invoke-WebRequest -Uri "http://localhost:$flaskPort/api/health" -TimeoutSec 5 -ErrorAction Stop
        if ($flaskRes.StatusCode -eq 200) { $flaskHealth = $true }
    } catch {}
    return @{ Flask = $flaskHealth; Ollama = $ollamaHealth }
}

Start-Tunnel
Start-Ollama
Start-Flask

Write-Host "`n📡 VOFC Engine now live — monitoring every $pollInterval seconds..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor DarkGray

while ($true) {
    $health = Check-Health
    if (-not $health.Ollama) {
        Write-Host "⚠️ Ollama not responding, restarting..." -ForegroundColor Yellow
        Stop-Process -Name "ollama" -ErrorAction SilentlyContinue
        Start-Ollama
    }
    if (-not $health.Flask) {
        Write-Host "⚠️ Flask backend not responding, restarting..." -ForegroundColor Yellow
        Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*python.exe" } | Stop-Process -Force
        Start-Flask
    }
    Start-Sleep -Seconds $pollInterval
}
Start-Process -WindowStyle Normal -FilePath "python.exe" `
  -ArgumentList "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama\ollama_auto_processor.py"


