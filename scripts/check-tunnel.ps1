# Cloudflare Tunnel Health Monitoring Script
# This script checks if the tunnel is running and restarts it if needed
# Schedule this via Windows Task Scheduler to run every 5 minutes

param(
    [string]$TunnelName = "ollama-tunnel",
    [string]$ConfigPath = "C:\Users\frost\cloudflared\config.yml",
    [string]$LogPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\tunnel-monitor.log",
    [int]$MaxRestartAttempts = 3
)

# Ensure log directory exists
$logDir = Split-Path $LogPath -Parent
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogPath -Value $logMessage
    if ($Level -eq "ERROR") {
        Write-Host $logMessage -ForegroundColor Red
    } elseif ($Level -eq "WARNING") {
        Write-Host $logMessage -ForegroundColor Yellow
    } else {
        Write-Host $logMessage -ForegroundColor Green
    }
}

# Check if cloudflared is available
$cloudflared = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    Write-Log "ERROR: cloudflared.exe not found in PATH. Please install Cloudflare Tunnel." "ERROR"
    exit 1
}

Write-Log "Checking tunnel status: $TunnelName"

try {
    # Check tunnel status
    $tunnelList = & cloudflared.exe tunnel list 2>&1
    $tunnelStatus = $tunnelList | Select-String -Pattern $TunnelName
    
    if ($null -eq $tunnelStatus) {
        Write-Log "Tunnel '$TunnelName' not found in tunnel list" "WARNING"
        
        # Try to start the tunnel
        Write-Log "Attempting to start tunnel: $TunnelName"
        
        if (-not (Test-Path $ConfigPath)) {
            Write-Log "ERROR: Config file not found: $ConfigPath" "ERROR"
            exit 1
        }
        
        # Start tunnel in background
        Start-Process -FilePath "cloudflared.exe" -ArgumentList "tunnel", "--config", $ConfigPath, "run", $TunnelName -WindowStyle Hidden
        
        Start-Sleep -Seconds 5
        
        # Verify tunnel started
        $tunnelListAfter = & cloudflared.exe tunnel list 2>&1
        $tunnelStatusAfter = $tunnelListAfter | Select-String -Pattern $TunnelName
        
        if ($null -ne $tunnelStatusAfter) {
            Write-Log "Tunnel started successfully" "INFO"
        } else {
            Write-Log "WARNING: Tunnel may still be starting. Will check again on next run." "WARNING"
        }
    } else {
        # Check if tunnel is active
        if ($tunnelStatus -match "4x active" -or $tunnelStatus -match "active") {
            Write-Log "Tunnel is active and running" "INFO"
        } else {
            Write-Log "Tunnel exists but may not be fully active: $tunnelStatus" "WARNING"
            
            # Optional: Check if Flask is responding through the tunnel
            $flaskUrl = "https://flask.frostech.site/api/system/health"
            try {
                $response = Invoke-WebRequest -Uri $flaskUrl -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Log "Flask endpoint is responding through tunnel" "INFO"
                } else {
                    Write-Log "Flask endpoint returned status: $($response.StatusCode)" "WARNING"
                }
            } catch {
                Write-Log "WARNING: Could not reach Flask through tunnel: $($_.Exception.Message)" "WARNING"
            }
        }
    }
} catch {
    Write-Log "ERROR: Failed to check tunnel status: $($_.Exception.Message)" "ERROR"
    exit 1
}

Write-Log "Tunnel check completed"

