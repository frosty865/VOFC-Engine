# How to Start VOFC-Flask Service

## Current Status

✅ **PYTHONPATH is configured** - Set correctly in NSSM  
⚠️ **Service is Paused** - Needs Administrator privileges to start  
✅ **Flask is working** - Responding on port 5000 (manual process)

## The Issue

The service requires **Administrator privileges** to start. The logs show Flask dev server output, which suggests waitress might not be starting properly, or the service is falling back to Flask dev server.

## Solution: Start Service as Administrator

### Option 1: PowerShell as Administrator

1. **Right-click PowerShell** and select **"Run as Administrator"**
2. Run these commands:

```powershell
cd "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine"

# Stop the service (if needed)
Stop-Service -Name "VOFC-Flask" -Force

# Start the service
Start-Service -Name "VOFC-Flask"

# Verify it's running
Get-Service -Name "VOFC-Flask"

# Test Flask
curl http://127.0.0.1:5000/api/system/health
```

### Option 2: Use NSSM GUI (No Admin needed)

If you have NSSM GUI access:

```powershell
C:\Tools\nssm\nssm.exe edit VOFC-Flask
```

Then click "Start service" in the GUI.

### Option 3: Run Fix Script (Recommended)

```powershell
# Run PowerShell as Administrator
cd "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine"
.\scripts\fix-flask-service-waitress.ps1
```

## Verify Waitress is Running

After starting the service, check the logs to confirm waitress is being used:

```powershell
Get-Content "logs\flask_out.log" -Tail 20 | Select-String -Pattern "waitress|Serving on"
```

If you see "Serving on http://127.0.0.1:5000" from waitress, it's working correctly.

If you see "Serving Flask app" with "Debug mode: on", it means waitress failed and Flask dev server started instead.

## Troubleshooting

### If Service Still Won't Start

1. Check Windows Event Viewer for errors:
   ```powershell
   Get-EventLog -LogName Application -Source "NSSM" -Newest 10
   ```

2. Verify PYTHONPATH is set:
   ```powershell
   C:\Tools\nssm\nssm.exe get VOFC-Flask AppEnvironmentExtra
   ```

3. Test waitress command manually:
   ```powershell
   cd "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama"
   $env:PYTHONPATH = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer"
   & "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\.venv\Scripts\python.exe" -m waitress --listen=127.0.0.1:5000 vofc-viewer.vofc-viewer.ollama.server:app
   ```

## Expected Result

After starting as Administrator:
- ✅ Service status: **Running**
- ✅ Flask responds on http://127.0.0.1:5000
- ✅ Waitress is serving (not Flask dev server)
- ✅ Service auto-starts on boot
- ✅ Service auto-restarts on crashes

