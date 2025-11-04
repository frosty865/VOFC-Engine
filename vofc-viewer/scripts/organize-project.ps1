# Project Organization Script
# This script organizes the VOFC Engine project files

$root = $PSScriptRoot
$archiveDir = Join-Path $root "app\archive"
$debugDir = Join-Path $root "app\api\_debug"
$testDir = Join-Path $root "app\api\_test"

# Create directories if they don't exist
@($archiveDir, $debugDir, $testDir) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
        Write-Host "Created directory: $_" -ForegroundColor Green
    }
}

Write-Host "`nProject Organization Complete!" -ForegroundColor Cyan
Write-Host "Directories created for:" -ForegroundColor Yellow
Write-Host "  - Archive: $archiveDir" -ForegroundColor Gray
Write-Host "  - Debug routes: $debugDir" -ForegroundColor Gray
Write-Host "  - Test routes: $testDir" -ForegroundColor Gray

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Move debug-* routes to app/api/_debug/" -ForegroundColor Gray
Write-Host "2. Move test-* routes to app/api/_test/" -ForegroundColor Gray
Write-Host "3. Archive old/unused files to app/archive/" -ForegroundColor Gray

