# Versions and Associations Report

Generated: 2025-11-04

## Runtime Versions

### Node.js & npm
- **Node.js**: v20.19.5
- **npm**: 10.8.2
- **Python**: 3.11.9 (system) / 3.13 (Flask service)

### Service Versions
- **Flask**: 2.3.3
- **Werkzeug**: 2.3.7
- **Next.js**: 15.5.5
- **React**: 19.1.0
- **React DOM**: 19.1.0

## Package Versions

### Next.js Application (`vofc-viewer/vofc-viewer/package.json`)
```json
{
  "name": "vofc-viewer",
  "version": "0.1.0",
  "next": "15.5.5",
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "@supabase/supabase-js": "^2.75.0",
  "@vercel/analytics": "^1.5.0",
  "@vercel/speed-insights": "^1.2.0",
  "tailwindcss": "^4.1.15",
  "typescript": "^5.9.3"
}
```

### Flask Server (`vofc-viewer/vofc-viewer/ollama/requirements.txt`)
```
Flask==2.3.3
Werkzeug==2.3.7
python-dateutil==2.8.2
PyPDF2>=3.0.0
pypdf>=3.0.0
requests>=2.31.0
pytesseract>=0.3.10
pdf2image>=1.16.0
pillow>=10.0.0
nvidia-ml-py>=12.535.0
```

### Backend Service (`vofc-viewer/apps/backend/package.json`)
```json
{
  "name": "vofc-backend",
  "version": "1.0.0",
  "@supabase/supabase-js": "^2.39.0",
  "express": "^4.18.2"
}
```

### Heuristic Parser (`heuristic_parser/requirements.txt`)
```
pdfminer.six>=20221105
PyPDF2>=3.0.0
python-docx>=1.1.2
beautifulsoup4>=4.12.3
sentence-transformers>=3.0.1
numpy>=1.26.0
scikit-learn>=1.4.2
```

## Service Associations

### Flask Server
- **File**: `vofc-viewer/vofc-viewer/ollama/server.py`
- **Port**: 5000 (configurable via `SERVER_PORT`)
- **Host**: 127.0.0.1 (configurable via `SERVER_HOST`)
- **Python**: Python 3.13 (from service config)
- **Service**: VOFC-Flask (Windows Service via NSSM)
- **Path**: Uses 8.3 short path: `C:\Users\frost\OneDrive\Desktop\Projects\VOFCEN~1\VOFC-V~1\VOFC-V~1\ollama\server.py`

### Ollama Server
- **Port**: 11434
- **Host**: localhost/127.0.0.1
- **Service**: VOFC-Ollama (Windows Service)
- **Model**: vofc-engine:latest

### Cloudflare Tunnel
- **Service**: VOFC-Tunnel (Windows Service)
- **Config**: `C:\Users\frost\cloudflared\config.yml`
- **Tunnel ID**: 17152659-d3ad-4abf-ae71-d0cc9d2b89e3
- **Domains**:
  - `flask.frostech.site` → `http://127.0.0.1:5000`
  - `ollama.frostech.site` → `http://127.0.0.1:11434`
  - `backend.frostech.site` → `http://127.0.0.1:3000`

## Environment Variable Associations

### Flask Server (.env)
- **Location**: `C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\.env`
- **Variables**:
  - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` → Supabase instance
  - `SUPABASE_SERVICE_ROLE_KEY` → Supabase authentication
  - `OLLAMA_URL` / `OLLAMA_HOST` / `OLLAMA_API_BASE_URL` → Ollama server
  - `SERVER_HOST` → Flask host (default: 127.0.0.1)
  - `SERVER_PORT` → Flask port (default: 5000)
  - `OLLAMA_MODEL` → Model name (default: vofc-engine:latest)
  - `DEBUG` → Debug mode (default: True)

### Next.js Application
- **Environment Variables** (from `.env.local` or Vercel):
  - `NEXT_PUBLIC_SUPABASE_URL` → Supabase URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase anon key
  - `SUPABASE_SERVICE_ROLE_KEY` → Service role key (server-side)
  - `OLLAMA_URL` → Ollama API endpoint
  - `FLASK_URL` → Flask API endpoint

## API Endpoint Links

### Flask Endpoints
- `/api/system/health` → Health check (Flask, Ollama, Supabase status)
- `/api/progress` → Processing progress
- `/api/files/process` → Process files
- `/api/files/process-extracted` → Process extracted text files

### Ollama Endpoints
- `/api/tags` → List available models
- `/api/generate` → Generate text
- `/api/chat` → Chat completion

### Supabase
- **URL**: `https://wivohgbuuwxoyfyzntsd.supabase.co`
- **Library**: `@supabase/supabase-js` (v2.75.0 in Next.js, v2.39.0 in backend)

## Configuration File Associations

### Vercel Deployment
- **Root Config**: `vercel.json` (points to `vofc-viewer/vofc-viewer`)
- **App Config**: `vofc-viewer/vofc-viewer/vercel.json`
- **Root Directory**: `vofc-viewer/vofc-viewer`
- **Framework**: Next.js 15.5.5

### Cloudflare Tunnel
- **Config**: `C:\Users\frost\cloudflared\config.yml`
- **Credentials**: `C:\Users\frost\.cloudflared\17152659-d3ad-4abf-ae71-d0cc9d2b89e3.json`

### NSSM Service Configuration
- **VOFC-Flask**: 
  - Application: `C:\Users\frost\AppData\Local\Programs\Python\Python313\python.exe`
  - Parameters: `C:\Users\frost\OneDrive\Desktop\Projects\VOFCEN~1\VOFC-V~1\VOFC-V~1\ollama\server.py`
  - Directory: `C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama`

## Version Compatibility Notes

### Potential Issues
1. **Supabase Version Mismatch**:
   - Next.js app: `@supabase/supabase-js@^2.75.0`
   - Backend: `@supabase/supabase-js@^2.39.0`
   - **Recommendation**: Update backend to match Next.js version

2. **React 19 with Next.js 15.5.5**:
   - ✅ Compatible (Next.js 15 supports React 19)

3. **Python Versions**:
   - Flask service uses Python 3.13
   - Ensure all Python packages are compatible

### Links Between Services

```
Next.js App (port 3000)
    ↓
    ├─→ Flask API (127.0.0.1:5000)
    │       ├─→ Ollama API (127.0.0.1:11434)
    │       └─→ Supabase (wivohgbuuwxoyfyzntsd.supabase.co)
    │
    └─→ Supabase (direct)
            └─→ Database & Auth

Cloudflare Tunnel
    ├─→ flask.frostech.site → Flask (127.0.0.1:5000)
    ├─→ ollama.frostech.site → Ollama (127.0.0.1:11434)
    └─→ backend.frostech.site → Backend (127.0.0.1:3000)
```

## CORS Configuration

### Flask CORS Origins
- `https://www.zophielgroup.com`
- `https://zophielgroup.com`
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `*` (wildcard)

## File Path Associations

### Base Directories
- **Ollama Data**: `C:\Users\frost\AppData\Local\Ollama\data`
- **Uploads**: `{BASE_DIR}/incoming`
- **Processed**: `{BASE_DIR}/processed`
- **Library**: `{BASE_DIR}/library`
- **Errors**: `{BASE_DIR}/errors`
- **Extracted Text**: `{BASE_DIR}/extracted_text`

### Log Files
- Flask: `C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\flask_out.log`
- Flask Errors: `C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\flask_err.log`
- Ollama: `C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\ollama_out.log`
- Tunnel: `C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\logs\tunnel_out.log`

## Recommendations

1. **Update Supabase versions** to match across all packages
2. **Verify environment variables** are consistent across services
3. **Check Python 3.13 compatibility** with all packages
4. **Review CORS origins** - ensure production domains are included
5. **Document all API endpoint links** for reference

