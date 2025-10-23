# RLS Fix Guide for VOFC Engine Submissions

## Problem
The submissions table has Row Level Security (RLS) enabled, but the current policies don't allow anonymous users to insert data. This prevents the submission form from working.

## Error Details
- **Error Code**: 42501 (insufficient privilege)
- **Error Message**: "new row violates row-level security policy for table 'submissions'"
- **Root Cause**: RLS policies don't allow anonymous users to INSERT

## Solutions

### Option 1: Fix RLS Policies (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication > Policies**
   - Find the "submissions" table
   - Click "New Policy"

3. **Create New Policy**
   - **Policy name**: "Allow anonymous submissions"
   - **Operation**: INSERT
   - **Target roles**: anon
   - **USING expression**: `true`
   - **WITH CHECK expression**: `true`

4. **Save the policy**

### Option 2: Disable RLS (Simpler but less secure)

If you have direct database access, run:
```sql
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
```

### Option 3: Use Service Role Key

1. **Get Service Role Key**
   - Go to Supabase Dashboard > Settings > API
   - Copy the "service_role" key (not the anon key)

2. **Add to Environment**
   - Add `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here` to `.env.local`

3. **Update API Route**
   - The API route is already configured to use the service role key when available

## Testing

After applying the fix, test with:
```bash
node scripts/test-submission.js
```

## Verification

The submission should work if:
1. ✅ Database connection is successful
2. ✅ RLS policies allow anonymous inserts
3. ✅ API endpoint returns 201 status
4. ✅ Data appears in submissions table

## Current Status

- ✅ Database connection: Working
- ✅ API route: Fixed
- ❌ RLS policies: Need manual fix
- ❌ Submissions: Blocked by RLS

## Next Steps

1. Apply one of the solutions above
2. Test the submission form at http://localhost:3000/submit
3. Verify data appears in the database
