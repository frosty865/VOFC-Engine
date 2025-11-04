# Restart Cloudflare Tunnels Script
# Run as Administrator

param(
    [string]$ConfigPath = "C:\Users\frost\cloudflared\config.yml"
)

Write-Host "Restarting Cloudflare Tunnels..." -ForegroundColor Green
Write-Host ""

# Find cloudflared executable from running processes first (BEFORE stopping them)
$cloudflaredExe = $null
$processes = Get-Process -Name cloudflared -ErrorAction SilentlyContinue

if ($processes) {
    Write-Host "Finding cloudflared.exe from running processes..." -ForegroundColor Yellow
    foreach ($proc in $processes) {
        # Try MainModule.FileName (most reliable, but requires elevated permissions sometimes)
        try {
            if ($proc.MainModule -and $proc.MainModule.FileName -and (Test-Path $proc.MainModule.FileName)) {
                $cloudflaredExe = $proc.MainModule.FileName
                Write-Host "  Found: $cloudflaredExe" -ForegroundColor Green
                break
            }
        } catch {
            # MainModule access may require elevation, continue to next method
        }
        # Try direct Path property (PowerShell 5.1+)
        if ($proc.Path -and (Test-Path $proc.Path)) {
            $cloudflaredExe = $proc.Path
            Write-Host "  Found: $cloudflaredExe" -ForegroundColor Green
            break
        }
        # Try WMI
        try {
            $procInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue
            if ($procInfo -and $procInfo.Path -and (Test-Path $procInfo.Path)) {
                $cloudflaredExe = $procInfo.Path
                Write-Host "  Found: $cloudflaredExe" -ForegroundColor Green
                break
            }
        } catch {
            # Try CIM
            try {
                $procPath = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").Path
                if ($procPath -and (Test-Path $procPath)) {
                    $cloudflaredExe = $procPath
                    Write-Host "  Found: $cloudflaredExe" -ForegroundColor Green
                    break
                }
            } catch {
                continue
            }
        }
    }
}

# If not found from processes, try common locations
if (-not $cloudflaredExe) {
    Write-Host "Searching common installation paths..." -ForegroundColor Yellow
    $cloudflaredPaths = @(
        "C:\Program Files\Cloudflare\Cloudflare Tunnel\cloudflared.exe",
        "C:\Program Files (x86)\Cloudflare\Cloudflare Tunnel\cloudflared.exe",
        "$env:LOCALAPPDATA\cloudflared\cloudflared.exe",
        "$env:USERPROFILE\AppData\Local\cloudflared\cloudflared.exe",
        "$env:ProgramFiles\cloudflared\cloudflared.exe",
        "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe"
    )

    foreach ($path in $cloudflaredPaths) {
        if (Test-Path $path) {
            $cloudflaredExe = $path
            Write-Host "  Found: $cloudflaredExe" -ForegroundColor Green
            break
        }
    }
}

# Also check PATH
if (-not $cloudflaredExe) {
    $cloudflaredCmd = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
    if ($cloudflaredCmd) {
        $cloudflaredExe = $cloudflaredCmd.Source
        Write-Host "  Found in PATH: $cloudflaredExe" -ForegroundColor Green
    }
}

# Stop existing cloudflared processes
Write-Host ""
Write-Host "Stopping existing tunnel processes..." -ForegroundColor Yellow
if ($processes) {
    foreach ($proc in $processes) {
        Write-Host "  Stopping process $($proc.Id)..." -ForegroundColor Cyan
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
        Write-Host "  [OK] All tunnel processes stopped" -ForegroundColor Green
} else {
    Write-Host "  No existing tunnel processes found" -ForegroundColor Gray
}
Write-Host ""

# Verify config exists
if (-not (Test-Path $ConfigPath)) {
    Write-Host "ERROR: Config file not found: $ConfigPath" -ForegroundColor Red
    exit 1
}

if (-not $cloudflaredExe) {
    Write-Host "ERROR: cloudflared.exe not found" -ForegroundColor Red
    Write-Host "Please install Cloudflare Tunnel or add it to PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found cloudflared at: $cloudflaredExe" -ForegroundColor Green
Write-Host ""

# Read tunnel ID from config
$configContent = Get-Content $ConfigPath -Raw
$tunnelIdMatch = $null
if ($configContent -match 'tunnel:\s*([a-f0-9-]+)') {
    $tunnelIdMatch = $matches[1]
}

if ($tunnelIdMatch) {
    Write-Host "Tunnel ID: $tunnelIdMatch" -ForegroundColor Cyan
    Write-Host ""
    
    # Start tunnel using tunnel ID
    Write-Host "Starting tunnel..." -ForegroundColor Yellow
    Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "--config", $ConfigPath, "run", $tunnelIdMatch -WindowStyle Hidden
    
    Start-Sleep -Seconds 5
    
    # Verify tunnel started
    $newProcesses = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
    if ($newProcesses) {
        Write-Host "[OK] Tunnel process started (PID: $($newProcesses[0].Id))" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Tunnel process may not have started" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING: Could not extract tunnel ID from config" -ForegroundColor Yellow
    Write-Host "Starting tunnel with config file..." -ForegroundColor Yellow
    Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "--config", $ConfigPath, "run" -WindowStyle Hidden
}

Write-Host ""
Write-Host "Waiting 10 seconds for tunnel to establish..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test endpoints
Write-Host ""
Write-Host "Testing endpoints..." -ForegroundColor Yellow
Write-Host ""

# Test Flask
try {
    $flaskTest = Invoke-WebRequest -Uri "https://flask.frostech.site/api/system/health" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Flask tunnel: Working (Status: $($flaskTest.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Flask tunnel: NOT working - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Ollama
try {
    $ollamaTest = Invoke-WebRequest -Uri "https://ollama.frostech.site/api/tags" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Ollama tunnel: Working (Status: $($ollamaTest.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Ollama tunnel: NOT working - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq 403) {
        Write-Host "  → HTTP 403: This may be a Cloudflare Access issue" -ForegroundColor Yellow
        Write-Host "  → Check Cloudflare Dashboard → Zero Trust → Access" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Tunnel restart completed!" -ForegroundColor Green
