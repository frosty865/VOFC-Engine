# Authentication & Environment Variable Fixes

## Summary of Changes

This document outlines the fixes applied to resolve authentication loops, import path issues, and environment variable configuration problems.

## ✅ Fixed Issues

### 1. Standardized Supabase Client Imports

**Created:**
- `app/lib/supabase-client.js` - Client-side Supabase client (browser)
- `app/lib/supabase-admin.js` - Server-side Supabase client (service role, API routes only)

**Updated:**
- `app/lib/supabaseClient.js` - Now re-exports from standardized clients for backward compatibility
- All components now use `@/app/lib/supabase-client.js` for client-side
- All API routes use `@/app/lib/supabase-admin.js` for server-side

### 2. Fixed Login Loop Issues

**RoleGate Component (`components/RoleGate.jsx`):**
- Added proper session error handling
- Added 10-second timeout to prevent infinite loading
- Improved error messages for 401/403 responses
- Removed fallback that could cause loops
- Added cleanup on unmount

### 3. Improved Admin Authentication

**API Routes:**
- Updated `/api/admin/submissions/route.js` to use standardized admin client
- Updated `/api/auth/verify/route.js` to use standardized admin client
- Added proper error handling for missing environment variables

### 4. Added Error Handling & Guardrails

**Admin Pages:**
- Added detailed error messages showing HTTP status codes
- Added console logging of API response status for debugging
- Improved error UI with helpful messages
- Added timeout handling to prevent infinite loading states

**Profile Page:**
- Fixed `submitter_email` column query with fallback to client-side filtering
- Better error handling for rejected submissions

## 🔧 Required Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

## 📋 Supabase Auth Configuration

In **Supabase Dashboard → Authentication → URL Configuration**:

1. Add your production URL to **Redirect URLs**:
   - `https://your-domain.vercel.app/**`
   - `https://your-project.vercel.app/**` (for preview deployments)

2. Ensure JWT secrets match your environment variables

## 🔍 How to Verify Fixes

1. **Check Browser Console:**
   - Should see HTTP status codes for API calls
   - Should see specific error messages for auth failures
   - Should NOT see infinite loading or loops

2. **Test Admin Access:**
   - Try accessing `/admin` - should show loading then either grant access or redirect
   - Check network tab for `/api/auth/verify` responses
   - Should see 401/403 with clear error messages if access denied

3. **Check Environment Variables:**
   - Verify all required variables are set in Vercel
   - Check Supabase dashboard for correct URLs in redirect settings

## 🚨 Common Issues & Solutions

### Issue: "Cannot read property 'auth' of null"
**Solution:** Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### Issue: Admin page shows blank/500 error
**Solution:** 
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check that your user has `role = 'admin'` in `user_profiles` table
- Check browser console for API error status codes

### Issue: Login loop / redirect loop
**Solution:**
- Clear browser cookies/localStorage
- Check Supabase Auth redirect URLs match your deployment URL
- Verify `NEXT_PUBLIC_SITE_URL` matches your actual domain

### Issue: 400 Bad Request on submissions query
**Solution:**
- The `submitter_email` column may not exist in your schema
- Code now falls back to client-side filtering automatically

## 📝 Import Path Reference

**For Client Components:**
```javascript
import { supabase } from '@/app/lib/supabase-client.js'
```

**For API Routes / Server Components:**
```javascript
import { supabaseAdmin } from '@/app/lib/supabase-admin.js'
```

**Backward Compatibility (still works):**
```javascript
import { supabase } from './lib/supabaseClient'  // Re-exports from supabase-client.js
```

## ⚠️ Important Notes

- **Never use `supabaseAdmin` in client components** - it bypasses RLS and exposes service role key
- **Always use `supabaseAdmin` in API routes** - needed to bypass RLS for admin operations
- **Check browser console** for detailed error messages with HTTP status codes
- **All auth errors now log to console** for easier debugging

## 🔄 Next Steps

1. Set environment variables in Vercel
2. Configure Supabase redirect URLs
3. Verify admin user role in database
4. Test admin pages and check console for errors
5. Monitor for any remaining login loops or auth issues

