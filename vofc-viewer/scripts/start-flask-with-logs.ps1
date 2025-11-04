# Start Flask/FastAPI Server with Visible Log Window
# This script starts the server in a visible console window so you can see logs

$ollamaDir = "C:\Users\frost\AppData\Local\Ollama"
$python = (Get-Command python).Source

Write-Host "🚀 Starting FastAPI Server with visible logs...`n" -ForegroundColor Cyan

# Change to the Ollama directory
Set-Location $ollamaDir

# Check if server is already running
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/status" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "⚠️ Server is already running on port 8000" -ForegroundColor Yellow
    Write-Host "   Service: $($response.service)" -ForegroundColor Gray
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "`nTo view logs, use: .\scripts\view-flask-logs.ps1" -ForegroundColor Cyan
    exit
} catch {
    # Server not running, proceed to start it
}

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
try {
    python -c "import fastapi, uvicorn, numpy, supabase" 2>$null
    Write-Host "✅ Dependencies OK" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Installing missing dependencies..." -ForegroundColor Yellow
    python -m pip install -r requirements.txt
}

# Start the server in a visible window
Write-Host "`n🌐 Starting server on http://localhost:8000`n" -ForegroundColor Cyan
Write-Host "A new window will open showing server logs." -ForegroundColor Yellow
Write-Host "Keep this window open to see all server activity.`n" -ForegroundColor Yellow

# Start in a new PowerShell window so logs are visible
$scriptBlock = {
    cd "C:\Users\frost\AppData\Local\Ollama"
    Write-Host "🚀 VOFC FastAPI Backend Server`n" -ForegroundColor Cyan
    Write-Host "Server starting on http://localhost:8000" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow
    Write-Host "=" * 60 -ForegroundColor Gray
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", $scriptBlock.ToString()

Write-Host "✅ Server window opened!" -ForegroundColor Green
Write-Host "`n💡 Tips:" -ForegroundColor Cyan
Write-Host "  - Logs are visible in the new window" -ForegroundColor Gray
Write-Host "  - File logs: C:\Users\frost\AppData\Local\Ollama\logs\" -ForegroundColor Gray
Write-Host "  - API Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "  - Status: http://localhost:8000/status" -ForegroundColor Gray

