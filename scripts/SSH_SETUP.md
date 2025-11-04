# SSH Key Setup for Ollama Server Access

This guide explains how to configure SSH key authentication for secure remote access to your Ollama server.

## Quick Setup

Run the setup script:

```powershell
.\scripts\setup-ssh-key.ps1
```

This will automatically:
- Create `.ssh` directory if it doesn't exist
- Add the SSH public key to `authorized_keys`
- Set proper file permissions
- Verify the key is added correctly

## SSH Key Details

**Key Type:** ED25519 (modern, secure key type)

**Key Label:** `ollama-key`

**Public Key:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOLMnmJfu3hBOmLWnPXDT3jCKbTFEWiRvFh8gX8qofCd
```

## Manual Setup

If you prefer to set it up manually:

1. **Create `.ssh` directory** (if it doesn't exist):
   ```powershell
   New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" -Force
   ```

2. **Add key to authorized_keys**:
   ```powershell
   Add-Content -Path "$env:USERPROFILE\.ssh\authorized_keys" -Value "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOLMnmJfu3hBOmLWnPXDT3jCKbTFEWiRvFh8gX8qofCd"
   ```

3. **Set permissions**:
   ```powershell
   icacls "$env:USERPROFILE\.ssh\authorized_keys" /inheritance:r /grant "$env:USERNAME:(F)"
   ```

## Enable SSH Server on Windows

### Check if SSH Server is installed:

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'
```

### Install SSH Server (if not installed):

```powershell
# Install OpenSSH Server
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# Start SSH service
Start-Service sshd

# Set SSH service to start automatically
Set-Service -Name sshd -StartupType 'Automatic'

# Configure firewall rule
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

## Testing SSH Connection

### From local machine:

```powershell
ssh $env:USERNAME@localhost
```

### From remote machine:

```powershell
ssh username@your-server-ip
```

Or if using a domain:

```powershell
ssh username@your-domain.com
```

## Security Best Practices

1. **Disable password authentication** (use key-only):
   ```powershell
   # Edit C:\ProgramData\ssh\sshd_config
   # Set: PasswordAuthentication no
   # Set: PubkeyAuthentication yes
   # Then restart: Restart-Service sshd
   ```

2. **Use strong key types**: ✅ ED25519 (already using this)

3. **Limit access**: Only add keys from trusted sources

4. **Monitor access**: Check SSH logs regularly:
   ```powershell
   Get-Content C:\ProgramData\ssh\logs\sshd.log -Tail 50
   ```

5. **Keep keys secure**: 
   - Private key should never leave your machine
   - Public key is safe to share (that's what we're adding)

## Troubleshooting

### SSH Connection Refused

1. Check if SSH service is running:
   ```powershell
   Get-Service sshd
   ```

2. Check firewall rules:
   ```powershell
   Get-NetFirewallRule -Name sshd
   ```

3. Check if port 22 is listening:
   ```powershell
   netstat -an | Select-String ":22"
   ```

### Permission Denied

1. Check authorized_keys permissions:
   ```powershell
   icacls "$env:USERPROFILE\.ssh\authorized_keys"
   ```

2. Verify key is in authorized_keys:
   ```powershell
   Get-Content "$env:USERPROFILE\.ssh\authorized_keys"
   ```

3. Check SSH server logs:
   ```powershell
   Get-Content C:\ProgramData\ssh\logs\sshd.log -Tail 50
   ```

### Key Not Working

1. Verify key format (should be single line):
   ```powershell
   Get-Content "$env:USERPROFILE\.ssh\authorized_keys" | Select-String "ssh-ed25519"
   ```

2. Ensure no extra characters or line breaks

3. Test with verbose output:
   ```powershell
   ssh -v username@hostname
   ```

## Integration with Ollama Services

This SSH key can be used for:

1. **Remote Server Management** - Secure access to manage Ollama server
2. **Automated Deployments** - CI/CD pipelines can use this key
3. **Monitoring Scripts** - Remote health checks and maintenance
4. **Backup Operations** - Secure file transfers

## File Locations

- **Authorized Keys:** `C:\Users\{username}\.ssh\authorized_keys`
- **SSH Config:** `C:\ProgramData\ssh\sshd_config`
- **SSH Logs:** `C:\ProgramData\ssh\logs\sshd.log`
- **Private Key (client):** `C:\Users\{username}\.ssh\id_ed25519` (keep this secure!)

## Additional Resources

- [OpenSSH for Windows](https://github.com/PowerShell/Win32-OpenSSH)
- [SSH Key Best Practices](https://www.ssh.com/academy/ssh/key)
- [Windows SSH Server Configuration](https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_server_configuration)


