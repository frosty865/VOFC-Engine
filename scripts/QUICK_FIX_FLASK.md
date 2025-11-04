# Quick Fix for Flask Service

## You're in the scripts directory!

Since you're already in `C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\scripts>`, run:

```powershell
.\fix-flask-service-quotes.ps1
```

**NOT** `.\scripts\fix-flask-service-quotes.ps1` (that would look for scripts/scripts/)

## Alternative: From Project Root

If you're in the project root (`C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine>`), then use:

```powershell
.\scripts\fix-flask-service-quotes.ps1
```

## What the Script Does

1. ✅ Fixes path quoting issue (spaces in "VOFC Engine")
2. ✅ Updates NSSM configuration
3. ✅ Restarts the service
4. ✅ Tests Flask endpoint

## Must Run as Administrator!

Right-click PowerShell → "Run as Administrator" before running the script.

