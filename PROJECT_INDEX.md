# VOFC Engine - Complete Project Index

## 📊 Database Schema & Tables

### Production Tables
| Table Name | Purpose | Key Columns | Relationships |
|------------|---------|-------------|---------------|
| `vulnerabilities` | Core vulnerability data | `id`, `vulnerability`, `discipline` | Links to OFCs |
| `options_for_consideration` | OFC data | `id`, `option_text`, `discipline`, `vulnerability_id` | Links to vulnerabilities |
| `sources` | Source references | `id`, `source_text`, `reference_number` | Links to OFCs |
| `vulnerability_ofc_links` | Vulnerability-OFC relationships | `vulnerability_id`, `ofc_id` | Many-to-many |
| `ofc_sources` | OFC-Source relationships | `ofc_id`, `source_id` | Many-to-many |
| `submissions` | Submission tracking | `id`, `type`, `status`, `data` | Parent to submission tables |

### Submission Mirror Tables
| Table Name | Purpose | Key Columns | Relationships |
|------------|---------|-------------|---------------|
| `submission_vulnerabilities` | Submission vulnerability data | `id`, `submission_id`, `vulnerability` | Links to submissions |
| `submission_options_for_consideration` | Submission OFC data | `id`, `submission_id`, `option_text` | Links to submission vulnerabilities |
| `submission_sources` | Submission source data | `id`, `submission_id`, `source_text` | Links to submissions |
| `submission_vulnerability_ofc_links` | Submission vulnerability-OFC links | `vulnerability_id`, `ofc_id` | Links submission tables |
| `submission_ofc_sources` | Submission OFC-Source links | `ofc_id`, `source_id` | Links submission tables |

### Database Views
| View Name | Purpose | Source Tables |
|-----------|---------|---------------|
| `vulnerabilities_with_ofcs` | Vulnerabilities with OFC counts | `vulnerabilities`, `vulnerability_ofc_links` |
| `ofcs_with_sources` | OFCs with source counts | `options_for_consideration`, `ofc_sources` |
| `submission_vulnerabilities_with_ofcs` | Submission vulnerabilities with OFC counts | `submission_vulnerabilities`, `submission_vulnerability_ofc_links` |
| `submission_ofcs_with_sources` | Submission OFCs with source counts | `submission_options_for_consideration`, `submission_ofc_sources` |

## 🛣️ API Routes

### Submission Routes
| Route | Method | Purpose | File Location |
|-------|--------|---------|---------------|
| `/api/submissions` | POST | Create new submission | `vofc-viewer/app/api/submissions/route.js` |
| `/api/submissions/[id]/approve` | POST | Approve submission | `vofc-viewer/app/api/submissions/[id]/approve/route.js` |
| `/api/submissions/[id]/reject` | POST | Reject submission | `vofc-viewer/app/api/submissions/[id]/reject/route.js` |
| `/api/submissions/[id]/delete` | DELETE | Delete submission | `vofc-viewer/app/api/submissions/[id]/delete/route.js` |
| `/api/submissions/structured` | GET/POST | Structured submission data | `vofc-viewer/app/api/submissions/structured/route.js` |

### Document Processing Routes
| Route | Method | Purpose | File Location |
|-------|--------|---------|---------------|
| `/api/documents/list` | GET | List available documents | `vofc-viewer/app/api/documents/list/route.js` |
| `/api/documents/status` | GET | Get document status | `vofc-viewer/app/api/documents/status/route.js` |
| `/api/documents/completed` | GET | Get completed documents | `vofc-viewer/app/api/documents/completed/route.js` |
| `/api/documents/failed` | GET | Get failed documents | `vofc-viewer/app/api/documents/failed/route.js` |
| `/api/documents/process` | POST | Process single document | `vofc-viewer/app/api/documents/process/route.js` |
| `/api/documents/process-batch` | POST | Process multiple documents | `vofc-viewer/app/api/documents/process-batch/route.js` |
| `/api/documents/process-all` | POST | Process all documents | `vofc-viewer/app/api/documents/process-all/route.js` |
| `/api/documents/retry/[filename]` | POST | Retry failed document | `vofc-viewer/app/api/documents/retry/[filename]/route.js` |
| `/api/documents/preview` | GET | Preview document content | `vofc-viewer/app/api/documents/preview/route.js` |

### Admin Routes
| Route | Method | Purpose | File Location |
|-------|--------|---------|---------------|
| `/api/admin/users` | GET | Get user list | `vofc-viewer/app/api/admin/users/route.js` |
| `/api/admin/ofcs` | GET | Get OFC list | `vofc-viewer/app/api/admin/ofcs/route.js` |
| `/api/admin/vulnerabilities` | GET | Get vulnerability list | `vofc-viewer/app/api/admin/vulnerabilities/route.js` |
| `/api/admin/stats` | GET | Get system statistics | `vofc-viewer/app/api/admin/stats/route.js` |

### Authentication Routes
| Route | Method | Purpose | File Location |
|-------|--------|---------|---------------|
| `/api/auth/login` | POST | User login | `vofc-viewer/app/api/auth/login/route.js` |
| `/api/auth/logout` | POST | User logout | `vofc-viewer/app/api/auth/logout/route.js` |
| `/api/auth/register` | POST | User registration | `vofc-viewer/app/api/auth/register/route.js` |
| `/api/auth/verify` | POST | Verify user session | `vofc-viewer/app/api/auth/verify/route.js` |
| `/api/auth/reset` | POST | Password reset | `vofc-viewer/app/api/auth/reset/route.js` |

### Utility Routes
| Route | Method | Purpose | File Location |
|-------|--------|---------|---------------|
| `/api/health` | GET | Health check | `vofc-viewer/app/api/health/route.js` |
| `/api/metrics` | GET | System metrics | `vofc-viewer/app/api/metrics/route.js` |
| `/api/sources` | GET | Get sources | `vofc-viewer/app/api/sources/route.js` |

## 📁 File Structure

### Root Directory
```
VOFC Engine/
├── create-submission-tables.js          # Main setup script
├── heuristic-parser-tool.js             # Heuristic parser integration
├── package.json                         # Dependencies
├── README.md                             # Main documentation
├── PROCESS_FLOW.md                      # Process flow documentation
├── PROJECT_INDEX.md                     # This file
├── heuristic_parser/                     # Python heuristic parser
│   ├── vofc_heuristic_parser.py         # Main parser script
│   ├── requirements.txt                 # Python dependencies
│   └── README-VOFC-PARSER.md           # Parser documentation
└── vofc-viewer/                         # Main Next.js application
```

### Main Application (vofc-viewer/)
```
vofc-viewer/
├── app/                                 # Next.js app directory
│   ├── admin/                           # Admin pages
│   │   ├── page.jsx                     # Admin dashboard
│   │   ├── ofcs/page.jsx               # OFC management
│   │   └── users/page.jsx              # User management
│   ├── api/                            # API routes
│   │   ├── admin/                      # Admin API routes
│   │   ├── auth/                       # Authentication API routes
│   │   ├── documents/                  # Document processing API routes
│   │   ├── submissions/                # Submission API routes
│   │   ├── health/                     # Health check API
│   │   ├── metrics/                    # Metrics API
│   │   └── sources/                    # Sources API
│   ├── components/                     # React components
│   │   ├── Navigation.jsx              # Main navigation
│   │   ├── OFCCard.jsx                 # OFC display component
│   │   ├── QuestionCard.jsx            # Question display component
│   │   ├── SafeHTML.jsx                # Safe HTML rendering
│   │   └── VulnerabilityCard.jsx       # Vulnerability display component
│   ├── lib/                            # Utility libraries
│   │   ├── auth-client.js              # Client-side auth
│   │   ├── auth.js                     # Server-side auth
│   │   ├── fetchOFCFixed.js            # OFC fetching utilities
│   │   ├── fetchVOFC.js                # VOFC fetching utilities
│   │   └── supabaseClient.js           # Supabase client
│   ├── login/                          # Login pages
│   ├── profile/                        # User profile
│   ├── submit/                         # Submission pages
│   ├── vulnerabilities/                # Vulnerability pages
│   └── layout.jsx                      # Root layout
├── components/                         # Shared components
│   ├── admin/UserManagement.jsx       # User management component
│   ├── AnalyticsProvider.jsx           # Analytics provider
│   ├── LoginForm.jsx                   # Login form component
│   ├── Navigation.jsx                  # Navigation component
│   └── SessionTimeoutWarning.jsx       # Session timeout component
├── lib/                                # Shared libraries
│   ├── auth-client.js                  # Client authentication
│   ├── auth-server.js                  # Server authentication
│   ├── database-backup.js              # Database backup utilities
│   ├── error-handler.js                # Error handling utilities
│   ├── monitoring.js                   # Monitoring utilities
│   ├── security.js                     # Security utilities
│   └── useSessionTimeout.js            # Session timeout hook
├── scripts/                            # Utility scripts
│   ├── create-submission-tables.js     # Table creation script
│   ├── migrate-to-structured-tables.js # Data migration script
│   ├── process-pending-submissions.js  # Process submissions script
│   ├── verify-processed-submissions.js # Verification script
│   └── [50+ other utility scripts]    # Various utility scripts
├── sql/                                # SQL schema files
│   ├── submission-tables-schema.sql    # Submission tables schema
│   ├── fix-foreign-keys.sql           # Foreign key fixes
│   ├── fix-rls-policies.sql           # RLS policy fixes
│   └── sources_schema.sql             # Sources schema
├── data/                               # Data directories
│   ├── docs/                          # Input documents
│   ├── processing/                    # Documents being processed
│   ├── completed/                     # Successfully processed documents
│   ├── failed/                        # Failed document processing
│   ├── temp/                          # Temporary files
│   └── heuristic-parsed/              # Heuristic parser output
└── supabase/                          # Supabase configuration
    ├── config.toml                    # Supabase configuration
    └── functions/                    # Supabase functions
```

## 🔧 SQL Schema Files

### Schema Files
| File | Purpose | Location |
|------|---------|----------|
| `submission-tables-schema.sql` | Complete submission mirror tables schema | `vofc-viewer/sql/submission-tables-schema.sql` |
| `fix-foreign-keys.sql` | Foreign key constraint fixes | `vofc-viewer/sql/fix-foreign-keys.sql` |
| `fix-rls-policies.sql` | Row Level Security policy fixes | `vofc-viewer/sql/fix-rls-policies.sql` |
| `sources_schema.sql` | Sources table schema | `vofc-viewer/sql/sources_schema.sql` |
| `sources_simple.sql` | Simplified sources schema | `vofc-viewer/sql/sources_simple.sql` |

### Database Functions
| Function | Purpose | Location |
|----------|---------|----------|
| `move_submission_to_production()` | Move submission data to production tables | `submission-tables-schema.sql` |
| `cleanup_submission_data()` | Clean up submission data after approval | `submission-tables-schema.sql` |
| `check_orphaned_ofcs()` | Check for orphaned OFCs | `apps/backend/supabase/schema.sql` |
| `check_orphaned_links()` | Check for orphaned links | `apps/backend/supabase/schema.sql` |

## 🐍 Python Scripts

### Parser Scripts
| Script | Purpose | Location |
|--------|---------|----------|
| `vofc_heuristic_parser.py` | Main heuristic parser | `heuristic_parser/vofc_heuristic_parser.py` |
| `enhanced_parser.py` | Enhanced document parser | `vofc-viewer/apps/backend/parsers/enhanced_parser.py` |
| `universal_parser.py` | Universal document parser | `vofc-viewer/apps/backend/parsers/universal_parser.py` |
| `document_processor.py` | Document processing pipeline | `vofc-viewer/apps/backend/parsers/document_processor.py` |

### Backend Scripts
| Script | Purpose | Location |
|--------|---------|----------|
| `main.py` | Main backend application | `vofc-viewer/apps/backend/main.py` |
| `sector_mapper.py` | Sector mapping utilities | `vofc-viewer/apps/backend/ai/sector_mapper.py` |

## 📊 Data Directories

### Input Data
| Directory | Purpose | Location |
|-----------|---------|----------|
| `docs/` | Input documents for processing | `vofc-viewer/data/docs/` |
| `temp/` | Temporary processing files | `vofc-viewer/data/temp/` |

### Output Data
| Directory | Purpose | Location |
|-----------|---------|----------|
| `processing/` | Documents currently being processed | `vofc-viewer/data/processing/` |
| `completed/` | Successfully processed documents | `vofc-viewer/data/completed/` |
| `failed/` | Failed document processing | `vofc-viewer/data/failed/` |
| `heuristic-parsed/` | Heuristic parser output | `vofc-viewer/data/heuristic-parsed/` |

## 🛠️ Utility Scripts

### Database Scripts
| Script | Purpose | Location |
|--------|---------|----------|
| `create-submission-tables.js` | Create submission mirror tables | `create-submission-tables.js` |
| `migrate-to-structured-tables.js` | Migrate existing data | `vofc-viewer/scripts/migrate-to-structured-tables.js` |
| `process-pending-submissions.js` | Process pending submissions | `vofc-viewer/scripts/process-pending-submissions.js` |
| `verify-processed-submissions.js` | Verify processed submissions | `vofc-viewer/scripts/verify-processed-submissions.js` |

### Heuristic Parser Scripts
| Script | Purpose | Location |
|--------|---------|----------|
| `heuristic-parser-tool.js` | Main heuristic parser integration | `heuristic-parser-tool.js` |
| `test-enhanced-parser.js` | Test enhanced parser | `vofc-viewer/scripts/test-enhanced-parser.js` |
| `test-automatic-processing.js` | Test automatic processing | `vofc-viewer/scripts/test-automatic-processing.js` |

## 🔐 Security & Authentication

### Authentication Files
| File | Purpose | Location |
|------|---------|----------|
| `auth-client.js` | Client-side authentication | `vofc-viewer/lib/auth-client.js` |
| `auth-server.js` | Server-side authentication | `vofc-viewer/lib/auth-server.js` |
| `auth-middleware.js` | Authentication middleware | `vofc-viewer/lib/auth-middleware.js` |
| `security.js` | Security utilities | `vofc-viewer/lib/security.js` |

### Environment Files
| File | Purpose | Location |
|------|---------|----------|
| `.env.local` | Local environment variables | `vofc-viewer/.env.local` |
| `setup-env.js` | Environment setup script | `vofc-viewer/setup-env.js` |

## 📈 Monitoring & Analytics

### Monitoring Files
| File | Purpose | Location |
|------|---------|----------|
| `monitoring.js` | Monitoring utilities | `vofc-viewer/lib/monitoring.js` |
| `AnalyticsProvider.jsx` | Analytics provider component | `vofc-viewer/components/AnalyticsProvider.jsx` |

### Health Check Files
| File | Purpose | Location |
|------|---------|----------|
| `health/route.js` | Health check API | `vofc-viewer/app/api/health/route.js` |
| `metrics/route.js` | Metrics API | `vofc-viewer/app/api/metrics/route.js` |

## 🎯 Key Configuration Files

### Next.js Configuration
| File | Purpose | Location |
|------|---------|----------|
| `next.config.mjs` | Next.js configuration | `vofc-viewer/next.config.mjs` |
| `tailwind.config.js` | Tailwind CSS configuration | `vofc-viewer/tailwind.config.js` |
| `postcss.config.js` | PostCSS configuration | `vofc-viewer/postcss.config.js` |

### Package Management
| File | Purpose | Location |
|------|---------|----------|
| `package.json` | Node.js dependencies | `vofc-viewer/package.json` |
| `package-lock.json` | Lock file | `vofc-viewer/package-lock.json` |
| `pnpm-lock.yaml` | PNPM lock file | `pnpm-lock.yaml` |
| `pnpm-workspace.yaml` | PNPM workspace configuration | `pnpm-workspace.yaml` |

## 📋 Documentation Files

### Main Documentation
| File | Purpose | Location |
|------|---------|----------|
| `README.md` | Main project documentation | `README.md` |
| `PROCESS_FLOW.md` | Process flow documentation | `PROCESS_FLOW.md` |
| `PROJECT_INDEX.md` | This comprehensive index | `PROJECT_INDEX.md` |
| `SUBMISSION_MIRROR_TABLES_GUIDE.md` | Submission tables guide | `vofc-viewer/SUBMISSION_MIRROR_TABLES_GUIDE.md` |

### Setup Guides
| File | Purpose | Location |
|------|---------|----------|
| `AI_SETUP_GUIDE.md` | AI setup guide | `vofc-viewer/AI_SETUP_GUIDE.md` |
| `DEPLOYMENT.md` | Deployment guide | `vofc-viewer/DEPLOYMENT.md` |
| `DESIGN_SYSTEM.md` | Design system guide | `vofc-viewer/DESIGN_SYSTEM.md` |

This comprehensive index provides a complete overview of the VOFC Engine project structure, including all database tables, API routes, file locations, and their purposes.
