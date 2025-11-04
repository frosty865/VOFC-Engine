# VOFC Engine - Quick Organization Reference

## 📂 Directory Structure

```
vofc-viewer/
├── app/
│   ├── api/                    # API Routes (~120+ routes)
│   │   ├── admin/              # Admin operations
│   │   ├── auth/               # Authentication
│   │   ├── dashboard/          # Dashboard endpoints
│   │   ├── documents/          # Document processing (30+ routes)
│   │   ├── proxy/              # Backend proxies
│   │   │   ├── flask/         # Flask server proxy
│   │   │   └── ollama/        # Ollama API proxy
│   │   ├── sectors/            # ✅ Sector management
│   │   ├── subsectors/         # ✅ Subsector management
│   │   ├── _debug/             # Debug routes (to be consolidated)
│   │   └── _test/              # Test routes (to be consolidated)
│   ├── components/             # React Components (19 files)
│   ├── lib/                    # Library/utility files
│   │   ├── fetchVOFC.js       # ✅ Main data fetching
│   │   └── supabase-*.js      # Database clients
│   ├── admin/                  # Admin pages
│   ├── dashboard/              # Dashboard page
│   ├── submit/                 # Submission pages
│   └── archive/                # Archived/unused files
├── ORGANIZATION_SUMMARY.md      # Detailed organization info
├── CLEANUP_CHECKLIST.md        # Files to review/archive
└── CURRENT_STATUS.md           # Current project status
```

## 🎯 Key Files (Recent Work)

### Sector/Subsector System
- `app/api/sectors/route.js` - Sector API (admin client)
- `app/api/subsectors/route.js` - Subsector API (admin client)
- `app/lib/fetchVOFC.js` - Updated fetch functions
- `app/page.jsx` - Main dashboard with menus

### Processing Dashboard
- `app/components/VOFCProcessingDashboard.jsx` - Dashboard component
- `app/api/proxy/flask/process-pending/route.js` - Flask proxy

## 📋 Quick Actions

**View Organization Details:**
- `ORGANIZATION_SUMMARY.md` - Full organization analysis
- `CLEANUP_CHECKLIST.md` - Files to review/archive
- `CURRENT_STATUS.md` - Current status and recent work

**Files Safe to Archive:**
- All `-Beast.js` files (not referenced)
- `app/admin/page-old.jsx` (unused)
- `app/admin/page-clean.jsx` (unused)

## 🔧 Maintenance

- Debug routes: Move to `app/api/_debug/`
- Test routes: Move to `app/api/_test/`
- Old files: Move to `app/archive/`

---

**Last Updated:** Organization documentation created
**Status:** ✅ Well-organized, minor cleanup opportunities identified

