Add these Ollama environment variables to your Vercel project:

**Variable Name**: `OLLAMA_URL`
**Value**: `https://ollama.frostech.site`
**Scope**: All Environments

**Variable Name**: `OLLAMA_API_BASE_URL`
**Value**: `https://ollama.frostech.site`
**Scope**: All Environments

**Variable Name**: `OLLAMA_BASE_URL`
**Value**: `https://ollama.frostech.site`
**Scope**: All Environments

**Variable Name**: `OLLAMA_MODEL`
**Value**: `vofc-engine:latest`
**Scope**: All Environments

**Variable Name**: `OLLAMA_EMBED_MODEL`
**Value**: `mxbai-embed-large`
**Scope**: All Environments

## Steps to Add in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New** for each variable above
4. Enter the Variable Name and Value
5. Select "All Environments" for the scope
6. Click **Save**
7. **Redeploy** your application (Vercel will auto-deploy, or you can trigger a manual deploy)

After adding these variables, the Ollama integration will work properly with your remote Ollama server!
