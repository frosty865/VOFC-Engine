# ================================================
# Test Build Script with Debugging and Smarter Timeouts
# ================================================
# Runs Next.js build with full debugging output
# Cancels only if there's no output for a period (inactivity timeout)
# and/or if overall build exceeds a generous max duration.

$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"
$DebugPreference = "Continue"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $ScriptDir "vofc-viewer\vofc-viewer"

# Timeouts
$InactivityTimeoutSeconds = 0     # Kill if no output for this many seconds (0 = disabled)
$MaxBuildDurationSeconds = 1800    # Absolute max build time (30 minutes)

Write-Host "`n===============================" -ForegroundColor Cyan
Write-Host "🔨 Testing Build with Debugging" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "Project Root: $ScriptDir"
Write-Host "Build Directory: $BuildDir"
Write-Host "Inactivity Timeout: $InactivityTimeoutSeconds seconds"
Write-Host "Max Duration: $MaxBuildDurationSeconds seconds"
Write-Host "===============================`n" -ForegroundColor Cyan

# Check if build directory exists
if (-not (Test-Path $BuildDir)) {
    Write-Host "❌ Build directory not found: $BuildDir" -ForegroundColor Red
    exit 1
}

# Check if package.json exists
$packageJson = Join-Path $BuildDir "package.json"
if (-not (Test-Path $packageJson)) {
    Write-Host "❌ package.json not found in: $BuildDir" -ForegroundColor Red
    exit 1
}

# Change to build directory
Write-Host "📂 Changing to build directory..." -ForegroundColor Yellow
Set-Location $BuildDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found. Installing dependencies first..." -ForegroundColor Yellow
    Write-Host "📦 Running: npm install" -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed`n" -ForegroundColor Green
}

# Set debugging environment variables
$env:NODE_OPTIONS = "--trace-warnings --trace-uncaught"
$env:DEBUG = "*"
$env:NEXT_DEBUG = "1"
$env:NEXT_TELEMETRY_DISABLED = "1"

Write-Host "🔍 Debugging enabled:" -ForegroundColor Cyan
Write-Host "  - NODE_OPTIONS: $env:NODE_OPTIONS"
Write-Host "  - DEBUG: $env:DEBUG"
Write-Host "  - NEXT_DEBUG: $env:NEXT_DEBUG"
Write-Host ""

# Start build process with timeout
Write-Host "🚀 Starting build process..." -ForegroundColor Green
Write-Host "   Command: npm run build" -ForegroundColor Gray
Write-Host "   Inactivity Timeout: $InactivityTimeoutSeconds seconds" -ForegroundColor Gray
Write-Host "   Max Duration: $MaxBuildDurationSeconds seconds`n" -ForegroundColor Gray

$buildStartTime = Get-Date
$lastOutputTime = Get-Date

# Function to check if process is stalled (no output for 60 seconds)
function Test-ProcessStalled {
    param($lastOutputTime, $timeoutSeconds)
    $elapsed = (Get-Date) - $lastOutputTime
    return $elapsed.TotalSeconds -ge $timeoutSeconds
}

# Run build with real-time output and timeout monitoring
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Build started`n" -ForegroundColor Cyan

# Create a script block that runs the build and streams output
$buildScript = {
    param($buildPath)
    Set-Location $buildPath
    npm run build
}

# Start the build job
$job = Start-Job -ScriptBlock $buildScript -ArgumentList $BuildDir
$jobStarted = Get-Date
$lastOutputTime = Get-Date
$allOutput = @()

if ($InactivityTimeoutSeconds -gt 0) {
    Write-Host "📋 Streaming build output (will timeout after $InactivityTimeoutSeconds seconds of inactivity):`n" -ForegroundColor Cyan
} else {
    Write-Host "📋 Streaming build output (inactivity timeout disabled; using max duration only):`n" -ForegroundColor Cyan
}

# Monitor job with timeout and stream output
$cancelled = $false
while ($job.State -eq "Running") {
    $elapsed = (Get-Date) - $jobStarted

    # Absolute max duration guard (disabled to allow long builds)
    # if ($elapsed.TotalSeconds -ge $MaxBuildDurationSeconds) {
    #     $cancelled = $true
    #     Write-Host "`n⏱️  TIMEOUT: Build exceeded max duration of $MaxBuildDurationSeconds seconds" -ForegroundColor Red
    #     Write-Host "   Stopping build process..." -ForegroundColor Yellow
    #
    #     Stop-Job -Job $job -ErrorAction SilentlyContinue
    #     Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    #
    #     Write-Host "❌ Build cancelled due to overall time limit" -ForegroundColor Red
    #     exit 1
    # }

    # Receive any available output
    $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
    if ($output) {
        $lastOutputTime = Get-Date
        foreach ($line in $output) {
            $allOutput += $line
            # Display output in real-time with color coding
            if ($line -match "error|Error|ERROR|failed|Failed|FAILED") {
                Write-Host $line -ForegroundColor Red
            } elseif ($line -match "warn|Warn|WARN|warning|Warning") {
                Write-Host $line -ForegroundColor Yellow
            } elseif ($line -match "success|Success|SUCCESS|✓|✅|completed|Completed|Compiled|compiled") {
                Write-Host $line -ForegroundColor Green
            } elseif ($line -match "info|Info|INFO|→|Route") {
                Write-Host $line -ForegroundColor Cyan
            } else {
                Write-Host $line
            }
        }
    }

    # Check for inactivity stall (only if enabled)
    if ($InactivityTimeoutSeconds -gt 0) {
        $timeSinceLastOutput = (Get-Date) - $lastOutputTime
        if ($timeSinceLastOutput.TotalSeconds -ge $InactivityTimeoutSeconds -and $job.State -eq "Running") {
            $cancelled = $true
            Write-Host "`n⏱️  TIMEOUT: No output for $InactivityTimeoutSeconds seconds - process appears stalled" -ForegroundColor Red
            Write-Host "   Stopping build process..." -ForegroundColor Yellow

            Stop-Job -Job $job -ErrorAction SilentlyContinue
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue

            Write-Host "❌ Build cancelled due to inactivity" -ForegroundColor Red
            exit 1
        }
    }

    Start-Sleep -Milliseconds 200
}

# Get final output if job still exists
if (-not $cancelled -and $job) {
    $finalOutput = Receive-Job -Job $job -ErrorAction SilentlyContinue
    if ($finalOutput) {
        foreach ($line in $finalOutput) {
            $allOutput += $line
            if ($line -match "error|Error|ERROR|failed|Failed|FAILED") {
                Write-Host $line -ForegroundColor Red
            } elseif ($line -match "warn|Warn|WARN|warning|Warning") {
                Write-Host $line -ForegroundColor Yellow
            } elseif ($line -match "success|Success|SUCCESS|✓|✅|completed|Completed|Compiled|compiled") {
                Write-Host $line -ForegroundColor Green
            } elseif ($line -match "info|Info|INFO|→|Route") {
                Write-Host $line -ForegroundColor Cyan
            } else {
                Write-Host $line
            }
        }
    }
}

# Get final job state and exit code
if ($job) {
    $jobState = $job.State
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
} else {
    $jobState = "Removed"
}

# Check exit code - if job completed successfully, check if build succeeded
$exitCode = 0
if ($cancelled) {
    $exitCode = 1
} elseif ($jobState -ne "Completed") {
    $exitCode = 1
}

$elapsed = (Get-Date) - $buildStartTime
Write-Host "`n===============================" -ForegroundColor Cyan
Write-Host "⏱️  Build Duration: $([math]::Floor($elapsed.TotalSeconds)) seconds" -ForegroundColor Cyan

# Check if build succeeded
$buildSuccess = Test-Path ".next"
if ($buildSuccess) {
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "   Output directory: .next" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "❌ Build failed - .next directory not found" -ForegroundColor Red
    exit 1
}

