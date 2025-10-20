# Scripts

This directory contains one-off utilities grouped by function. Run scripts with Node.js unless a file explicitly requires another runtime.

## Folders

- checks: Validation and audit scripts for schema, data, and environment.
- setup: Initial data setup and population helpers.
- fixes: Data fixes and schema updates that modify records or structure.
- test: Manual test and debug scripts.
- restore: Restore and backup-related tools.
- sql: SQL files referenced by scripts or used directly in the DB console.

## Usage

From the project root:

```bash
node scripts/checks/check-schema.js
node scripts/setup/setup-sources.js
node scripts/fixes/apply-rls-fix.js
node scripts/test/test-login-flow.js
```

Some scripts expect environment variables (e.g., SUPABASE keys). Ensure `.env.local` is populated accordingly before running.

## Notes

- Review scripts before running in production—many change data.
- Prefer running checks before fixes.
- Keep new scripts small and single-purpose; place them in the correct folder based on intent.
