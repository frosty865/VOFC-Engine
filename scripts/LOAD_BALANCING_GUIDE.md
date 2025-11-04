# Load Balancing & Multi-Instance Scaling Guide

This guide covers options for scaling your VOFC Flask backend to handle multiple concurrent requests and improve reliability through redundancy.

## Overview

By default, Flask's development server runs single-threaded. For production workloads, you have two main options:

1. **Option A: Gunicorn** - Multi-worker Python WSGI server (Recommended)
2. **Option B: Nginx Reverse Proxy** - Load balance multiple Flask instances

---

## Option A: Gunicorn + Cloudflare Tunnel (Recommended)

### Benefits
- ✅ Simple setup - single process manager
- ✅ Built-in worker process management
- ✅ Automatic worker restart on crashes
- ✅ Works directly with existing Cloudflare tunnel
- ✅ No additional infrastructure needed

### Installation

1. **Install Gunicorn:**
```powershell
pip install gunicorn
```

2. **Create a Gunicorn configuration file** (`gunicorn_config.py`):
```python
# Gunicorn configuration file
import multiprocessing

# Server socket
bind = "127.0.0.1:5000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1  # Typical formula: (2 x CPU cores) + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
accesslog = "C:/Users/frost/OneDrive/Desktop/Projects/VOFC Engine/logs/gunicorn-access.log"
errorlog = "C:/Users/frost/OneDrive/Desktop/Projects/VOFC Engine/logs/gunicorn-error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "vofc-flask"

# Server mechanics
daemon = False
pidfile = "C:/Users/frost/OneDrive/Desktop/Projects/VOFC Engine/logs/gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
# keyfile = None
# certfile = None

# Graceful timeout for worker restart
graceful_timeout = 30
```

3. **Update NSSM Service to use Gunicorn:**

Run the provided script to update your service:
```powershell
.\scripts\setup-gunicorn-service.ps1
```

Or manually update NSSM:
```powershell
nssm set vofc-flask Application "C:\Users\frost\AppData\Local\Programs\Python\Python311\Scripts\gunicorn.exe"
nssm set vofc-flask AppParameters "--config C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama\gunicorn_config.py server:app"
```

4. **Worker Count Recommendation:**
   - **CPU-bound tasks**: `workers = CPU cores`
   - **I/O-bound tasks** (like your document processing): `workers = (2 x CPU cores) + 1`
   - **Start with 4 workers** and adjust based on load

### Testing Gunicorn

```powershell
# Test Gunicorn manually first
cd "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama"
gunicorn --workers 4 --bind 127.0.0.1:5000 server:app

# Check if it's working
curl http://localhost:5000/api/system/health
```

### Monitoring

Check worker processes:
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*gunicorn*" -or $_.ProcessName -like "*python*"} | Select-Object ProcessName, Id, CPU, WorkingSet
```

---

## Option B: Nginx Reverse Proxy + Multiple Flask Instances

### Benefits
- ✅ More control over load balancing algorithm
- ✅ Can run instances on different ports/machines
- ✅ Better for horizontal scaling across servers
- ✅ Additional features (rate limiting, SSL termination, etc.)

### Prerequisites

1. **Install Nginx for Windows:**
   - Download from: http://nginx.org/en/download.html
   - Extract to `C:\nginx\`

2. **Run multiple Flask instances** on ports 5000, 5001, 5002, etc.

3. **Configure Nginx** (see `nginx.conf.example` below)

### Nginx Configuration Example

Create `C:\nginx\conf\nginx-vofc.conf`:

```nginx
upstream vofc_backend {
    # Round-robin load balancing (default)
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    
    # Alternative: Least connections
    # least_conn;
    
    # Alternative: IP hash (sticky sessions)
    # ip_hash;
}

server {
    listen 8080;
    server_name localhost;

    # Logging
    access_log C:/Users/frost/OneDrive/Desktop/Projects/VOFC Engine/logs/nginx-access.log;
    error_log C:/Users/frost/OneDrive/Desktop/Projects/VOFC Engine/logs/nginx-error.log;

    # Proxy settings
    location / {
        proxy_pass http://vofc_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running document processing
        proxy_connect_timeout 60s;
        proxy_send_timeout 1800s;  # 30 minutes for large documents
        proxy_read_timeout 1800s;
        
        # Buffering
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health check endpoint (bypass proxy for faster response)
    location /api/system/health {
        proxy_pass http://vofc_backend;
        proxy_connect_timeout 1s;
        proxy_send_timeout 1s;
        proxy_read_timeout 1s;
    }
}
```

### Update Cloudflare Tunnel

Update your `config.yml` to point to Nginx instead of Flask directly:

```yaml
tunnel: ollama-tunnel
credentials-file: C:\Users\frost\cloudflared\credentials.json

ingress:
  - hostname: flask.frostech.site
    service: http://localhost:8080  # Nginx port
  - service: http_status:404
```

### Running Multiple Flask Instances

Create a PowerShell script to start multiple instances:

```powershell
# Start Flask instances on different ports
Start-Process python -ArgumentList "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama\server.py" -Environment @{"SERVER_PORT"="5000"}
Start-Process python -ArgumentList "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama\server.py" -Environment @{"SERVER_PORT"="5001"}
Start-Process python -ArgumentList "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\ollama\server.py" -Environment @{"SERVER_PORT"="5002"}
```

Or use NSSM to create multiple services:
```powershell
.\scripts\create-multi-instance-services.ps1
```

---

## Comparison

| Feature | Gunicorn | Nginx + Multiple Instances |
|---------|----------|---------------------------|
| **Setup Complexity** | Low | Medium |
| **Resource Usage** | Lower (shared memory) | Higher (multiple processes) |
| **Load Balancing** | Round-robin (workers) | Configurable (round-robin, least-conn, ip-hash) |
| **Horizontal Scaling** | Single machine | Multiple machines possible |
| **Maintenance** | Easier | More complex |
| **Best For** | Single server, high concurrency | Distributed deployment, specialized routing |

---

## Recommendations

### For Your Use Case (Document Processing)

**Recommended: Gunicorn with 4-8 workers**

Reasons:
1. Your workload is I/O-bound (waiting for Ollama LLM responses)
2. Multiple workers can process different documents simultaneously
3. Simpler to manage and monitor
4. Works seamlessly with existing Cloudflare tunnel setup

### Starting Point Configuration

```python
# gunicorn_config.py - Conservative start
workers = 4
worker_class = "sync"
timeout = 1800  # 30 minutes for large document processing
```

### Monitoring & Scaling

1. **Monitor worker health:**
   ```powershell
   # Check Gunicorn stats (if enabled)
   curl http://localhost:5000/health
   ```

2. **Adjust workers based on:**
   - CPU usage (should be < 80%)
   - Memory usage (each worker uses ~200-500MB)
   - Request queue depth
   - Average response time

3. **Scale up if:**
   - Requests are queuing
   - Response times increasing
   - CPU usage is low (< 50%)

4. **Scale down if:**
   - High memory usage
   - CPU usage consistently > 90%
   - Workers are idle

---

## Troubleshooting

### Issue: Workers crash frequently
- **Solution**: Reduce `workers` count or increase `timeout`

### Issue: High memory usage
- **Solution**: Reduce `workers` count or use `--worker-class gevent` for async I/O

### Issue: Requests timing out
- **Solution**: Increase `timeout` in Gunicorn config (your document processing takes 10-30+ minutes)

### Issue: Nginx 502 Bad Gateway
- **Solution**: Check if Flask instances are running on configured ports

---

## Next Steps

1. **Start with Gunicorn** (Option A) - it's simpler and sufficient for most cases
2. **Monitor performance** using the health endpoint and logs
3. **Scale up** if needed by increasing workers or adding instances
4. **Consider Option B** only if you need distributed deployment or advanced routing

