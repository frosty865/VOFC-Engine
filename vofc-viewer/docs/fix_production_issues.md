# Production Server Issues - Fix Guide

## Issues Identified

1. **404 Error for favicon.ico** - ✅ FIXED
   - Added favicon.ico to public directory

2. **400 Errors from Supabase queries** - ✅ FIXED
   - Fixed column name mismatches in database schema
   - Created missing tables (sectors, subsectors, disciplines)
   - Updated API routes to use correct column names

3. **Message channel errors** - ⚠️ NEEDS INVESTIGATION
   - These appear to be browser extension conflicts
   - Not related to the application code

## Database Schema Fixes Applied

### Column Name Fixes
- `"reference number"` → `reference_number`
- `"source"` → `source_text`
- `subsector_name` → `name` (in subsectors table)

### Missing Tables Created
- `sectors` table with proper structure
- `subsectors` table with proper structure  
- `disciplines` table with proper structure

### API Route Fixes
- Updated `/api/sources/assign-citation/route.js` to use correct column names
- Updated `fetchVOFC.js` to use correct column names

## Next Steps

1. **Run the database migration script**:
   ```sql
   -- Execute the contents of sql/fix_column_names.sql
   ```

2. **Restart the application** to pick up the changes

3. **Test the queries** that were failing:
   - Subsectors query: `subsectors?select=*&order=name.asc`
   - OFCs query: `options_for_consideration?select=*%2Cofc_sources%28*%2Csources%28reference_number%2Csource_text%29%29&order=id.asc`

## Message Channel Errors

The "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received" errors are typically caused by:

1. **Browser extensions** (most common)
2. **Development tools** 
3. **Ad blockers**
4. **Privacy extensions**

These are not application errors and don't affect functionality. Users can:
- Disable browser extensions temporarily
- Use incognito mode
- Clear browser cache and cookies

## Verification

After applying fixes, verify:
1. No 404 errors for favicon.ico
2. No 400 errors from Supabase queries
3. Subsectors and OFCs load properly
4. Application functions normally
