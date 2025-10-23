# VOFC Engine - File Navigation Guide

## 🚀 Quick Access to Key Files

### 📋 Setup & Configuration
| Purpose | File Location | Description |
|---------|---------------|-------------|
| **Main Setup** | `create-submission-tables.js` | Complete database setup with heuristic parser |
| **Heuristic Parser** | `heuristic-parser-tool.js` | Advanced document parsing integration |
| **Dependencies** | `package.json` | Root dependencies and npm scripts |
| **Environment** | `vofc-viewer/.env.local` | Environment variables configuration |
| **Workspace** | `VOFC Engine.code-workspace` | VS Code workspace configuration |

### 📚 Documentation
| Purpose | File Location | Description |
|---------|---------------|-------------|
| **Main Docs** | `README.md` | Primary project documentation |
| **Process Flow** | `PROCESS_FLOW.md` | Complete process flow documentation |
| **Project Index** | `PROJECT_INDEX.md` | Comprehensive project index |
| **Quick Reference** | `QUICK_REFERENCE.md` | Quick reference guide |
| **Sorted Index** | `SORTED_FILE_INDEX.md` | Sorted file location index |
| **Navigation** | `FILE_NAVIGATION.md` | This navigation guide |

### 🗄️ Database & API
| Purpose | File Location | Description |
|---------|---------------|-------------|
| **Submission Schema** | `vofc-viewer/sql/submission-tables-schema.sql` | Submission mirror tables schema |
| **RLS Fixes** | `vofc-viewer/sql/fix-rls-policies.sql` | Row Level Security policy fixes |
| **Sources Schema** | `vofc-viewer/sql/sources_schema.sql` | Sources table schema |
| **Submission API** | `vofc-viewer/app/api/submissions/route.js` | Create submission API |
| **Document API** | `vofc-viewer/app/api/documents/process/route.js` | Document processing API |
| **Admin API** | `vofc-viewer/app/api/admin/stats/route.js` | Admin statistics API |

### 🧠 Heuristic Parser
| Purpose | File Location | Description |
|---------|---------------|-------------|
| **Main Parser** | `heuristic_parser/vofc_heuristic_parser.py` | Python heuristic parser |
| **Dependencies** | `heuristic_parser/requirements.txt` | Python package requirements |
| **Parser Docs** | `heuristic_parser/README-VOFC-PARSER.md` | Parser documentation |
| **Integration** | `heuristic-parser-tool.js` | Node.js integration tool |

### 📊 Data Files
| Purpose | File Location | Description |
|---------|---------------|-------------|
| **Input Docs** | `vofc-viewer/data/docs/` | Documents to be processed |
| **Processed** | `vofc-viewer/data/completed/` | Successfully processed documents |
| **Parser Output** | `vofc-viewer/data/heuristic-parsed/` | Heuristic parser results |
| **VOFC Library** | `final_safe_vofc_library.json` | Final VOFC library data |
| **Import Data** | `ofc_sources_import.csv` | OFC sources import data |

### 🛠️ Utility Scripts
| Purpose | File Location | Description |
|---------|---------------|-------------|
| **Migration** | `vofc-viewer/scripts/migrate-to-structured-tables.js` | Migrate existing data |
| **Process Submissions** | `vofc-viewer/scripts/process-pending-submissions.js` | Process pending submissions |
| **Verify Data** | `vofc-viewer/scripts/verify-processed-submissions.js` | Verify processed data |
| **Test Parser** | `vofc-viewer/scripts/test-enhanced-parser.js` | Test enhanced parser |

### 🎨 Frontend Components
| Purpose | File Location | Description |
|---------|---------------|-------------|
| **Admin Dashboard** | `vofc-viewer/app/admin/page.jsx` | Main admin interface |
| **Submission Form** | `vofc-viewer/app/submit/page.jsx` | Submission interface |
| **Document Processor** | `vofc-viewer/app/process/page.jsx` | Document processing interface |
| **Navigation** | `vofc-viewer/components/Navigation.jsx` | Main navigation component |
| **OFCCard** | `vofc-viewer/app/components/OFCCard.jsx` | OFC display component |

### 🔐 Authentication & Security
| Purpose | File Location | Description |
|---------|---------------|-------------|
| **Client Auth** | `vofc-viewer/lib/auth-client.js` | Client-side authentication |
| **Server Auth** | `vofc-viewer/lib/auth-server.js` | Server-side authentication |
| **Security Utils** | `vofc-viewer/lib/security.js` | Security utilities |
| **Login Form** | `vofc-viewer/components/LoginForm.jsx` | Login form component |

### 📈 Monitoring & Analytics
| Purpose | File Location | Description |
|---------|---------------|-------------|
| **Health Check** | `vofc-viewer/app/api/health/route.js` | System health API |
| **Metrics** | `vofc-viewer/app/api/metrics/route.js` | System metrics API |
| **Monitoring** | `vofc-viewer/lib/monitoring.js` | Monitoring utilities |
| **Analytics** | `vofc-viewer/components/AnalyticsProvider.jsx` | Analytics provider |

## 🗂️ Directory Structure Quick Reference

### Root Level
```
VOFC Engine/
├── 📋 Setup Files
│   ├── create-submission-tables.js
│   ├── heuristic-parser-tool.js
│   └── package.json
├── 📚 Documentation
│   ├── README.md
│   ├── PROCESS_FLOW.md
│   ├── PROJECT_INDEX.md
│   ├── QUICK_REFERENCE.md
│   ├── SORTED_FILE_INDEX.md
│   └── FILE_NAVIGATION.md
├── 🧠 Heuristic Parser
│   └── heuristic_parser/
├── 📊 Data Files
│   ├── final_safe_vofc_library.json
│   ├── ofc_sources_import.csv
│   └── vulnerability_ofc_links_import.csv
├── 🗂️ Archive
│   └── archive/
└── 🎯 Main Application
    └── vofc-viewer/
```

### Main Application (vofc-viewer/)
```
vofc-viewer/
├── 📱 App Structure
│   ├── app/ (Next.js pages and API routes)
│   ├── components/ (React components)
│   └── lib/ (Utility libraries)
├── 🗄️ Database
│   ├── sql/ (SQL schema files)
│   └── scripts/ (Database utility scripts)
├── 📊 Data
│   ├── data/ (Input/output data)
│   └── public/ (Static assets)
├── 🧠 Backend
│   └── apps/backend/ (Python backend)
├── 🎨 Styling
│   ├── styles/ (CSS files)
│   └── src/theme/ (Theme configuration)
└── 🔧 Configuration
    ├── next.config.mjs
    ├── tailwind.config.js
    └── package.json
```

## 🎯 Common File Operations

### 🔍 Finding Files
```bash
# Find all JavaScript files
find . -name "*.js" -type f

# Find all Python files
find . -name "*.py" -type f

# Find all SQL files
find . -name "*.sql" -type f

# Find all documentation files
find . -name "*.md" -type f
```

### 📁 Navigating Directories
```bash
# Go to main application
cd vofc-viewer/

# Go to API routes
cd vofc-viewer/app/api/

# Go to components
cd vofc-viewer/components/

# Go to scripts
cd vofc-viewer/scripts/

# Go to data
cd vofc-viewer/data/
```

### 🛠️ Running Commands
```bash
# Complete setup
npm run complete-setup

# Create tables only
npm run create-tables

# Run heuristic parser
npm run heuristic-parse

# Migrate data
npm run migrate-data
```

## 📋 File Type Quick Reference

| Extension | Count | Purpose |
|-----------|-------|---------|
| `.js` | 200+ | JavaScript files (API routes, components, utilities) |
| `.py` | 35+ | Python files (parsers, backend utilities) |
| `.sql` | 20+ | SQL files (schemas, migrations, fixes) |
| `.json` | 1800+ | JSON files (data, configuration) |
| `.jsx` | 20+ | React components |
| `.md` | 25+ | Documentation files |
| `.css` | 5+ | Stylesheet files |
| `.csv` | 5+ | CSV data files |

This navigation guide provides quick access to all key files in the VOFC Engine project.
