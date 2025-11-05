# ==============================================
# 🚀 VOFC ENGINE FULL MODEL + FRONTEND SETUP TOOL
# ==============================================
# Configures and validates:
#   • Ollama models (vofc-engine, mistral, llama3, nomic-embed-text)
#   • Flask backend env
#   • Next.js frontend .env.local
#   • Flask proxy rewrite in next.config.mjs
#   • Model + API health checks (JSON summary)
# Cursor will auto-fill missing env vars from workspace context.

# --- Detect root ---
$ProjectRoot = (Get-Location).Path
if (-not (Test-Path "$ProjectRoot\vofc-viewer")) {
    Write-Host "❌ Run this from the VOFC Engine root directory." -ForegroundColor Red
    exit 1
}

$FlaskDir = "$ProjectRoot\vofc-viewer\ollama"
$FrontendDir = "$ProjectRoot\vofc-viewer"

# --- Environment setup ---
$OllamaEnv = @"
# OLLAMA MODEL CONFIGURATION
OLLAMA_URL=${env:OLLAMA_URL:-http://localhost:11434}
OLLAMA_MODEL=vofc-engine:latest
OLLAMA_MODEL_SECONDARY=mistral:latest
OLLAMA_MODEL_TERTIARY=llama3:latest
OLLAMA_EMBED_MODEL=nomic-embed-text:latest
OLLAMA_FALLBACK_MODE=sequential
"@

$OllamaEnv | Out-File "$FlaskDir\.env" -Encoding utf8

$FrontendEnv = @"
# FRONTEND CONFIGURATION
NEXT_PUBLIC_SUPABASE_URL=${env:NEXT_PUBLIC_SUPABASE_URL:-https://your-supabase-url.supabase.co}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${env:NEXT_PUBLIC_SUPABASE_ANON_KEY:-your-anon-key}
NEXT_PUBLIC_FLASK_API_URL=${env:NEXT_PUBLIC_FLASK_API_URL:-http://localhost:8080}
NEXT_PUBLIC_OLLAMA_URL=${env:NEXT_PUBLIC_OLLAMA_URL:-http://localhost:11434}
NEXT_PUBLIC_OLLAMA_MODEL=vofc-engine:latest
NEXT_PUBLIC_OLLAMA_EMBED_MODEL=nomic-embed-text:latest
NEXT_PUBLIC_SECONDARY_MODEL=mistral:latest
NEXT_PUBLIC_TERTIARY_MODEL=llama3:latest
"@

$FrontendEnv | Out-File "$FrontendDir\.env.local" -Encoding utf8

Write-Host "✅ Environment files created/updated" -ForegroundColor Green

# --- Patch Next.js proxy if needed ---
$NextConfig = "$FrontendDir\next.config.mjs"
if (Test-Path $NextConfig) {
    $content = Get-Content $NextConfig -Raw
    if ($content -match 'flask\.frostech\.site') {
        $content = $content -replace 'flask\.frostech\.site', 'localhost:8080'
        Set-Content $NextConfig -Value $content -Encoding utf8
        Write-Host "✅ Patched Next.js proxy (localhost:8080)" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Next.js proxy already configured" -ForegroundColor Gray
    }
}

# --- Ensure Ollama service is running ---
$ollamaRunning = Get-Process ollama -ErrorAction SilentlyContinue
if (-not $ollamaRunning) {
    Write-Host "🔄 Starting Ollama service..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "ollama serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
} else {
    Write-Host "✅ Ollama service is running" -ForegroundColor Green
}

# --- Verify required models ---
$Models = @("vofc-engine:latest", "mistral:latest", "llama3:latest", "nomic-embed-text:latest")
$ModelStatus = @()

Write-Host "`n🔍 Checking Ollama models..." -ForegroundColor Cyan

foreach ($m in $Models) {
    try {
        $check = curl.exe -s "http://localhost:11434/api/tags" | ConvertFrom-Json
        $exists = $check.models | Where-Object { $_.name -eq $m }
        
        if (-not $exists) {
            Write-Host "📦 Pulling missing model: $m" -ForegroundColor Yellow
            & ollama pull $m
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ $m pulled successfully" -ForegroundColor Green
                $ModelStatus += [PSCustomObject]@{ model = $m; loaded = $true; pulled = $true }
            } else {
                Write-Host "  ❌ Failed to pull $m" -ForegroundColor Red
                $ModelStatus += [PSCustomObject]@{ model = $m; loaded = $false; pulled = $false }
            }
        } else {
            Write-Host "  ✅ $m is available" -ForegroundColor Green
            $ModelStatus += [PSCustomObject]@{ model = $m; loaded = $true; pulled = $false }
        }
        
        # Health check: try to generate a response
        try {
            $healthCheck = @{
                model = $m
                prompt = "test"
                stream = $false
            } | ConvertTo-Json | curl.exe -s -X POST "http://localhost:11434/api/generate" -H "Content-Type: application/json" -d '@-'
            
            if ($healthCheck) {
                $ModelStatus[-1] | Add-Member -NotePropertyName "responding" -NotePropertyValue $true -Force
            } else {
                $ModelStatus[-1] | Add-Member -NotePropertyName "responding" -NotePropertyValue $false -Force
            }
        } catch {
            $ModelStatus[-1] | Add-Member -NotePropertyName "responding" -NotePropertyValue $false -Force
        }
    } catch {
        Write-Host "  ❌ Error checking $m : $_" -ForegroundColor Red
        $ModelStatus += [PSCustomObject]@{ model = $m; loaded = $false; pulled = $false; responding = $false }
    }
}

# --- Check Flask service status ---
Write-Host "`n🔄 Checking Flask service (VOFC-Flask)..." -ForegroundColor Cyan

$flaskService = Get-Service -Name "VOFC-Flask" -ErrorAction SilentlyContinue
if ($flaskService) {
    if ($flaskService.Status -ne "Running") {
        Write-Host "⚠️  Flask service is not running. Starting..." -ForegroundColor Yellow
        Start-Service -Name "VOFC-Flask" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
    Write-Host "✅ Flask service status: $($flaskService.Status)" -ForegroundColor Green
} else {
    Write-Host "⚠️  VOFC-Flask service not found. Flask should be running as Windows service." -ForegroundColor Yellow
}

# --- Health checks ---
$ApiResults = @()
$Checks = @(
    @{ name="Flask System Health"; url="http://localhost:8080/api/system/health" },
    @{ name="Flask Document Processor"; url="http://localhost:8080/api/files/list" }
)

Write-Host "`n🔍 Checking API endpoints..." -ForegroundColor Cyan

foreach ($check in $Checks) {
    try {
        $res = Invoke-WebRequest -Uri $check.url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $status = $res.StatusCode
        $ok = $status -eq 200
        Write-Host "  ✅ $($check.name): $status" -ForegroundColor $(if ($ok) { "Green" } else { "Yellow" })
        $ApiResults += [PSCustomObject]@{ endpoint = $check.name; status = $status; ok = $ok }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "  ❌ $($check.name): ERROR - $errorMsg" -ForegroundColor Red
        $ApiResults += [PSCustomObject]@{ endpoint = $check.name; status = "ERROR"; ok = $false; error = $errorMsg }
    }
}

# --- Output JSON summary (Cursor readable) ---
$Summary = [PSCustomObject]@{
    timestamp = (Get-Date).ToString("s")
    project_path = $ProjectRoot
    models = $ModelStatus
    apis = $ApiResults
    setup_complete = ($ModelStatus | Where-Object { $_.loaded -eq $true }).Count -eq $Models.Count
}

$SummaryJson = $Summary | ConvertTo-Json -Depth 4
$SummaryJson | Out-File "$ProjectRoot\vofc_health_summary.json" -Encoding utf8

Write-Host "`n===============================" -ForegroundColor Cyan
Write-Host "✅ SETUP COMPLETE" -ForegroundColor Green
Write-Host "Summary saved to vofc_health_summary.json" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Cyan
Write-Host $SummaryJson

# Return exit code based on setup success
if ($Summary.setup_complete -and ($ApiResults | Where-Object { $_.ok -eq $true }).Count -gt 0) {
    exit 0
} else {
    Write-Host "`n⚠️  Setup completed with warnings. Check vofc_health_summary.json for details." -ForegroundColor Yellow
    exit 1
}

