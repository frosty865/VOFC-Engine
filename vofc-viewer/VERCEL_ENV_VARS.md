# Vercel Environment Variables

This document lists the environment variables that need to be configured in your Vercel project.

## Required Environment Variables

### Flask Server URL (NEW - Priority 1)
**Variable:** `NEXT_PUBLIC_FLASK_URL`  
**Value:** `https://17152659-d3ad-4abf-ae71-d0cc9d2b89e3.cfargotunnel.com`  
**Description:** Cloudflare Tunnel URL for Flask backend. This is the primary URL used by the system health API proxy.

### Alternative Flask URLs (Fallbacks)
**Variable:** `NEXT_PUBLIC_OLLAMA_SERVER_URL`  
**Value:** `https://flask.frostech.site` (or your Flask URL)  
**Description:** Alternative Flask server URL (fallback if NEXT_PUBLIC_FLASK_URL is not set)

**Variable:** `OLLAMA_SERVER_URL`  
**Value:** `https://flask.frostech.site`  
**Description:** Server-side Flask URL (not exposed to browser)

**Variable:** `OLLAMA_LOCAL_URL`  
**Value:** `http://127.0.0.1:5000` (for local development only)  
**Description:** Local development Flask URL

### Supabase Configuration
**Variable:** `NEXT_PUBLIC_SUPABASE_URL`  
**Value:** Your Supabase project URL  
**Description:** Public Supabase URL for client-side access

**Variable:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Value:** Your Supabase anonymous key  
**Description:** Public Supabase anonymous key for client-side access

**Variable:** `SUPABASE_SERVICE_ROLE_KEY`  
**Value:** Your Supabase service role key  
**Description:** Server-side Supabase service role key (keep secret!)

**Variable:** `SUPABASE_URL` (optional)  
**Value:** Same as NEXT_PUBLIC_SUPABASE_URL  
**Description:** Alternative Supabase URL variable

### Other Configuration
**Variable:** `OLLAMA_URL` (optional)  
**Value:** `https://ollama.frostech.site`  
**Description:** Ollama API URL for server-side requests

## How to Update Vercel Environment Variables

### Method 1: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`vofc-viewer` or your project name)
3. Go to **Settings** → **Environment Variables**
4. Add or update the following variable:

   **Key:** `NEXT_PUBLIC_FLASK_URL`  
   **Value:** `https://17152659-d3ad-4abf-ae71-d0cc9d2b89e3.cfargotunnel.com`  
   **Environments:** Select all (Production, Preview, Development)
   
5. Click **Save**
6. **Redeploy** your application for changes to take effect

### Method 2: Via Vercel CLI

If you have Vercel CLI installed:

```bash
cd vofc-viewer
vercel env add NEXT_PUBLIC_FLASK_URL
# Enter the value when prompted: https://17152659-d3ad-4abf-ae71-d0cc9d2b89e3.cfargotunnel.com
# Select environments: production, preview, development
```

Then redeploy:
```bash
vercel --prod
```

## Environment Variable Priority

The system health API proxy checks environment variables in this order:

1. `NEXT_PUBLIC_FLASK_URL` ← **Set this one!**
2. `NEXT_PUBLIC_OLLAMA_SERVER_URL`
3. `OLLAMA_SERVER_URL`
4. `OLLAMA_LOCAL_URL`
5. Default: `https://flask.frostech.site`

## Verification

After setting the environment variable and redeploying, verify it works:

1. Visit your deployed site
2. Go to the System Health Dashboard (`/admin/system`)
3. Check browser console for logs: `[System Health API Proxy] Using Flask URL: ...`
4. The health status should show Flask as "online"

## Notes

- Environment variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Variables without `NEXT_PUBLIC_` prefix are server-side only
- After updating environment variables, you must redeploy for changes to take effect
- The Cloudflare Tunnel URL may change if you recreate the tunnel - update this variable accordingly

