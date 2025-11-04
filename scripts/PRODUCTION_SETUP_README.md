# VOFC Flask Production Setup Guide

This guide provides step-by-step instructions for setting up VOFC Flask backend in production with auto-restart, health monitoring, and load balancing.

## Quick Start Checklist

### 1. Install NSSM Service (Auto-Restart on Crash/Reboot)

```powershell
# Run as Administrator
.\scripts\install-nssm-service.ps1
```

**What it does:**
- Installs Flask as a Windows service
- Configures auto-restart on crash (10 second delay)
- Sets up log rotation
- Starts service automatically on boot

**Manual commands:**
```powershell
nssm start vofc-flask
nssm stop vofc-flask
nssm status vofc-flask
```

---

### 2. Setup Cloudflare Tunnel Monitoring

```powershell
# Run as Administrator
.\scripts\setup-tunnel-monitor-task.ps1
```

**What it does:**
- Creates Windows Task Scheduler job
- Monitors tunnel every 5 minutes
- Automatically restarts tunnel if down
- Logs all events to `logs\tunnel-monitor.log`

**Manual tunnel check:**
```powershell
.\scripts\check-tunnel.ps1
```

---

### 3. Optimize Health Endpoint

✅ **Already completed!** The `/api/system/health` endpoint has been optimized:
- Response time: < 200ms
- No DB queries
- No file I/O
- Minimal network checks (1 second timeout)

**Test it:**
```powershell
curl http://localhost:5000/api/system/health
# Or through tunnel:
curl https://flask.frostech.site/api/system/health
```

---

### 4. Setup Load Balancing (Optional - Recommended)

#### Option A: Gunicorn (Recommended for Single Server)

```powershell
# Run as Administrator
.\scripts\setup-gunicorn-service.ps1
```

**Benefits:**
- Multiple workers for concurrent processing
- Automatic worker restart
- Better resource utilization
- Works with existing Cloudflare tunnel

#### Option B: Nginx + Multiple Instances (For Distributed Deployment)

```powershell
# Create multiple Flask instances
.\scripts\create-multi-instance-services.ps1

# Configure Nginx (see LOAD_BALANCING_GUIDE.md)
# Update Cloudflare tunnel to point to Nginx (port 8080)
```

**See:** `scripts\LOAD_BALANCING_GUIDE.md` for detailed instructions

---

## File Structure

```
scripts/
├── install-nssm-service.ps1          # Install Flask as Windows service
├── check-tunnel.ps1                  # Monitor Cloudflare tunnel health
├── setup-tunnel-monitor-task.ps1     # Schedule tunnel monitoring
├── setup-gunicorn-service.ps1       # Setup Gunicorn multi-worker
├── create-multi-instance-services.ps1 # Create multiple Flask instances
├── LOAD_BALANCING_GUIDE.md          # Load balancing documentation
└── PRODUCTION_SETUP_README.md       # This file

logs/
├── flask.log                         # Flask service logs
├── tunnel-monitor.log                # Tunnel monitoring logs
├── gunicorn-access.log               # Gunicorn access logs (if using)
└── gunicorn-error.log                # Gunicorn error logs (if using)
```

---

## Service Management

### NSSM Service Commands

```powershell
# Start service
nssm start vofc-flask

# Stop service
nssm stop vofc-flask

# Restart service
nssm restart vofc-flask

# View service status
nssm status vofc-flask

# View service logs
Get-Content "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\flask.log" -Tail 50
```

### Windows Service Commands

```powershell
# Start service
Start-Service vofc-flask

# Stop service
Stop-Service vofc-flask

# Check status
Get-Service vofc-flask
```

---

## Monitoring & Health Checks

### Health Endpoint

**Endpoint:** `GET /api/system/health`

**Response (200ms target):**
```json
{
  "flask": "online",
  "ollama": "online",
  "supabase": "online"
}
```

**External monitoring (Uptime Kuma / Healthchecks.io):**
```powershell
# Every minute
curl -fsS -m 10 https://flask.frostech.site/api/system/health | grep online || curl -fsS -m 10 -o /dev/null https://hc-ping.com/<your-check-id>/fail
```

### Log Monitoring

```powershell
# Follow Flask logs
Get-Content "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\flask.log" -Wait -Tail 50

# Follow tunnel monitor logs
Get-Content "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\tunnel-monitor.log" -Wait -Tail 50
```

---

## Troubleshooting

### Service Won't Start

1. Check logs: `Get-Content "logs\flask.log" -Tail 100`
2. Check NSSM status: `nssm status vofc-flask`
3. Verify Python path: `nssm get vofc-flask Application`
4. Test manually: `python server.py`

### Tunnel Down

1. Check tunnel status: `cloudflared tunnel list`
2. Run manual check: `.\scripts\check-tunnel.ps1`
3. Check tunnel logs in Cloudflare dashboard
4. Verify config file: `C:\Users\frost\cloudflared\config.yml`

### Health Endpoint Slow

1. Verify Ollama is accessible: `curl http://localhost:11434/api/tags`
2. Check network connectivity
3. Review health endpoint code (should be < 200ms)

### High Memory Usage

1. Reduce Gunicorn workers: Edit `gunicorn_config.py`
2. Check for memory leaks in document processing
3. Monitor with: `Get-Process | Where-Object {$_.ProcessName -like "*python*"}`

---

## Next Steps

1. ✅ **Install NSSM service** - Auto-restart on crash/reboot
2. ✅ **Setup tunnel monitoring** - Automatic tunnel restart
3. ✅ **Health endpoint optimized** - Fast dashboard response
4. ⚙️ **Setup Gunicorn** (Optional) - Multi-worker for better concurrency
5. 📊 **Setup external monitoring** - Uptime Kuma or Healthchecks.io
6. 📈 **Monitor performance** - Track response times and resource usage

---

## Support

For detailed information, see:
- **Load Balancing:** `scripts\LOAD_BALANCING_GUIDE.md`
- **NSSM Documentation:** https://nssm.cc/usage
- **Gunicorn Documentation:** https://docs.gunicorn.org/
- **Cloudflare Tunnel Docs:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

