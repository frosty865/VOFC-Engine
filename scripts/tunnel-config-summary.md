# Cloudflare Tunnel Configuration Summary

## Tunnel URLs

### Flask Server
- **Production URL**: `https://flask.frostech.site`
- **Local URL**: `http://localhost:5000`
- **Tunnel Name**: Not explicitly named (may be `ollama-tunnel`)

### Ollama Server
- **Production URL**: `https://ollama.frostech.site`
- **Local URL**: `http://localhost:11434`
- **Tunnel Name**: `ollama-tunnel` (from start-vofc.ps1)

## Local Ports

| Service | Port | Local URL |
|---------|------|-----------|
| Flask   | 5000 | `http://localhost:5000` |
| Ollama  | 11434 | `http://localhost:11434` |

## Cloudflare Tunnel Configuration

### Config Location
- **Directory**: `C:\Users\frost\.cloudflared`
- **Config File**: `config.yml`
- **Certificate**: `cert.pem`
- **Tunnel ID**: `17152659-d3ad-4abf-ae71-d0cc9d2b89e3`

### Tunnel Startup
From `start-vofc.ps1`:
```powershell
$cloudflareExe  = "C:\Users\frost\cloudflared\cloudflared.exe"
$tunnelName     = "ollama-tunnel"
Start-Process -WindowStyle Hidden -FilePath $cloudflareExe -ArgumentList "tunnel run $tunnelName"
```

## URL Detection Priority (Code)

### Flask URL Detection
1. `NEXT_PUBLIC_FLASK_API_URL`
2. `NEXT_PUBLIC_FLASK_URL`
3. `FLASK_URL`
4. `NEXT_PUBLIC_OLLAMA_SERVER_URL`
5. `OLLAMA_SERVER_URL`
6. `OLLAMA_LOCAL_URL`
7. **Production default**: `https://flask.frostech.site`
8. **Development default**: `http://localhost:5000`

### Ollama URL Detection
1. `NEXT_PUBLIC_OLLAMA_URL`
2. `OLLAMA_URL`
3. `OLLAMA_API_BASE_URL`
4. `OLLAMA_BASE_URL`
5. **Production default**: `https://ollama.frostech.site`
6. **Development default**: `http://localhost:11434`

## Environment Variables

Currently, none of the tunnel-related environment variables are set locally. They should be set in:
- **Vercel**: Project Settings → Environment Variables
- **Local**: `.env.local` or `.env` files

## Testing Tunnel Connectivity

```bash
# Test Flask tunnel
curl https://flask.frostech.site/api/health
curl https://flask.frostech.site/api/system/health

# Test Ollama tunnel
curl https://ollama.frostech.site/api/tags
curl https://ollama.frostech.site/api/version
```

## Flask Endpoints Accessible via Tunnel

- `/api/health` - Basic health check
- `/api/system/health` - System health with components
- `/api/progress` - Processing progress
- `/api/files/process` - Process files
- `/api/files/process-extracted` - Process extracted text
- `/process-pending` - Process pending documents

## Ollama Endpoints Accessible via Tunnel

- `/api/tags` - List available models
- `/api/version` - Ollama version
- `/api/generate` - Generate text
- `/api/chat` - Chat completion

## Troubleshooting

### If Flask tunnel is not working:
1. Check if Cloudflare tunnel is running: `cloudflared tunnel list`
2. Verify Flask server is running on port 5000
3. Check tunnel config in `~/.cloudflared/config.yml`
4. Verify DNS records point to tunnel
5. Check Vercel environment variables are set correctly

### If Ollama tunnel is not working:
1. Check if Cloudflare tunnel is running
2. Verify Ollama server is running on port 11434
3. Check tunnel config routing for Ollama
4. Verify DNS records point to tunnel

## Production Detection

The code detects production by checking:
- `process.env.VERCEL === '1'` or `'true'`
- `process.env.NODE_ENV === 'production'`

If either is true, it uses the tunnel URLs (`https://flask.frostech.site` and `https://ollama.frostech.site`).

