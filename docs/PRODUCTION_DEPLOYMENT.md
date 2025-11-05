# VOFC Engine Production Deployment Guide

## Overview

The VOFC Engine stack has been restructured for production deployment. All services run as persistent Windows services via NSSM, with executables and configurations consolidated under `C:\Tools\`.

## Service Architecture

### Service Map

| Service | Executable | Port | App Directory |
|---------|-----------|------|---------------|
| **VOFC-Ollama** | `C:\Users\frost\AppData\Local\Programs\Ollama\ollama.exe serve` | 11434 | - |
| **VOFC-Flask** | `C:\Tools\python\python.exe -m waitress --listen=0.0.0.0:8080 server:app` | 8080 | `C:\Tools\VOFC-Flask` |
| **VOFC-Tunnel** | `C:\Tools\cloudflared\cloudflared.exe tunnel run --config C:\Tools\cloudflared\config.yml ollama-tunnel` | - | - |

### Environment Variables

#### VOFC-Ollama Service
- `OLLAMA_HOME=C:\Users\frost\AppData\Local\Ollama`
- `OLLAMA_MODELS=D:\OllamaModels\models`

#### VOFC-Flask Service
- Working Directory: `C:\Tools\VOFC-Flask`
- Logs: `C:\Tools\nssm\logs\vofc_flask_out.log` and `C:\Tools\nssm\logs\vofc_flask_err.log`
- Module: `server:app` (server.py must be in `C:\Tools\VOFC-Flask`)

### Cloudflare Tunnel Configuration

**Config File**: `C:\Tools\cloudflared\config.yml`

**Tunnel Name**: `ollama-tunnel`

**Routes**:
- `ollama.frostech.site` → `http://localhost:11434`
- `flask.frostech.site` → `http://localhost:8080`
- `backend.frostech.site` → `http://localhost:8000`

## Service Management

### Checking Service Status

```powershell
# Check all VOFC services
Get-Service -Name "VOFC-*"

# Check specific service
Get-Service -Name "VOFC-Flask"
Get-Service -Name "VOFC-Ollama"
Get-Service -Name "VOFC-Tunnel"
```

### Starting/Stopping Services

```powershell
# Start service
Start-Service -Name "VOFC-Flask"

# Stop service
Stop-Service -Name "VOFC-Flask"

# Restart service
Restart-Service -Name "VOFC-Flask"
```

### Using NSSM Directly

```powershell
$nssm = "C:\Tools\nssm\nssm.exe"

# Start service
& $nssm start VOFC-Flask

# Stop service
& $nssm stop VOFC-Flask

# Check status
& $nssm status VOFC-Flask

# View service configuration
& $nssm get VOFC-Flask Application
& $nssm get VOFC-Flask AppParameters
& $nssm get VOFC-Flask AppDirectory
```

## Network Endpoints

### Local Development

- **Ollama API**: `http://localhost:11434`
- **Flask API**: `http://localhost:8080`
- **Backend API**: `http://localhost:8000`

### Production (Cloudflare Tunnel)

- **Ollama API**: `https://ollama.frostech.site`
- **Flask API**: `https://flask.frostech.site`
- **Backend API**: `https://backend.frostech.site`

## Health Checks

### Flask Health Endpoint

```powershell
# Local
curl http://localhost:8080/api/system/health

# Production
curl https://flask.frostech.site/api/system/health
```

### Ollama Health Check

```powershell
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Test model
ollama run vofc-engine:latest "test"
```

## Logging

### Log Locations

All service logs are centralized under `C:\Tools\nssm\logs\`:

- **Flask Output**: `C:\Tools\nssm\logs\vofc_flask_out.log`
- **Flask Errors**: `C:\Tools\nssm\logs\vofc_flask_err.log`
- **Ollama Logs**: Check Ollama service logs via Windows Event Viewer or NSSM

### Viewing Logs

```powershell
# View Flask output logs
Get-Content "C:\Tools\nssm\logs\vofc_flask_out.log" -Tail 50

# View Flask error logs
Get-Content "C:\Tools\nssm\logs\vofc_flask_err.log" -Tail 50

# Follow logs in real-time
Get-Content "C:\Tools\nssm\logs\vofc_flask_out.log" -Wait -Tail 20
```

## Service Configuration

### Auto-Start Configuration

All services are configured to:
- **Start automatically** on system boot
- **Auto-restart** on failure
- **Restart delay**: 10 seconds (configurable via NSSM)

### Modifying Service Configuration

```powershell
$nssm = "C:\Tools\nssm\nssm.exe"

# Set application path
& $nssm set VOFC-Flask Application "C:\Tools\python\python.exe"

# Set parameters
& $nssm set VOFC-Flask AppParameters "-m waitress --listen=0.0.0.0:8080 server:app"

# Set working directory
& $nssm set VOFC-Flask AppDirectory "C:\Tools\VOFC-Flask"

# Set environment variables
& $nssm set VOFC-Flask AppEnvironmentExtra "PYTHONPATH=C:\Tools\VOFC-Flask"

# Set log paths
& $nssm set VOFC-Flask AppStdout "C:\Tools\nssm\logs\vofc_flask_out.log"
& $nssm set VOFC-Flask AppStderr "C:\Tools\nssm\logs\vofc_flask_err.log"

# Configure auto-restart
& $nssm set VOFC-Flask AppRestartDelay 10000
& $nssm set VOFC-Flask AppExit Default Restart
```

## Troubleshooting

### Service Won't Start

1. **Check service status**:
   ```powershell
   Get-Service -Name "VOFC-Flask"
   ```

2. **Check logs**:
   ```powershell
   Get-Content "C:\Tools\nssm\logs\vofc_flask_err.log" -Tail 50
   ```

3. **Verify paths exist**:
   ```powershell
   Test-Path "C:\Tools\python\python.exe"
   Test-Path "C:\Tools\VOFC-Flask\server.py"
   ```

4. **Test module import manually**:
   ```powershell
   cd C:\Tools\VOFC-Flask
   C:\Tools\python\python.exe -c "from server import app; print('OK')"
   ```

### Port Already in Use

```powershell
# Check what's using port 8080
Get-NetTCPConnection -LocalPort 8080

# Check what's using port 11434
Get-NetTCPConnection -LocalPort 11434
```

### Service Configuration Issues

Use the fix script:
```powershell
# Run as Administrator
.\scripts\fix-flask-service-waitress.ps1
```

## Development vs Production

### Development
- Services may run manually (not as Windows services)
- Ports may differ (e.g., Flask on 5000)
- Logs may be in project directory

### Production
- **All services run as Windows services**
- **Standardized paths under `C:\Tools\`**
- **Centralized logging in `C:\Tools\nssm\logs\`**
- **Cloudflare tunnel for external access**

## Cursor/IDE Usage

When writing deployment or diagnostic scripts:

1. **Use `C:\Tools\` paths** instead of `AppData` or `OneDrive` locations
2. **Use service management commands** (`nssm` or `sc.exe`) instead of spawning processes manually
3. **Target correct ports**: `http://localhost:8080` for Flask, `http://localhost:11434` for Ollama
4. **Reference centralized log locations** in `C:\Tools\nssm\logs\`

## Migration Notes

### Changed from Development Structure

- **Flask port**: `5000` → `8080`
- **Flask path**: `C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama` → `C:\Tools\VOFC-Flask`
- **Python path**: `.venv\Scripts\python.exe` → `C:\Tools\python\python.exe`
- **Logs**: `logs\flask_*.log` → `C:\Tools\nssm\logs\vofc_flask_*.log`
- **Module path**: `vofc-viewer.vofc-viewer.ollama.server:app` → `server:app`

### Script Updates Required

All scripts referencing:
- Port 5000 → Update to 8080
- Old paths → Update to `C:\Tools\` structure
- Manual process spawning → Use service management commands

## Security

- **Cloudflare tunnel** provides HTTPS/TLS encryption
- Services bind to `0.0.0.0` (all interfaces) for Cloudflare tunnel access
- Local firewall should be configured to allow:
  - Port 11434 (Ollama)
  - Port 8080 (Flask)
  - Port 8000 (Backend, if applicable)

## Next Steps

1. Verify all services are running: `Get-Service -Name "VOFC-*"`
2. Test health endpoints: `curl http://localhost:8080/api/system/health`
3. Check logs for any errors
4. Verify Cloudflare tunnel is routing correctly
5. Update any remaining scripts referencing old paths/ports

