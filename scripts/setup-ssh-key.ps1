# Setup SSH Key for Ollama Server Access
# This script adds the provided SSH public key to authorized_keys for secure remote access

param(
    [string]$SshKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOLMnmJfu3hBOmLWnPXDT3jCKbTFEWiRvFh8gX8qofCd",
    [string]$KeyLabel = "ollama-key",
    [string]$AuthorizedKeysPath = "$env:USERPROFILE\.ssh\authorized_keys"
)

Write-Host "Setting up SSH key for Ollama server access..." -ForegroundColor Green
Write-Host ""

# Ensure .ssh directory exists
$sshDir = Split-Path $AuthorizedKeysPath -Parent
if (-not (Test-Path $sshDir)) {
    Write-Host "Creating .ssh directory: $sshDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
    
    # Set proper permissions (Windows)
    $acl = Get-Acl $sshDir
    $acl.SetAccessRuleProtection($true, $false)
    $permission = "$env:USERNAME","FullControl","Allow"
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
    $acl.SetAccessRule($accessRule)
    Set-Acl $sshDir $acl
}

# Check if key already exists
$existingKeys = @()
if (Test-Path $AuthorizedKeysPath) {
    $existingKeys = Get-Content $AuthorizedKeysPath -ErrorAction SilentlyContinue
    $keyExists = $existingKeys | Where-Object { $_ -match [regex]::Escape($SshKey) }
    
    if ($keyExists) {
        Write-Host "SSH key already exists in authorized_keys" -ForegroundColor Yellow
        Write-Host "Key found: $($keyExists[0])" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "No changes made." -ForegroundColor Green
        exit 0
    }
}

# Add key to authorized_keys
Write-Host "Adding SSH key to authorized_keys..." -ForegroundColor Green
Write-Host "Key label: $KeyLabel" -ForegroundColor Cyan
Write-Host "Key: $($SshKey.Substring(0, 50))..." -ForegroundColor Cyan
Write-Host ""

# Format: label key-data
$keyEntry = "# $KeyLabel - Added $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n$SshKey"

if (Test-Path $AuthorizedKeysPath) {
    # Append to existing file
    Add-Content -Path $AuthorizedKeysPath -Value "`n$keyEntry"
    Write-Host "Key appended to existing authorized_keys file" -ForegroundColor Green
} else {
    # Create new file
    Set-Content -Path $AuthorizedKeysPath -Value $keyEntry
    Write-Host "Created new authorized_keys file" -ForegroundColor Green
}

# Set proper file permissions (Windows)
try {
    $acl = Get-Acl $AuthorizedKeysPath
    $acl.SetAccessRuleProtection($true, $false)
    $permission = "$env:USERNAME","FullControl","Allow"
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
    $acl.SetAccessRule($accessRule)
    Set-Acl $AuthorizedKeysPath $acl
    Write-Host "Set file permissions" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Could not set file permissions: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "SSH key setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Authorized keys file: $AuthorizedKeysPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure SSH server is running (OpenSSH Server on Windows)" -ForegroundColor White
Write-Host "2. Test SSH connection: ssh $env:USERNAME@localhost" -ForegroundColor White
Write-Host "3. For remote access, configure firewall rules if needed" -ForegroundColor White
Write-Host ""
Write-Host "To check SSH server status:" -ForegroundColor Cyan
Write-Host "  Get-Service sshd" -ForegroundColor White
Write-Host ""
Write-Host "To start SSH server (if not running):" -ForegroundColor Cyan
Write-Host "  Start-Service sshd" -ForegroundColor White
Write-Host "  Set-Service -Name sshd -StartupType 'Automatic'" -ForegroundColor White
Write-Host ""


