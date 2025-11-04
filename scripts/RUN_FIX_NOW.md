# Run Flask Service Fix - Step by Step

## Quick Steps

1. **Close this PowerShell window**

2. **Open PowerShell as Administrator:**
   - Press `Win + X`
   - Click "Windows PowerShell (Admin)" or "Terminal (Admin)"
   - OR Right-click PowerShell → "Run as Administrator"

3. **Navigate to scripts folder:**
   ```powershell
   cd "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\scripts"
   ```

4. **Run the fix script:**
   ```powershell
   .\fix-flask-service-quotes.ps1
   ```

5. **The script will:**
   - Stop the service
   - Fix the path quoting issue
   - Restart the service
   - Test Flask endpoint

## What It Fixes

- **Root Cause:** Path with spaces ("VOFC Engine") not properly quoted
- **Error:** `python.exe: can't find '__main__' module in 'C:\\...\\VOFC'`
- **Solution:** Properly quote the server.py path in NSSM

## Expected Result

After running:
- ✅ Service Status: **Running** (not Paused)
- ✅ Flask accessible at: http://127.0.0.1:5000
- ✅ Service survives reboots

