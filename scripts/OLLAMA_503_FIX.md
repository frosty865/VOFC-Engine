# Fix Ollama 503 Service Unavailable

## Current Status
- ✅ Flask: Working (200 OK through tunnel)
- ❌ Ollama: 503 Service Unavailable (through tunnel)
- ✅ Local Ollama: Should be accessible on localhost:11434

## What 503 Means
**503 Service Unavailable** means:
- Cloudflare tunnel is working (CF-Ray header present)
- Tunnel CAN reach Cloudflare
- But Cloudflare CANNOT reach the origin (localhost:11434)

This is different from 403 (which would be Cloudflare blocking).

## Possible Causes

### 1. Ollama Service Not Running
**Check:**
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*ollama*"}
curl http://localhost:11434/api/tags
```

**Fix:** Start Ollama service if it's not running

### 2. Ollama Not Listening on localhost
**Check:**
```powershell
netstat -an | Select-String ":11434" | Select-String "LISTENING"
```

**Fix:** Ensure Ollama is configured to listen on `127.0.0.1:11434` or `localhost:11434`

### 3. Tunnel Can't Connect to localhost:11434
**Check:** Tunnel configuration is correct:
```yaml
- hostname: ollama.frostech.site
  service: http://localhost:11434
```

**Possible Fix:** Try `http://127.0.0.1:11434` instead of `localhost:11434`

### 4. Ollama Service Restarted/Changed Port
**Check:** Verify Ollama is actually running and on the correct port

**Fix:** Restart Ollama service

## Quick Fixes

### Fix 1: Restart Ollama
```powershell
# Stop Ollama
Get-Process ollama -ErrorAction SilentlyContinue | Stop-Process -Force

# Start Ollama (adjust path as needed)
Start-Process ollama -ArgumentList "serve"
```

### Fix 2: Update Tunnel Config
Edit `C:\Users\frost\cloudflared\config.yml`:
```yaml
ingress:
  - hostname: ollama.frostech.site
    service: http://127.0.0.1:11434  # Try 127.0.0.1 instead of localhost
```

Then restart tunnel:
```powershell
Get-Process cloudflared | Stop-Process -Force
# Restart tunnel (use your tunnel start command)
```

### Fix 3: Verify Ollama is Accessible
```powershell
# Test direct connection
Test-NetConnection -ComputerName localhost -Port 11434
curl http://localhost:11434/api/tags
curl http://127.0.0.1:11434/api/tags

# Both should work
```

## Comparison: Flask vs Ollama

**Flask (Working):**
- Local: http://localhost:5000 ✓
- Tunnel: https://flask.frostech.site ✓

**Ollama (503 Error):**
- Local: http://localhost:11434 (needs verification)
- Tunnel: https://ollama.frostech.site ✗ (503)

**Difference:** Flask service is accessible, Ollama service may not be.

## Diagnosis Steps

1. **Verify Ollama is running:**
   ```powershell
   Get-Process ollama
   curl http://localhost:11434/api/tags
   ```

2. **Check port binding:**
   ```powershell
   netstat -an | Select-String ":11434"
   ```

3. **Test tunnel can reach Ollama:**
   - If local works but tunnel doesn't → tunnel routing issue
   - If local doesn't work → Ollama service issue

4. **Check tunnel logs:**
   - Look for connection errors to localhost:11434
   - Check if tunnel process can reach Ollama

## Most Likely Fix

**Restart Ollama service:**
```powershell
# Find and restart Ollama
Get-Process ollama | Stop-Process -Force
# Start Ollama (adjust command as needed for your setup)
ollama serve
```

Or if Ollama is a Windows service:
```powershell
Restart-Service ollama
```

