# Simple Fix for Flask Service

## The Problem

Path has spaces: `C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\...`
Python sees: `C:\Users\frost\OneDrive\Desktop\Projects\VOFC` (truncated at space)

## Solution Options

### Option 1: Use 8.3 Short Path (Recommended)

Run as Administrator:

```powershell
.\fix-nssm-with-shortpath.ps1
```

This converts the path to 8.3 format (no spaces) like:
`C:\Users\frost\OneDrive\Desktop\PROJEC~1\VOFC~1\vofc-v~1\ollama\server.py`

### Option 2: Manual NSSM Fix

Run as Administrator:

```powershell
$nssm = "C:\Users\frost\Downloads\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe"
$path = "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\server.py"

# Get short path
$fso = New-Object -ComObject Scripting.FileSystemObject
$file = $fso.GetFile($path)
$shortPath = $file.ShortPath

# Stop service
Stop-Service VOFC-Flask -Force

# Update with short path
& $nssm set VOFC-Flask AppParameters $shortPath

# Start service
Start-Service VOFC-Flask
```

### Option 3: Use Wrapper Script

Create a batch file wrapper that handles the path, then point NSSM to the wrapper instead.

## Quick Test

After fixing, check:
```powershell
Get-Service VOFC-Flask
curl http://127.0.0.1:5000/api/system/health
```

