# VOFC Engine - Complete Process Flow

## 🎯 Overview

This document outlines the complete process flow for the VOFC Engine, including database setup, submission mirror tables, and heuristic parsing integration.

## 📊 Complete Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOFC Engine Complete Setup                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Create Submission Mirror Tables                       │
│  • submission_vulnerabilities                                  │
│  • submission_options_for_consideration                       │
│  • submission_sources                                          │
│  • submission_vulnerability_ofc_links                         │
│  • submission_ofc_sources                                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Create Performance Indexes                            │
│  • Indexes for fast queries                                    │
│  • Full-text search indexes                                    │
│  • Foreign key indexes                                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Setup Row Level Security (RLS)                      │
│  • Enable RLS on all tables                                    │
│  • Create service role policies                                │
│  • Configure access permissions                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Create Database Views                                 │
│  • submission_vulnerabilities_with_ofcs                        │
│  • submission_ofcs_with_sources                                │
│  • Enhanced query capabilities                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Verify Table Creation                                 │
│  • Check all tables exist                                      │
│  • Verify table structure                                      │
│  • Confirm indexes and policies                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: Run Heuristic Parser                                  │
│  • Check Python environment                                   │
│  • Install Python dependencies                                │
│  • Test parser functionality                                  │
│  • Process documents in vofc-viewer/data/docs                  │
│  • Generate structured JSON output                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: Migrate Existing Data                                 │
│  • Migrate existing submissions to structured tables          │
│  • Populate submission mirror tables                          │
│  • Verify data integrity                                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 8: Complete Setup                                        │
│  • All systems ready                                           │
│  • Structured data storage active                              │
│  • Heuristic parsing available                                 │
│  • Ready for production use                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Commands

### Complete Setup (Recommended)
```bash
# Run the complete integrated process
npm run complete-setup

# Or run the main script directly
node create-submission-tables.js
```

### Individual Steps
```bash
# Step 1: Create tables only
npm run create-tables

# Step 2: Migrate existing data
npm run migrate-data

# Step 3: Run heuristic parser only
npm run heuristic-parse

# Step 4: Full setup (tables + migration + parsing)
npm run full-setup
```

### Heuristic Parser Commands
```bash
# Test parser functionality
npm run heuristic-test

# Process documents only
npm run heuristic-process

# Install Python dependencies
npm run heuristic-install
```

## 📁 File Structure

```
VOFC Engine/
├── create-submission-tables.js          # Main integrated setup script
├── heuristic-parser-tool.js             # Heuristic parser integration
├── package.json                         # Dependencies and scripts
├── README.md                            # Main documentation
├── PROCESS_FLOW.md                      # This file
├── heuristic_parser/                     # Python heuristic parser
│   ├── vofc_heuristic_parser.py         # Main parser script
│   ├── requirements.txt                 # Python dependencies
│   └── README-VOFC-PARSER.md           # Parser documentation
└── vofc-viewer/                         # Main application
    ├── scripts/
    │   └── migrate-to-structured-tables.js
    ├── data/
    │   ├── docs/                        # Input documents
    │   └── heuristic-parsed/            # Parser output
    └── .env.local                       # Environment variables
```

## 🔄 Data Flow

### 1. Document Processing Flow
```
Documents (PDF/HTML/DOCX/TXT)
    ↓
Heuristic Parser (Python)
    ↓
Structured JSON Output
    ↓
Submission Mirror Tables
    ↓
Admin Review
    ↓
Approval → Production Tables
```

### 2. Submission Processing Flow
```
New Submission
    ↓
Enhanced Parsing (Automatic)
    ↓
Structured Data Storage
    ↓
Admin Review Interface
    ↓
Approval/Rejection
    ↓
Production Tables (if approved)
```

## 🎯 Benefits of Integrated Process

### ✅ **Complete Automation**
- Single command runs entire setup
- Automatic dependency management
- Error handling and recovery
- Progress tracking and reporting

### ✅ **Structured Data Storage**
- Proper relational database design
- Performance optimized with indexes
- Security with RLS policies
- Easy querying with views

### ✅ **Advanced Document Processing**
- Multi-format document support
- Linguistic heuristics for extraction
- Confidence scoring for quality
- Machine learning integration

### ✅ **Enhanced Review Process**
- Structured data for admin review
- Easy approval/rejection workflow
- Complete audit trail
- Better data organization

## 🛠️ Troubleshooting

### Common Issues

1. **Python not found**: Install Python 3.7+
2. **Dependencies fail**: Run `npm run heuristic-install`
3. **Database connection**: Check environment variables
4. **Permission denied**: Verify service role key

### Verification Steps

```bash
# Check if tables were created
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './vofc-viewer/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  const tables = [
    'submission_vulnerabilities',
    'submission_options_for_consideration',
    'submission_sources',
    'submission_vulnerability_ofc_links',
    'submission_ofc_sources'
  ];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    console.log(\`\${table}: \${error ? '❌' : '✅'}\`);
  }
}

checkTables();
"
```

## 📋 Next Steps After Setup

1. **Update Admin Interface**: Modify admin panel to show structured data
2. **Test Submission Flow**: Verify new submissions use structured tables
3. **Review Parser Results**: Check heuristic parser output in `vofc-viewer/data/heuristic-parsed/`
4. **Monitor Performance**: Check query performance with new tables
5. **Train Staff**: Update documentation and train users on new workflow

## 🎉 Success Indicators

- ✅ All 5 submission mirror tables created
- ✅ Indexes and RLS policies configured
- ✅ Views created for easy querying
- ✅ Heuristic parser successfully processes documents
- ✅ Existing data migrated to structured format
- ✅ Admin interface ready for structured data review
- ✅ Complete audit trail established
