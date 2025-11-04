# Setup Windows Task Scheduler for Cloudflare Tunnel Monitoring
# Run this script as Administrator

param(
    [string]$TaskName = "VOFC-TunnelMonitor",
    [string]$ScriptPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\scripts\check-tunnel.ps1",
    [int]$IntervalMinutes = 5
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Setting up Windows Task Scheduler task for tunnel monitoring..." -ForegroundColor Green
Write-Host "Task Name: $TaskName" -ForegroundColor Cyan
Write-Host "Script: $ScriptPath" -ForegroundColor Cyan
Write-Host "Interval: Every $IntervalMinutes minutes" -ForegroundColor Cyan
Write-Host ""

# Verify script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "ERROR: Script not found: $ScriptPath" -ForegroundColor Red
    exit 1
}

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create action
$action = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$ScriptPath`""

# Create trigger (every N minutes)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 365)

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Create principal (run as current user)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Register the task
Write-Host "Registering scheduled task..." -ForegroundColor Green
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Monitors Cloudflare Tunnel health and restarts if needed" | Out-Null

Write-Host ""
Write-Host "Task scheduled successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Task will run every $IntervalMinutes minutes" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view the task:" -ForegroundColor Cyan
Write-Host "  Get-ScheduledTask -TaskName $TaskName" -ForegroundColor White
Write-Host ""
Write-Host "To run the task manually:" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName $TaskName" -ForegroundColor White
Write-Host ""
Write-Host "To remove the task:" -ForegroundColor Cyan
Write-Host "  Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false" -ForegroundColor White
Write-Host ""

