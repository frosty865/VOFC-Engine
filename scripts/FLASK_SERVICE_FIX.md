# Fix VOFC-Flask Service Issues

## Current Issues

1. **Service Status: Paused** (unusual state)
2. **Python Path: Python313** (not Python311)
3. **No Log File:** Service may not be running properly

## Root Cause

The service is in a "Paused" state, which prevents it from starting. This can happen when:
- Service was manually paused
- Service crashed and NSSM paused it
- Configuration issue prevented startup

## Quick Fix (Using NSSM)

If you have NSSM path available:

```powershell
# Find NSSM
$nssmPath = "C:\Users\frost\Downloads\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe"

# Stop and restart service
& $nssmPath stop VOFC-Flask
Start-Sleep -Seconds 2
& $nssmPath start VOFC-Flask

# Check status
& $nssmPath status VOFC-Flask
```

## Full Fix (Recommended)

Run the fix script as Administrator:

```powershell
# Open PowerShell as Administrator
cd "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine"
.\scripts\fix-flask-service.ps1
```

This script will:
1. ✅ Auto-detect correct Python version (Python313)
2. ✅ Update NSSM configuration
3. ✅ Stop and restart service properly
4. ✅ Test Flask endpoint
5. ✅ Show logs if errors occur

## Manual Fix Steps

### Step 1: Stop Service
```powershell
# As Administrator
Stop-Service -Name "VOFC-Flask" -Force
```

### Step 2: Update NSSM Configuration
```powershell
$nssmPath = "C:\Users\frost\Downloads\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe"

# Verify Python path
$pythonPath = "C:\Users\frost\AppData\Local\Programs\Python\Python313\python.exe"
$serverPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\server.py"
$workingDir = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama"

# Update configuration
& $nssmPath set VOFC-Flask Application $pythonPath
& $nssmPath set VOFC-Flask AppParameters "`"$serverPath`""
& $nssmPath set VOFC-Flask AppDirectory $workingDir
```

### Step 3: Start Service
```powershell
Start-Service -Name "VOFC-Flask"
```

### Step 4: Verify
```powershell
Get-Service -Name "VOFC-Flask"
curl http://127.0.0.1:5000/api/system/health
```

## Using Services GUI

1. Open **Services** (Win+R → `services.msc`)
2. Find **VOFC-Flask**
3. Right-click → **Restart**
4. If it fails, check **Properties** → **Log On** tab
5. Ensure service account has proper permissions

## Check Logs

```powershell
# Check if log file exists
$logPath = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\flask.log"
if (Test-Path $logPath) {
    Get-Content $logPath -Tail 50
} else {
    Write-Host "Log file not found - service may not be running"
}
```

## Expected Result

After fix:
- ✅ Service Status: **Running**
- ✅ Flask accessible at: http://127.0.0.1:5000
- ✅ Health endpoint returns: `{"flask":"online","ollama":"online","supabase":"online"}`

## Troubleshooting

If service still fails:
1. Check Python is installed: `python --version`
2. Verify server.py exists and has no syntax errors
3. Check NSSM event logs: `Get-EventLog -LogName Application -Source "NSSM" -Newest 10`
4. Try running Flask manually: `python server.py` (to see actual errors)

