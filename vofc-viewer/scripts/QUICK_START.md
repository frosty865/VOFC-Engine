# Quick Start - View Flask/FastAPI Server Logs

## ✅ Server is Running

The FastAPI server should now be running with a visible log window.

## 📋 Ways to View Logs

### Option 1: PowerShell Window (Recommended)
A PowerShell window should be open showing live server logs. Look for a window with:
- Title showing PowerShell
- Output like: `INFO: Uvicorn running on http://0.0.0.0:8000`
- Real-time request logs

### Option 2: View Log Files Directly
```powershell
# View recent logs
Get-Content "C:\Users\frost\AppData\Local\Ollama\logs\server.log" -Tail 50

# View processing logs
Get-Content "C:\Users\frost\AppData\Local\Ollama\logs\processing.log" -Tail 50

# Open log folder
explorer.exe "C:\Users\frost\AppData\Local\Ollama\logs"
```

### Option 3: Use the Log Viewer Script
```powershell
cd "vofc-viewer"
.\scripts\view-flask-logs.ps1
```

### Option 4: Watch Logs Live
```powershell
cd "vofc-viewer"
.\scripts\view-live-logs.ps1
```

## 🔍 Log Locations

- **Server logs:** `C:\Users\frost\AppData\Local\Ollama\logs\server.log`
- **Processing logs:** `C:\Users\frost\AppData\Local\Ollama\logs\processing.log`
- **System logs:** `C:\Users\frost\AppData\Local\Ollama\logs\system.log`
- **Error logs:** `C:\Users\frost\AppData\Local\Ollama\logs\error.log`

## 🚀 Restart Server with Visible Logs

If you need to restart the server with a visible log window:

```powershell
cd "vofc-viewer"
.\scripts\start-flask-with-logs.ps1
```

This will:
1. Stop any running server
2. Install/check dependencies
3. Start server in a visible PowerShell window

## ✅ Verify Server is Running

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/status"
```

You should see:
```json
{
  "service": "vofc-backend",
  "status": "ok"
}
```

