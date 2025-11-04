# VOFC Engine - Project Organization

## Current Structure Analysis

### Issues Identified:
1. **Multiple versions of same files** (Beast variants, old versions)
2. **Debug/test routes scattered** across API directory
3. **Many document processing route variants**
4. **Unused/old page files** in admin directory
5. **Inconsistent naming conventions**

## Recommended Organization

### 1. API Routes Structure
```
app/api/
├── admin/              # Admin operations
├── auth/              # Authentication
├── dashboard/         # Dashboard data
├── documents/         # Document processing (consolidate variants)
├── learning/          # Learning system
├── monitor/           # System monitoring
├── proxy/             # Proxy routes (Flask, Ollama)
├── public/            # Public APIs
├── security/          # Security operations
├── sources/           # Source management
├── submissions/       # Submission handling
├── vulnerabilities/   # Vulnerability operations
├── sectors/           # Sector management
├── subsectors/        # Subsector management
├── disciplines/       # Discipline management
├── tools/             # Utility tools
├── utils/             # API utilities
├── _debug/            # ⚠️ Debug routes (consolidated)
└── _test/             # ⚠️ Test routes (consolidated)
```

### 2. Components Organization
```
app/components/
├── cards/             # Card components (OFCCard, VulnerabilityCard, etc.)
├── forms/             # Form components (PSASubmission, StructuredSubmissionView)
├── monitoring/        # Monitoring components (ProcessingMonitor, LearningMonitor)
├── panels/            # Panel components (AIToolsPanel, ProcessToolsPanel)
└── shared/            # Shared utilities (SafeHTML, DomainFilter)
```

### 3. Lib Files Organization
```
app/lib/
├── auth/              # Authentication utilities
├── database/          # Database clients (supabase-*.js)
├── fetch/             # Data fetching (fetchVOFC.js, etc.)
└── utils/             # General utilities
```

### 4. Pages Organization
```
app/
├── admin/             # Admin pages (remove old files)
├── dashboard/         # Dashboard pages
├── submit/            # Submission pages
└── [feature]/         # Feature-specific pages
```

## Cleanup Actions Needed

### Files to Archive/Remove:
1. **Old/Unused Files:**
   - `app/admin/page-old.jsx`
   - `app/admin/page-clean.jsx`
   - All `-Beast.js` variants (if no longer needed)

2. **Consolidate Debug Routes:**
   - Move all `debug-*` routes to `app/api/_debug/`
   - Move all `test-*` routes to `app/api/_test/`

3. **Document Processing Routes:**
   - Keep: `process-pending`, `process-one`, `process-batch-enhanced`
   - Archive: `process-all`, `process-simple`, `process-queue`, `process-vofc` (if unused)

## Implementation Plan

1. Create archive directory for old files
2. Move debug/test routes to consolidated locations
3. Remove unused route variants
4. Update imports after moving files
5. Document the new structure

