# Test All Admin Dashboard APIs
# This script tests all API endpoints used by the VOFC Admin Dashboard

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VOFC Admin Dashboard API Health Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$results = @()

# Test function
function Test-API {
    param(
        [string]$Name,
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Headers = @{}
    )
    
    $url = "$baseUrl$Endpoint"
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  URL: $url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $Headers -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $status = $response.StatusCode
        $statusColor = if ($status -eq 200) { "Green" } else { "Yellow" }
        
        Write-Host "  Status: " -NoNewline
        Write-Host "$status" -ForegroundColor $statusColor
        
        $results += [PSCustomObject]@{
            API = $Name
            Endpoint = $Endpoint
            Status = $status
            StatusText = "OK"
            Error = $null
        }
        
        return $true
    } catch {
        $statusColor = "Red"
        $errorMsg = $_.Exception.Message
        
        Write-Host "  Status: " -NoNewline
        Write-Host "ERROR" -ForegroundColor $statusColor
        Write-Host "  Error: $errorMsg" -ForegroundColor Red
        
        $results += [PSCustomObject]@{
            API = $Name
            Endpoint = $Endpoint
            Status = "ERROR"
            StatusText = "Failed"
            Error = $errorMsg
        }
        
        return $false
    }
    Write-Host ""
}

# Test APIs (no auth required)
Write-Host "=== Public APIs (No Auth) ===" -ForegroundColor Cyan
Write-Host ""

Test-API -Name "System Health" -Endpoint "/api/system/health"
Test-API -Name "Flask Progress Proxy" -Endpoint "/api/proxy/flask/progress"
Test-API -Name "Health Check" -Endpoint "/api/health"

# Test APIs (may require auth - these will show 401/403 if not authenticated)
Write-Host ""
Write-Host "=== Protected APIs (May Require Auth) ===" -ForegroundColor Cyan
Write-Host ""

# Try to get auth token from localStorage via browser context (not possible in PowerShell)
# So we'll test these and note if they fail with 401/403
Test-API -Name "Dashboard Overview" -Endpoint "/api/dashboard/overview"
Test-API -Name "Dashboard System" -Endpoint "/api/dashboard/system"
Test-API -Name "Admin Submissions" -Endpoint "/api/admin/submissions"
Test-API -Name "Admin Stats" -Endpoint "/api/admin/stats"
Test-API -Name "Monitor System" -Endpoint "/api/monitor/system"
Test-API -Name "Monitor Processing" -Endpoint "/api/monitor/processing"

# Test Flask proxy endpoints
Write-Host ""
Write-Host "=== Flask Proxy APIs ===" -ForegroundColor Cyan
Write-Host ""

Test-API -Name "Flask Health Proxy" -Endpoint "/api/proxy/flask/health"
Test-API -Name "Flask Process Extracted" -Endpoint "/api/proxy/flask/process-extracted" -Method "POST"
Test-API -Name "Flask Process Pending" -Endpoint "/api/proxy/flask/process-pending" -Method "POST"

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$success = ($results | Where-Object { $_.Status -eq 200 }).Count
$errors = ($results | Where-Object { $_.Status -ne 200 }).Count
$total = $results.Count

Write-Host "Total APIs Tested: $total" -ForegroundColor White
Write-Host "Successful: " -NoNewline
Write-Host "$success" -ForegroundColor Green
Write-Host "Failed/Errors: " -NoNewline
Write-Host "$errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Detailed results
Write-Host "Detailed Results:" -ForegroundColor Cyan
$results | Format-Table -AutoSize

# Export to JSON
$results | ConvertTo-Json -Depth 3 | Out-File "admin-api-test-results.json" -Encoding utf8
Write-Host ""
Write-Host "Results saved to: admin-api-test-results.json" -ForegroundColor Green

