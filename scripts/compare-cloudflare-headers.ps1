# Compare Cloudflare Headers Between Flask and Ollama
# This helps identify if Cloudflare is applying different rules

Write-Host "=== Cloudflare Header Comparison ===" -ForegroundColor Cyan
Write-Host ""

# Test Flask (working)
Write-Host "Flask Headers (WORKING):" -ForegroundColor Green
Write-Host "----------------------" -ForegroundColor Gray
try {
    $flaskResponse = Invoke-WebRequest -Uri "https://flask.frostech.site/api/system/health" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "Status: $($flaskResponse.StatusCode)" -ForegroundColor White
    Write-Host "Server: $($flaskResponse.Headers['Server'])" -ForegroundColor White
    Write-Host "CF-Ray: $($flaskResponse.Headers['CF-Ray'])" -ForegroundColor White
    Write-Host "CF-Cache-Status: $($flaskResponse.Headers['CF-Cache-Status'])" -ForegroundColor White
    if ($flaskResponse.Headers['CF-WAF-Message']) {
        Write-Host "CF-WAF-Message: $($flaskResponse.Headers['CF-WAF-Message'])" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test Ollama (403)
Write-Host "Ollama Headers (403 ERROR):" -ForegroundColor Red
Write-Host "---------------------------" -ForegroundColor Gray
try {
    $ollamaResponse = Invoke-WebRequest -Uri "https://ollama.frostech.site/api/tags" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "Status: $($ollamaResponse.StatusCode)" -ForegroundColor White
} catch {
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "Status: $statusCode" -ForegroundColor Red
        Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
        
        # Try to get response headers
        try {
            $response = $_.Exception.Response
            Write-Host "Server: $($response.Headers['Server'])" -ForegroundColor White
            Write-Host "CF-Ray: $($response.Headers['CF-Ray'])" -ForegroundColor White
            if ($response.Headers['CF-WAF-Message']) {
                Write-Host "CF-WAF-Message: $($response.Headers['CF-WAF-Message'])" -ForegroundColor Yellow
            }
            if ($response.Headers['CF-Error']) {
                Write-Host "CF-Error: $($response.Headers['CF-Error'])" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Could not read response headers" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Check Cloudflare Dashboard → Security → WAF → Custom Rules" -ForegroundColor White
Write-Host "2. Check Security → WAF → Firewall Rules" -ForegroundColor White
Write-Host "3. Compare settings between flask.frostech.site and ollama.frostech.site" -ForegroundColor White
Write-Host ""

