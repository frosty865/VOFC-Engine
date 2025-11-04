# Environment Files Location Guide

## .env Files in Your Project

### Primary Environment Files

#### 1. **Flask Server .env** (Python/Flask)
**Location**: `vofc-viewer/vofc-viewer/ollama/.env`
**Used by**: Flask server (`server.py`)
**Path in code**: `C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\.env`

**Contains**:
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OLLAMA_URL` / `OLLAMA_HOST` / `OLLAMA_API_BASE_URL`
- `SERVER_HOST` (default: 127.0.0.1)
- `SERVER_PORT` (default: 5000)
- `OLLAMA_MODEL` (default: vofc-engine:latest)
- `DEBUG` (default: True)

#### 2. **Next.js Application .env** (Frontend/Backend)
**Location**: `vofc-viewer/vofc-viewer/.env.local` or `.env`
**Used by**: Next.js application (server and client-side)

**Contains**:
- `NEXT_PUBLIC_SUPABASE_URL` (client-side accessible)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side accessible)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `OLLAMA_URL` (server-side)
- `NEXT_PUBLIC_OLLAMA_URL` (client-side accessible)

#### 3. **Root .env**
**Location**: `.env` (project root)
**Note**: May be used for general project configuration

#### 4. **Backend Service .env**
**Location**: `vofc-viewer/apps/backend/.env`
**Used by**: Node.js backend service

## How to Access/Edit

### Flask Server .env
```powershell
# View
Get-Content "vofc-viewer\vofc-viewer\ollama\.env"

# Edit
notepad "vofc-viewer\vofc-viewer\ollama\.env"
```

### Next.js .env
```powershell
# View
Get-Content "vofc-viewer\vofc-viewer\.env.local"

# Edit
notepad "vofc-viewer\vofc-viewer\.env.local"
```

## Important Notes

1. **`.env.local`** is typically gitignored (contains secrets)
2. **`.env`** files should NOT be committed to git
3. Flask server uses absolute path to `.env` file for Windows service compatibility
4. Next.js automatically loads `.env.local` and `.env` files
5. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser

## Environment Variables Reference

### Required Variables

**Flask Server**:
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (optional but recommended)

**Next.js**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

**Optional**:
- `OLLAMA_URL` (defaults to `http://localhost:11434`)
- `SERVER_HOST` (defaults to `127.0.0.1`)
- `SERVER_PORT` (defaults to `5000`)

## Security

⚠️ **Never commit .env files to git!**

They should be in `.gitignore`:
```
.env
.env.local
.env.*.local
```

