# VOFC Engine - Sorted File Index

## 📁 Root Directory Structure

### 🚀 Core Setup Files
```
VOFC Engine/
├── create-submission-tables.js          # Main database setup script
├── heuristic-parser-tool.js             # Heuristic parser integration
├── package.json                         # Root dependencies and scripts
├── pnpm-lock.yaml                       # PNPM lock file
├── pnpm-workspace.yaml                 # PNPM workspace configuration
├── vercel.json                          # Vercel deployment configuration
└── VOFC Engine.code-workspace         # VS Code workspace configuration
```

### 📚 Documentation Files
```
VOFC Engine/
├── README.md                            # Main project documentation
├── PROCESS_FLOW.md                      # Complete process flow documentation
├── PROJECT_INDEX.md                     # Comprehensive project index
├── QUICK_REFERENCE.md                   # Quick reference guide
└── SORTED_FILE_INDEX.md                 # This file
```

### 🧠 Heuristic Parser
```
heuristic_parser/
├── vofc_heuristic_parser.py             # Main heuristic parser script
├── requirements.txt                     # Python dependencies
└── README-VOFC-PARSER.md               # Parser documentation
```

### 📊 Data Files
```
VOFC Engine/
├── final_safe_vofc_library.json         # Final VOFC library data
├── improved_safe_vofc_library.json      # Improved VOFC library data
├── safe_vofc_library.json               # Safe VOFC library data
├── simple_safe_vofc_library.json        # Simple VOFC library data
├── working_safe_vofc_library.json      # Working VOFC library data
├── ofc_sources_import.csv              # OFC sources import data
└── vulnerability_ofc_links_import.csv   # Vulnerability-OFC links import
```

### 🗂️ Archive Directory
```
archive/
├── Assessment-Builder/                  # Assessment builder tools
├── BULK_SUBMISSION_GUIDE.md             # Bulk submission guide
├── README_USER_MANAGEMENT.md           # User management documentation
├── SECURITY_GUIDE.md                   # Security guide
├── SECURITY_SETUP_GUIDE.md             # Security setup guide
├── SECURITY_VERIFICATION.md            # Security verification guide
├── setup-env.md                        # Environment setup guide
├── final_cleanup.bat                   # Final cleanup script
├── sample-data.csv                     # Sample data file
├── docs/                               # Archive documentation
│   ├── ANALYTICS_SETUP.md              # Analytics setup guide
│   ├── API_DOCUMENTATION.md            # API documentation
│   ├── DATABASE_SCHEMA.md              # Database schema documentation
│   ├── DEPLOYMENT_GUIDE.md             # Deployment guide
│   ├── README.md                       # Archive README
│   └── SECURITY_ARCHITECTURE.md        # Security architecture guide
├── data/                               # Archive data
│   ├── imported/                       # Imported data files
│   └── out/                            # Output data files
├── logs/                               # Archive log files
├── Original Source Files/              # Original source data
│   ├── VOFC_options_for_consideration_v1.csv
│   ├── VOFC_vulnerabilities_v1.csv
│   └── VOFC_vulnerability_ofc_links_v1.csv
├── public/                             # Archive public assets
│   ├── favicon.ico
│   ├── file.svg
│   ├── globe.svg
│   ├── images/
│   │   └── cisa-logo.png
│   ├── next.svg
│   ├── templates/
│   │   └── vofc-bulk-template.csv
│   ├── vercel.svg
│   └── window.svg
├── scripts/                            # Archive utility scripts
│   └── [83 files: 75 *.js, 3 *.py, 2 *.sql, ...]
├── sql/                                # Archive SQL files
│   ├── backup_schema.sql
│   ├── enable_rls.sql
│   ├── fix_all_functions.sql
│   ├── fix_authenticate_user.sql
│   ├── fix_rls_policies.sql
│   ├── migrate_from_csv.sql
│   ├── migrate_staging_to_production.sql
│   ├── ofc_improvements.sql
│   ├── promote_functions.sql
│   ├── rejected_submissions_schema.sql
│   ├── staging_schema.sql
│   ├── staging.sql
│   ├── user_schema.sql
│   └── validation_functions.sql
├── src/                                # Archive source code
│   ├── db/                             # Database utilities
│   ├── main.py                         # Main Python application
│   ├── parsers/                        # Parser modules
│   ├── pipelines/                      # Data processing pipelines
│   └── utils/                          # Utility functions
└── vercel.json                         # Archive Vercel configuration
```

### 📖 Documentation Directory
```
docs/
├── data/
│   └── SAFE VOFC Library.pdf         # SAFE VOFC Library document
└── schema.md                           # Schema documentation
```

### 🛠️ Tools Directory
```
Tools/
└── README.md                           # Tools documentation
```

## 🎯 Main Application (vofc-viewer/)

### 📱 Next.js App Structure
```
vofc-viewer/app/
├── admin/                              # Admin pages
│   ├── page.jsx                        # Admin dashboard
│   ├── ofcs/page.jsx                   # OFC management page
│   └── users/page.jsx                  # User management page
├── api/                                # API routes
│   ├── admin/                          # Admin API routes
│   │   ├── ofcs/route.js               # OFC management API
│   │   ├── users/route.js              # User management API
│   │   ├── vulnerabilities/route.js   # Vulnerability management API
│   │   └── stats/route.js              # Statistics API
│   ├── auth/                           # Authentication API routes
│   │   ├── login/route.js              # Login API
│   │   ├── logout/route.js             # Logout API
│   │   ├── register/route.js           # Registration API
│   │   ├── verify/route.js             # Session verification API
│   │   └── reset/route.js              # Password reset API
│   ├── documents/                      # Document processing API routes
│   │   ├── list/route.js               # List documents API
│   │   ├── status/route.js             # Document status API
│   │   ├── completed/route.js          # Completed documents API
│   │   ├── failed/route.js             # Failed documents API
│   │   ├── process/route.js             # Process document API
│   │   ├── process-batch/route.js       # Batch process API
│   │   ├── process-all/route.js        # Process all documents API
│   │   ├── preview/route.js            # Document preview API
│   │   └── retry/[filename]/route.js   # Retry failed document API
│   ├── submissions/                    # Submission API routes
│   │   ├── route.js                    # Create submission API
│   │   ├── structured/route.js         # Structured submission data API
│   │   └── [id]/                       # Individual submission APIs
│   │       ├── approve/route.js         # Approve submission API
│   │       ├── reject/route.js          # Reject submission API
│   │       └── delete/route.js          # Delete submission API
│   ├── health/route.js                 # Health check API
│   ├── metrics/route.js                # Metrics API
│   └── sources/route.js                # Sources API
├── assessment/page.jsx                 # Assessment page
├── components/                         # App-specific components
│   ├── Navigation.jsx                  # Navigation component
│   ├── OFCCard.jsx                     # OFC display component
│   ├── QuestionCard.jsx                # Question display component
│   ├── SafeHTML.jsx                    # Safe HTML rendering
│   └── VulnerabilityCard.jsx           # Vulnerability display component
├── debug-login/page.jsx                # Debug login page
├── demo/page.jsx                       # Demo page
├── lib/                                # App-specific libraries
│   ├── auth-client.js                  # Client-side authentication
│   ├── auth.js                         # Server-side authentication
│   ├── fetchOFCFixed.js                # OFC fetching utilities
│   ├── fetchVOFC.js                    # VOFC fetching utilities
│   └── supabaseClient.js               # Supabase client
├── login/page.jsx                      # Login page
├── page.jsx                            # Home page
├── process/page.jsx                    # Document processing page
├── profile/page.jsx                    # User profile page
├── review/page.jsx                     # Review page
├── splash/page.jsx                     # Splash page
├── submit/                             # Submission pages
│   ├── page.jsx                        # Main submission page
│   └── bulk/page.jsx                   # Bulk submission page
├── submit-psa/page.jsx                 # PSA submission page
├── test-login/page.jsx                 # Test login page
├── vulnerabilities/page.jsx            # Vulnerabilities page
├── globals.css                         # Global styles
└── layout.jsx                          # Root layout
```

### 🎨 Components Directory
```
vofc-viewer/components/
├── admin/
│   └── UserManagement.jsx              # User management component
├── AnalyticsProvider.jsx             # Analytics provider
├── LoginForm.jsx                     # Login form component
├── Navigation.jsx                    # Navigation component
└── SessionTimeoutWarning.jsx         # Session timeout component
```

### 📚 Libraries Directory
```
vofc-viewer/lib/
├── auth-client.js                      # Client-side authentication
├── auth-middleware.js                  # Authentication middleware
├── auth-server.js                      # Server-side authentication
├── database-backup.js                  # Database backup utilities
├── error-handler.js                    # Error handling utilities
├── monitoring.js                       # Monitoring utilities
├── security.js                         # Security utilities
└── useSessionTimeout.js                # Session timeout hook
```

### 🗄️ Data Directories
```
vofc-viewer/data/
├── completed/                          # Successfully processed documents
│   ├── [2 *.json files]                # Processed document metadata
│   └── [2 *.txt files]                 # Processed document content
├── docs/                               # Input documents for processing
│   └── [1 *.txt file]                  # Sample document
├── failed/                            # Failed document processing
├── processing/                         # Documents currently being processed
├── temp/                              # Temporary processing files
└── heuristic-parsed/                  # Heuristic parser output (created during processing)
```

### 🛠️ Scripts Directory
```
vofc-viewer/scripts/
├── [70 *.js files]                     # JavaScript utility scripts
├── [54 *.py files]                     # Python utility scripts
└── [4 *.bat files]                     # Windows batch scripts
```

### 🗃️ SQL Directory
```
vofc-viewer/sql/
├── submission-tables-schema.sql        # Submission mirror tables schema
├── fix-foreign-keys.sql               # Foreign key constraint fixes
├── fix-rls-policies.sql              # Row Level Security policy fixes
├── fix-submissions-rls.sql            # Submissions RLS fixes
├── sources_schema.sql                 # Sources table schema
├── sources_simple.sql                 # Simplified sources schema
├── disciplines_schema.sql             # Disciplines schema
└── reindex_disciplines.sql           # Disciplines reindexing
```

### 🎨 Styles Directory
```
vofc-viewer/styles/
├── cisa.css                           # CISA-specific styles
├── globals.css                       # Global styles
└── Home.module.css                    # Home page module styles
```

### 🎨 Public Assets
```
vofc-viewer/public/
├── favicon.ico                        # Site favicon
└── images/
    └── cisa-logo.png                  # CISA logo
```

### 🗄️ Supabase Configuration
```
vofc-viewer/supabase/
├── config.toml                        # Supabase configuration
├── README.md                          # Supabase documentation
├── seed.sql                           # Database seed data
└── functions/
    └── generate-question-i18n/        # Question generation function
        └── [1 *.ts file]              # TypeScript function
```

### 🎨 Theme Directory
```
vofc-viewer/src/theme/
├── [1 *.json file]                     # Theme configuration
└── [1 *.jsx file]                      # Theme component
```

### 🏗️ Backend Applications
```
vofc-viewer/apps/
├── backend/                           # Backend application
│   └── [1884 files: 1792 *.json, 31 *.py, 22 *.js, ...]
└── viewer/                            # Viewer application
    └── [Additional files...]
```

### 📦 Packages Directory
```
vofc-viewer/packages/
└── [Package files...]
```

### 🔧 Configuration Files
```
vofc-viewer/
├── next.config.mjs                    # Next.js configuration
├── tailwind.config.js                 # Tailwind CSS configuration
├── postcss.config.js                  # PostCSS configuration
├── jsconfig.json                      # JavaScript configuration
├── package.json                        # Node.js dependencies
├── package-lock.json                  # NPM lock file
├── vercel.json                        # Vercel deployment configuration
└── test-login.json                    # Test login configuration
```

### 📚 Documentation Files
```
vofc-viewer/
├── AI_SETUP_GUIDE.md                  # AI setup guide
├── ASSESSMENT_QUESTIONS.md            # Assessment questions documentation
├── AUTOMATIC_PROCESSING_ANALYSIS.md   # Automatic processing analysis
├── DEPLOYMENT.md                      # Deployment guide
├── DESIGN_SYSTEM.md                   # Design system guide
├── RLS_FIX_GUIDE.md                   # Row Level Security fix guide
├── SUBMISSION_MIRROR_TABLES_GUIDE.md  # Submission mirror tables guide
├── cookies.txt                        # Cookie configuration
└── setup-env.js                       # Environment setup script
```

### 🧪 Utility Scripts
```
vofc-viewer/
├── check-ofc-sources-content.js       # OFC sources content checker
├── cleanup-invalid-citations.js       # Invalid citations cleanup
├── debug-source-mapping.js            # Source mapping debugger
├── debug-sources.js                   # Sources debugger
└── fix-ofc-sources-mapping.js         # OFC sources mapping fixer
```

### 🗂️ Nested vofc-viewer Directory
```
vofc-viewer/vofc-viewer/
├── app/                               # Nested app directory
└── scripts/                           # Nested scripts directory
    ├── [3 *.js files]                 # JavaScript scripts
    └── [1 *.sql file]                 # SQL script
```

## 📊 File Type Summary

### JavaScript Files
- **Root Level**: 3 files (setup scripts)
- **Main App**: 200+ files (components, API routes, utilities)
- **Archive**: 75+ files (legacy scripts)

### Python Files
- **Heuristic Parser**: 1 main file + requirements
- **Backend**: 31+ files (parsers, utilities)
- **Archive**: 3+ files (legacy scripts)

### SQL Files
- **Main App**: 8 files (schema, fixes)
- **Archive**: 12+ files (legacy schemas)

### JSON Files
- **Data Files**: 5 VOFC library files
- **Configuration**: 3 package files
- **Backend**: 1792+ JSON files (data, configuration)

### Documentation Files
- **Root Level**: 4 main documentation files
- **Main App**: 8+ documentation files
- **Archive**: 10+ documentation files

## 🎯 Key File Locations

### 🚀 Setup & Configuration
- **Main Setup**: `create-submission-tables.js`
- **Heuristic Parser**: `heuristic-parser-tool.js`
- **Dependencies**: `package.json`
- **Environment**: `vofc-viewer/.env.local`

### 🗄️ Database & API
- **API Routes**: `vofc-viewer/app/api/`
- **SQL Schemas**: `vofc-viewer/sql/`
- **Database Scripts**: `vofc-viewer/scripts/`

### 📊 Data Processing
- **Input Data**: `vofc-viewer/data/docs/`
- **Processed Data**: `vofc-viewer/data/completed/`
- **Parser Output**: `vofc-viewer/data/heuristic-parsed/`

### 🧠 Heuristic Parser
- **Main Parser**: `heuristic_parser/vofc_heuristic_parser.py`
- **Dependencies**: `heuristic_parser/requirements.txt`
- **Integration**: `heuristic-parser-tool.js`

This sorted file index provides a comprehensive, organized view of the entire VOFC Engine project structure.
