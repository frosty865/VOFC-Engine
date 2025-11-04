# VOFC Engine - Project Index

## Project Structure

```
VOFC Engine/
├── scripts/                    # Production scripts and utilities
│   ├── Service management
│   ├── Tunnel diagnostics
│   ├── Flask service fixes
│   └── Documentation
├── vofc-viewer/               # Main application directory
│   ├── vofc-viewer/            # Next.js application (root for Vercel)
│   │   ├── app/               # Next.js app directory
│   │   ├── components/         # React components
│   │   ├── lib/               # Utility libraries
│   │   ├── ollama/            # Flask server (Python)
│   │   └── package.json       # Next.js dependencies
│   ├── apps/backend/          # Backend services
│   ├── docs/                  # Documentation
│   └── scripts-dev/           # Development scripts
├── config/                     # Configuration files
├── docs/                       # Project documentation
├── documentation/              # Additional documentation
├── heuristic_parser/          # Parser utilities
├── logs/                       # Service logs
├── vercel.json                 # Vercel deployment config (root)
└── README.md                   # Project README
```

## Key Files

### Configuration
- `vercel.json` - Vercel deployment configuration (root)
- `vofc-viewer/vofc-viewer/vercel.json` - Next.js app config
- `VOFC Engine.code-workspace` - VS Code workspace

### Services
- **Flask**: `vofc-viewer/vofc-viewer/ollama/server.py`
- **Ollama**: Running as Windows service (VOFC-Ollama)
- **Tunnel**: Cloudflare tunnel configuration

### Scripts
- `scripts/` - Production management scripts
- `scripts/restart-tunnels.ps1` - Tunnel restart
- `scripts/fix-flask-service-quotes.ps1` - Flask service fix
- `scripts/diagnose-tunnels.ps1` - Tunnel diagnostics

### Documentation
- `scripts/` - Service management docs
- `docs/` - Project documentation
- `documentation/` - Additional guides

## Service Status

### Windows Services
- **VOFC-Flask**: Running (Auto-start)
- **VOFC-Ollama**: Running (Auto-start)
- **VOFC-Tunnel**: Running (Auto-start)

### Endpoints
- **Flask Local**: http://127.0.0.1:5000
- **Flask Tunnel**: https://flask.frostech.site
- **Ollama Local**: http://localhost:11434
- **Ollama Tunnel**: https://ollama.frostech.site

## Deployment

### Vercel
- **Root Directory**: `vofc-viewer/vofc-viewer`
- **Config**: `vercel.json` (root level)
- **Framework**: Next.js

### Cloudflare Tunnels
- **Config**: `C:\Users\frost\cloudflared\config.yml`
- **Tunnel ID**: `17152659-d3ad-4abf-ae71-d0cc9d2b89e3`
- **Domains**:
  - `flask.frostech.site` → `http://127.0.0.1:5000`
  - `ollama.frostech.site` → `http://127.0.0.1:11434`
  - `backend.frostech.site` → `http://127.0.0.1:3000`

## Recent Changes

### Fixed Issues
1. ✅ Flask service startup (8.3 short path fix)
2. ✅ Cloudflare tunnel configuration (localhost → 127.0.0.1)
3. ✅ Ollama tunnel 403/503 errors resolved
4. ✅ Vercel build path configuration
5. ✅ Removed duplicate files and folders

### Cleanup
- Removed duplicate `vercel.json` files
- Removed duplicate workspace files
- Removed root-level `node_modules` and `.next`
- Removed duplicate `data/` and `documentation/` folders
- Removed archive folder from git

## Quick Reference

### Service Management
```powershell
# Check status
Get-Service | Where-Object {$_.Name -like "VOFC*"}

# Restart services
Restart-Service VOFC-Flask
Restart-Service VOFC-Ollama
Restart-Service VOFC-Tunnel
```

### Testing Endpoints
```powershell
# Local
curl http://127.0.0.1:5000/api/system/health
curl http://localhost:11434/api/tags

# Tunnels
curl https://flask.frostech.site/api/system/health
curl https://ollama.frostech.site/api/tags
```

### Logs
```powershell
# Flask logs
Get-Content "logs\flask_out.log" -Tail 50
Get-Content "logs\flask_err.log" -Tail 50
```

## File Statistics

- **Total Files**: ~21,000+ (excluding node_modules)
- **Main Languages**: JavaScript, Python, TypeScript, Markdown
- **Key Directories**: 
  - `vofc-viewer/vofc-viewer/` - Next.js app (1GB+)
  - `scripts/` - Management scripts (51 files)
  - `docs/` - Documentation

Last Updated: 2025-11-04

