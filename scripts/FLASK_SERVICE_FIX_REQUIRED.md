# Flask Service - What Needs to Happen

## Current Status

✅ **Flask is working** - Responding on http://127.0.0.1:5000  
⚠️ **Service is paused** - VOFC-Flask service status: `Paused`  
⚠️ **Flask running manually** - Not managed by Windows service

## The Problem

The VOFC-Flask Windows service is installed but in a **Paused** state. Flask is currently running from a manual process, which means:
- ❌ Flask will stop if the process is terminated
- ❌ Flask won't auto-start on system reboot
- ❌ Service management is not working

## What Needs to Happen

The service needs to be **restarted as Administrator** to properly manage Flask.

### Option 1: Quick Fix (Run as Administrator)

```powershell
# Open PowerShell as Administrator, then run:
Stop-Service -Name "VOFC-Flask" -Force
Start-Service -Name "VOFC-Flask"
Get-Service -Name "VOFC-Flask"
```

### Option 2: Use NSSM Directly (Run as Administrator)

```powershell
# Using NSSM
C:\Tools\nssm\nssm.exe stop VOFC-Flask
C:\Tools\nssm\nssm.exe start VOFC-Flask
C:\Tools\nssm\nssm.exe status VOFC-Flask
```

### Option 3: Use Fix Script (Run as Administrator)

```powershell
# Run the fix script
cd "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine"
.\scripts\fix-flask-service.ps1
```

## Service Configuration

The service is properly configured:
- **Application**: `.venv\Scripts\python.exe` ✅
- **Parameters**: `-m waitress --listen=127.0.0.1:5000 vofc-viewer.vofc-viewer.ollama.server:app` ✅
- **Working Directory**: `vofc-viewer\vofc-viewer\ollama` ✅
- **Startup Type**: Automatic ✅
- **Waitress**: Installed in venv ✅

## Why It's Paused

Possible reasons:
1. Service was manually paused
2. Service encountered an error and NSSM paused it
3. Permission issue during startup
4. Configuration conflict

## Verification

After restarting the service, verify it's working:

```powershell
# Check service status
Get-Service -Name "VOFC-Flask"

# Test Flask endpoint
curl http://127.0.0.1:5000/api/system/health

# Check logs
Get-Content "logs\flask_out.log" -Tail 50
```

## Expected Result

After fixing:
- ✅ Service status: **Running**
- ✅ Flask responds on http://127.0.0.1:5000
- ✅ Flask auto-starts on system boot
- ✅ Flask auto-restarts on crashes
- ✅ Proper service management

## Summary

**Action Required**: Run one of the fix options above **as Administrator** to restart the paused service and ensure Flask runs properly as a Windows service.

