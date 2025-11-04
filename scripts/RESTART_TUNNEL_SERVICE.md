# Restart VOFC-Tunnel Service

## Current Status
- ✅ VOFC-Tunnel: Running (Service)
- ✅ VOFC-Flask: Running (Service)
- ✅ VOFC-Ollama: Running (Service)

## Issue
The tunnel config was updated to use `127.0.0.1` instead of `localhost` to fix IPv6/IPv4 binding issues. The tunnel service needs to be restarted to apply the changes.

## Restart Methods

### Method 1: PowerShell as Administrator (Recommended)
1. **Open PowerShell as Administrator:**
   - Right-click PowerShell → "Run as Administrator"
   - Or: Windows Key → type "PowerShell" → Right-click → "Run as administrator"

2. **Restart the service:**
   ```powershell
   Restart-Service -Name "VOFC-Tunnel" -Force
   ```

3. **Verify it restarted:**
   ```powershell
   Get-Service -Name "VOFC-Tunnel"
   ```

4. **Test endpoints (wait 10 seconds after restart):**
   ```powershell
   Start-Sleep -Seconds 10
   curl https://ollama.frostech.site/api/tags
   curl https://flask.frostech.site/api/system/health
   ```

### Method 2: Services GUI
1. Open **Services** (services.msc)
2. Find **VOFC-Tunnel**
3. Right-click → **Restart**
4. Wait 10 seconds
5. Test endpoints

### Method 3: Using the Script (as Administrator)
```powershell
# Run PowerShell as Administrator first
cd "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine"
.\scripts\restart-vofc-services.ps1 -RestartTunnel
```

## What Changed
**Config File:** `C:\Users\frost\cloudflared\config.yml`

**Before:**
```yaml
- hostname: ollama.frostech.site
  service: http://localhost:11434
```

**After:**
```yaml
- hostname: ollama.frostech.site
  service: http://127.0.0.1:11434
```

**Why:** `localhost` can resolve to IPv6 (::1), but the tunnel expects IPv4. Using `127.0.0.1` forces IPv4 binding.

## Expected Result
After restart:
- ✅ Flask: Should still work (200 OK)
- ✅ Ollama: Should work (returns `{"models":[...]}` instead of 503)

## Troubleshooting
If restart fails:
1. Check if you have Administrator privileges
2. Try stopping and starting separately:
   ```powershell
   Stop-Service -Name "VOFC-Tunnel" -Force
   Start-Service -Name "VOFC-Tunnel"
   ```
3. Check service logs:
   ```powershell
   Get-EventLog -LogName Application -Source "VOFC-Tunnel" -Newest 10
   ```

