# Comprehensive Tunnel Diagnostics Script
# Checks Flask, Ollama, and Cloudflare Tunnel status

Write-Host "=== VOFC Tunnel Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check local services
Write-Host "1. Checking Local Services..." -ForegroundColor Yellow
Write-Host ""

# Flask
Write-Host "   Flask (localhost:5000):" -ForegroundColor Cyan
try {
    $flaskResponse = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/system/health" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✓ Flask is running and responding" -ForegroundColor Green
    Write-Host "   Status Code: $($flaskResponse.StatusCode)" -ForegroundColor White
    $flaskData = $flaskResponse.Content | ConvertFrom-Json
    Write-Host "   Response: $($flaskData | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Flask is NOT responding: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Ollama
Write-Host "   Ollama (localhost:11434):" -ForegroundColor Cyan
try {
    $ollamaResponse = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✓ Ollama is running and responding" -ForegroundColor Green
    Write-Host "   Status Code: $($ollamaResponse.StatusCode)" -ForegroundColor White
} catch {
    Write-Host "   ✗ Ollama is NOT responding: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 2. Check tunnel processes
Write-Host "2. Checking Cloudflare Tunnel Processes..." -ForegroundColor Yellow
Write-Host ""
$tunnelProcesses = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($tunnelProcesses) {
    Write-Host "   ✓ Found $($tunnelProcesses.Count) cloudflared process(es)" -ForegroundColor Green
    foreach ($proc in $tunnelProcesses) {
        Write-Host "   Process ID: $($proc.Id), Started: $($proc.StartTime)" -ForegroundColor White
    }
} else {
    Write-Host "   ✗ No cloudflared processes found" -ForegroundColor Red
}
Write-Host ""

# 3. Check tunnel configuration
Write-Host "3. Checking Tunnel Configuration..." -ForegroundColor Yellow
Write-Host ""
$configPath = "C:\Users\frost\cloudflared\config.yml"
if (Test-Path $configPath) {
    Write-Host "   ✓ Config file found: $configPath" -ForegroundColor Green
    $config = Get-Content $configPath
    Write-Host "   Configuration:" -ForegroundColor Cyan
    $config | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "   ✗ Config file not found: $configPath" -ForegroundColor Red
}
Write-Host ""

# 4. Test tunnel endpoints
Write-Host "4. Testing Tunnel Endpoints..." -ForegroundColor Yellow
Write-Host ""

# Flask tunnel
Write-Host "   Flask Tunnel (https://flask.frostech.site):" -ForegroundColor Cyan
try {
    $flaskTunnelResponse = Invoke-WebRequest -Uri "https://flask.frostech.site/api/system/health" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✓ Flask tunnel is working" -ForegroundColor Green
    Write-Host "   Status Code: $($flaskTunnelResponse.StatusCode)" -ForegroundColor White
    $tunnelData = $flaskTunnelResponse.Content | ConvertFrom-Json
    Write-Host "   Response: $($tunnelData | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Flask tunnel is NOT working: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Message -like "*timeout*") {
        Write-Host "   → Tunnel may be down or not routing correctly" -ForegroundColor Yellow
    }
}
Write-Host ""

# Ollama tunnel
Write-Host "   Ollama Tunnel (https://ollama.frostech.site):" -ForegroundColor Cyan
try {
    $ollamaTunnelResponse = Invoke-WebRequest -Uri "https://ollama.frostech.site/api/tags" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✓ Ollama tunnel is working" -ForegroundColor Green
    Write-Host "   Status Code: $($ollamaTunnelResponse.StatusCode)" -ForegroundColor White
    if ($ollamaTunnelResponse.Content) {
        Write-Host "   Response: $($ollamaTunnelResponse.Content.Substring(0, [Math]::Min(100, $ollamaTunnelResponse.Content.Length)))" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Ollama tunnel is NOT working: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Message -like "*timeout*") {
        Write-Host "   → Tunnel may be down or not routing correctly" -ForegroundColor Yellow
    }
}
Write-Host ""

# 5. Check port bindings
Write-Host "5. Checking Port Bindings..." -ForegroundColor Yellow
Write-Host ""
$port5000 = netstat -an | Select-String ":5000" | Select-String "LISTENING"
$port11434 = netstat -an | Select-String ":11434" | Select-String "LISTENING"

if ($port5000) {
    Write-Host "   ✓ Port 5000 is listening" -ForegroundColor Green
    Write-Host "   $port5000" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Port 5000 is NOT listening" -ForegroundColor Red
}

if ($port11434) {
    Write-Host "   ✓ Port 11434 is listening" -ForegroundColor Green
    Write-Host "   $port11434" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Port 11434 is NOT listening" -ForegroundColor Red
}
Write-Host ""

# 6. Summary and recommendations
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""

$issues = @()
if (-not $flaskResponse) { $issues += "Flask not responding locally" }
if (-not $ollamaResponse) { $issues += "Ollama not responding locally" }
if (-not $tunnelProcesses) { $issues += "No cloudflared processes running" }
if (-not $flaskTunnelResponse) { $issues += "Flask tunnel not accessible" }
if (-not $ollamaTunnelResponse) { $issues += "Ollama tunnel not accessible" }

if ($issues.Count -eq 0) {
    Write-Host "✓ All services and tunnels are working correctly!" -ForegroundColor Green
} else {
    Write-Host "✗ Issues found:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Recommendations:" -ForegroundColor Cyan
    if (-not $tunnelProcesses) {
        Write-Host "  1. Start Cloudflare tunnel:" -ForegroundColor White
        Write-Host "     cloudflared tunnel --config C:\Users\frost\cloudflared\config.yml run" -ForegroundColor Gray
    }
    if (-not $flaskResponse) {
        Write-Host "  2. Start Flask server:" -ForegroundColor White
        Write-Host "     cd vofc-viewer\vofc-viewer\ollama && python server.py" -ForegroundColor Gray
    }
    if (-not $ollamaResponse) {
        Write-Host "  3. Start Ollama server:" -ForegroundColor White
        Write-Host "     ollama serve" -ForegroundColor Gray
    }
}

Write-Host ""

