# VOFC Engine Environment Configuration Guide

## Required Environment Variables

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### Ollama Configuration
- `OLLAMA_URL`: Ollama server URL (default: https://ollama.frostech.site)
- `OLLAMA_MODEL`: Ollama model to use (default: mistral:latest)

### Optional Configuration
- `VERCEL_URL`: Vercel deployment URL
- `NEXT_PUBLIC_SITE_URL`: Your site URL (default: https://www.zophielgroup.com)

## Setting Environment Variables

### For Vercel Deployment:
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add the required variables above

### For Local Development:
1. Create a `.env.local` file in the project root
2. Add the environment variables above

## Current Issues Fixed:
- ✅ Multiple GoTrueClient instances eliminated
- ✅ Dashboard API 500 errors resolved
- ✅ Document processing API updated
- ✅ Auth verify API improved
- ⚠️ Ollama URL needs to be configured in Vercel environment variables
