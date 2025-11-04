# VOFC Engine - Cleanup Checklist

## Files to Review for Removal/Archiving

### 1. Beast Variant Files (Check if still referenced)
- [ ] `app/api/documents/process/route-Beast.js`
- [ ] `app/api/auth/verify/route-Beast.js`
- [ ] `app/lib/fetchVOFC-Beast.js`
- [ ] `app/lib/supabaseClient-Beast.js`
- [ ] `app/lib/auth-Beast.js`
- [ ] `app/components/Navigation-Beast.jsx`

**Action:** Search codebase for imports/references before removing

### 2. Old Admin Pages
- [ ] `app/admin/page-old.jsx`
- [ ] `app/admin/page-clean.jsx`

**Action:** Verify they're not linked anywhere, then archive

### 3. Unused Document Processing Routes (Verify usage)
- [ ] `app/api/documents/process-all/route.js`
- [ ] `app/api/documents/process-simple/route.js`
- [ ] `app/api/documents/process-queue/route.js`
- [ ] `app/api/documents/process-vofc/route.ts`

**Action:** Check if these routes are referenced or used

### 4. Debug Routes to Consolidate
Move to `app/api/_debug/`:
- [ ] `app/api/debug-auth/route.js`
- [ ] `app/api/debug-cookies/route.js`
- [ ] `app/api/debug-login/route.js`
- [ ] `app/api/debug-ofcs/route.js`
- [ ] `app/api/debug-user/` (directory)
- [ ] `app/api/debug-users/route.js`

### 5. Test Routes to Consolidate
Move to `app/api/_test/`:
- [ ] `app/api/test-db/` (directory)
- [ ] `app/api/test-env/route.js`
- [ ] `app/api/test-frosty/` (directory)
- [ ] `app/api/test-function/route.js`
- [ ] `app/api/test-simple/route.js`
- [ ] `app/api/test-status/route.js`
- [ ] `app/api/test-storage/` (directory)

## Safe Cleanup (Can do now)

### Directories to Create
- [x] `app/api/_debug/` - For consolidated debug routes
- [x] `app/api/_test/` - For consolidated test routes  
- [x] `app/archive/` - For old/unused files

## Post-Move Actions

After moving files, update:
1. All import statements
2. Route references in code
3. API documentation
4. Any configuration files that reference these routes

## Notes

- Use `_` prefix for debug/test directories to keep them at bottom of listings
- Keep archive directory for reference, not delete
- Document any breaking changes before moving files

