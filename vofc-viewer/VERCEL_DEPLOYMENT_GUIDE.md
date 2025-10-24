# Vercel Deployment Guide

## Issues Identified

The Vercel deployment is failing because:

1. **Missing Environment Variables** - Supabase credentials not configured
2. **Build Issues** - Permission problems with .next directory
3. **Database Schema** - Production database may not have the fixes applied

## Step-by-Step Fix

### 1. Set Up Environment Variables in Vercel

You need to configure these environment variables in your Vercel dashboard:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**How to set them:**
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with the correct values

### 2. Apply Database Schema Fixes to Production

Run these SQL commands in your **production Supabase database**:

```sql
-- Check current structure first
SELECT column_name FROM information_schema.columns WHERE table_name = 'sources';

-- If columns are named "reference number" and "source", rename them:
ALTER TABLE sources RENAME COLUMN "reference number" TO reference_number;
ALTER TABLE sources RENAME COLUMN "source" TO source_text;

-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subsectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sector_id UUID REFERENCES sectors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and create policies
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to sectors" ON sectors FOR SELECT USING (true);
CREATE POLICY "Allow public read access to subsectors" ON subsectors FOR SELECT USING (true);
CREATE POLICY "Allow public read access to disciplines" ON disciplines FOR SELECT USING (true);

-- Insert default data
INSERT INTO sectors (id, name, description) VALUES 
    (gen_random_uuid(), 'Critical Infrastructure', 'Essential services and systems'),
    (gen_random_uuid(), 'Cybersecurity', 'Information security and digital systems'),
    (gen_random_uuid(), 'Physical Security', 'Physical protection and access control'),
    (gen_random_uuid(), 'Emergency Management', 'Disaster response and preparedness'),
    (gen_random_uuid(), 'Personnel Security', 'Human resources and background checks')
ON CONFLICT DO NOTHING;
```

### 3. Deploy to Vercel

```bash
# Clean build
rm -rf .next
npm run build

# Deploy
vercel --prod
```

### 4. Verify Deployment

After deployment, test these endpoints:
- `https://your-app.vercel.app/favicon.ico` (should not return 404)
- `https://your-app.vercel.app/` (should load without console errors)

## Common Issues and Solutions

### Issue: "column does not exist" errors
**Solution**: Run the database schema fixes in your production Supabase database

### Issue: Environment variables not found
**Solution**: Set the environment variables in Vercel dashboard

### Issue: Build fails with permission errors
**Solution**: Clean the .next directory and rebuild

### Issue: 400 errors from Supabase
**Solution**: Ensure the database schema matches the application expectations

## Quick Fix Commands

```bash
# Clean and rebuild
rm -rf .next node_modules/.cache
npm install
npm run build

# Deploy
vercel --prod
```

## Environment Variables Checklist

- [ ] NEXT_PUBLIC_SUPABASE_URL set in Vercel
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set in Vercel  
- [ ] SUPABASE_SERVICE_ROLE_KEY set in Vercel
- [ ] Database schema updated in production
- [ ] All tables exist with correct column names
