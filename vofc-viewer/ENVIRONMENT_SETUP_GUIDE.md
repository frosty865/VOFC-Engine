# Environment Setup Guide

## 🚨 Missing Environment Variables

Your application is failing because the required Supabase environment variables are missing. Follow these steps to fix it:

## 📋 Required Environment Variables

You need to create a `.env.local` file in your `vofc-viewer` directory with the following variables:

```bash
# Supabase Configuration - REQUIRED
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Ollama Configuration
OLLAMA_URL=https://ollama.frostech.site
OLLAMA_MODEL=vofc-engine:latest

# Application Configuration
NEXTAUTH_SECRET=your_secret_key_here
NEXTAUTH_URL=http://localhost:3000
```

## 🔑 How to Get Supabase Credentials

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to Settings → API**
4. **Copy the following values**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## 📝 Quick Setup Steps

1. **Create the environment file**:
   ```bash
   cd vofc-viewer
   copy .env.local.template .env.local
   ```

2. **Edit `.env.local`** and replace the placeholder values with your actual Supabase credentials

3. **Restart the development server**:
   ```bash
   npm run dev
   ```

## ✅ Verification

After setting up the environment variables, you should see:
- ✅ No more "Missing SUPABASE_SERVICE_ROLE_KEY" errors
- ✅ No more "supabaseKey is required" errors
- ✅ Application loads without Supabase errors

## 🔧 Troubleshooting

If you're still getting errors:

1. **Check file location**: Make sure `.env.local` is in the `vofc-viewer` directory
2. **Check variable names**: Ensure exact spelling and no extra spaces
3. **Restart server**: Stop and restart `npm run dev`
4. **Check Supabase project**: Make sure your Supabase project is active

## 📞 Need Help?

If you don't have Supabase credentials or need help setting up a new project, let me know and I can help you create one!
