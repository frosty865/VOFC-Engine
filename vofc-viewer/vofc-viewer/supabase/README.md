# Supabase Integration

This project uses Supabase for database access and (optionally) edge functions. The app currently uses a custom JWT/session auth model in the Next.js API. Public read access to selected tables is enabled via RLS policies where appropriate.

## Auth model
- App authentication is handled by custom JWTs stored in cookies and validated against the `user_sessions` table.
- Admin and write operations are performed through Next.js API routes using the Supabase service role key (server-only), bypassing RLS where necessary.
- RLS policies using `auth.uid()` apply only if Supabase Auth is enabled. They do not affect API calls using the service role.

## SQL
- `sql/` contains schema and policy files. They are designed to be idempotent where possible.
- `sql/fix-foreign-keys.sql` checks for constraints before adding them and references `sources(id)` correctly.

## Seeds
- `supabase/seed.sql` exists to satisfy `config.toml` seed settings and can be extended for local data.

## Local development
Ensure `.env.local` contains:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Running SQL
- Run SQL via the Supabase SQL editor, `psql`, or the CLI.
- Prefer running checks before fixes.

## Edge Functions
- `supabase/functions/generate-question-i18n` provides a Deno edge function for generating i18n questions.
- Update bindings/permissions in Supabase as needed to invoke from the app.
