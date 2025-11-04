# Test Tunnel Routing Configuration
# This helps identify if the tunnel is routing correctly

Write-Host "=== Tunnel Routing Test ===" -ForegroundColor Cyan
Write-Host ""

# Test local services directly
Write-Host "1. Testing Local Services:" -ForegroundColor Yellow
Write-Host ""

Write-Host "   Flask (localhost:5000):" -ForegroundColor Cyan
try {
    $flaskLocal = Invoke-WebRequest -Uri "http://localhost:5000/api/system/health" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "   [OK] Status: $($flaskLocal.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "   Ollama (localhost:11434):" -ForegroundColor Cyan
try {
    $ollamaLocal = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "   [OK] Status: $($ollamaLocal.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test through tunnels
Write-Host "2. Testing Through Tunnels:" -ForegroundColor Yellow
Write-Host ""

Write-Host "   Flask (https://flask.frostech.site):" -ForegroundColor Cyan
try {
    $flaskTunnel = Invoke-WebRequest -Uri "https://flask.frostech.site/api/system/health" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "   [OK] Status: $($flaskTunnel.StatusCode)" -ForegroundColor Green
    Write-Host "   CF-Ray: $($flaskTunnel.Headers['CF-Ray'])" -ForegroundColor Gray
} catch {
    Write-Host "   [FAIL] Status: $($_.Exception.Response.StatusCode.value__) - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "   Ollama (https://ollama.frostech.site):" -ForegroundColor Cyan
try {
    $ollamaTunnel = Invoke-WebRequest -Uri "https://ollama.frostech.site/api/tags" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "   [OK] Status: $($ollamaTunnel.StatusCode)" -ForegroundColor Green
    Write-Host "   CF-Ray: $($ollamaTunnel.Headers['CF-Ray'])" -ForegroundColor Gray
} catch {
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "Unknown" }
    Write-Host "   [FAIL] Status: $statusCode - $($_.Exception.Message)" -ForegroundColor Red
    
    # Check if it's a Cloudflare error
    if ($_.Exception.Response) {
        $cfRay = $_.Exception.Response.Headers['CF-Ray']
        if ($cfRay) {
            Write-Host "   CF-Ray: $cfRay" -ForegroundColor Gray
            Write-Host "   → This is a Cloudflare error (CF-Ray present)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# Check tunnel config
Write-Host "3. Tunnel Configuration:" -ForegroundColor Yellow
Write-Host ""
$configPath = "C:\Users\frost\cloudflared\config.yml"
if (Test-Path $configPath) {
    Write-Host "   Config file: $configPath" -ForegroundColor Green
    $config = Get-Content $configPath
    Write-Host "   Ingress rules:" -ForegroundColor Cyan
    foreach ($line in $config) {
        if ($line -match 'hostname:|service:') {
            Write-Host "     $line" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   [WARNING] Config file not found: $configPath" -ForegroundColor Yellow
}

Write-Host ""

# Diagnosis
Write-Host "=== Diagnosis ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If local services work but tunnel doesn't:" -ForegroundColor Yellow
Write-Host "  → Check Cloudflare Dashboard → Zero Trust → Tunnels" -ForegroundColor White
Write-Host "  → Verify tunnel is active and routing correctly" -ForegroundColor White
Write-Host ""
Write-Host "If 403 from Cloudflare:" -ForegroundColor Yellow
Write-Host "  → Check Security → Bots → Bot Fight Mode" -ForegroundColor White
Write-Host "  → Check Rules → Transform Rules" -ForegroundColor White
Write-Host "  → Check if there's a default protection policy" -ForegroundColor White
Write-Host ""

