# Database Reindexing

This script recreates all database indexes for optimal query performance.

## Prerequisites

You need one of the following:

1. **Database Connection String** (Recommended):
   - Set `DATABASE_URL` or `SUPABASE_DB_URL` in your `.env.local` file
   - Format: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`
   - Get this from Supabase Dashboard → Settings → Database → Connection string

2. **Supabase RPC Function** (Alternative):
   - Create an `exec` function in your Supabase database:
   ```sql
   CREATE OR REPLACE FUNCTION exec(sql text)
   RETURNS void
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     EXECUTE sql;
   END;
   $$;
   ```

## Usage

```bash
node scripts/reindex-database.js
```

## What It Does

1. Drops and recreates all database indexes
2. Analyzes tables for query planner optimization
3. Improves query performance across the application

## Indexes Created

- Submission vulnerabilities indexes (submission_id, discipline, created_at, sector, subsector, question)
- Submission OFCs indexes (submission_id, discipline, vulnerability_id)
- Submission sources indexes (submission_id, reference_number)
- Submission links indexes (submission_id, vulnerability_id, ofc_id)
- Submission OFC sources indexes (submission_id, ofc_id, source_id)
- Submissions table indexes (type_status, created_at, reviewed_at, reviewed_by, status)
- Vulnerabilities table indexes (discipline)
- User profiles indexes (user_id, role)
- User groups indexes (name)

