# Vercel Environment Variables Configuration

To update your Vercel project with the new local storage configuration, add these environment variables in Vercel Dashboard:

## Required Environment Variables

### Local File Storage
```
OLLAMA_FILE_STORAGE=C:\Users\frost\AppData\Local\Ollama\files
OLLAMA_INCOMING_PATH=C:\Users\frost\AppData\Local\Ollama\files\incoming
OLLAMA_PROCESSED_PATH=C:\Users\frost\AppData\Local\Ollama\files\processed
OLLAMA_ERROR_PATH=C:\Users\frost\AppData\Local\Ollama\files\errors
OLLAMA_LIBRARY_PATH=C:\Users\frost\AppData\Local\Ollama\files\library
```

### Ollama Configuration
```
OLLAMA_URL=https://ollama.frostech.site
OLLAMA_MODEL=vofc-engine:latest
AUTO_PROCESS_ON_UPLOAD=false
```

### Existing Variables (Already Set)
These are already configured in your Vercel project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_PASSWORD`

## Steps to Update Vercel

1. Go to your Vercel Dashboard
2. Select your VOFC Engine project
3. Navigate to **Settings** → **Environment Variables**
4. Click **Add New** for each variable above
5. Copy the exact Variable Name and Value from above
6. For Scope, select **All Environments** (or Production, Preview, Development as needed)
7. Click **Save**
8. **Redeploy** your application to apply changes

## Important Notes

⚠️ **Storage Paths**: The Windows paths (`C:\Users\frost\...`) are for local development. For production on Vercel, you would need to use Linux paths or configure Vercel's filesystem storage.

📝 **Recommendation**: For production, consider:
- Using Vercel Blob Storage
- Or configuring a shared volume in your Ollama server
- Or using the remote Ollama server filesystem at `https://ollama.frostech.site`

## Alternative: Remote Storage

If you want to store files on the remote Ollama server instead of local Windows paths:

```
OLLAMA_INCOMING_PATH=/var/ollama/uploads/incoming
OLLAMA_PROCESSED_PATH=/var/ollama/uploads/processed
OLLAMA_ERROR_PATH=/var/ollama/uploads/errors
OLLAMA_LIBRARY_PATH=/var/ollama/uploads/library
```

This requires implementing a file management API on your Ollama server to handle remote file operations.
