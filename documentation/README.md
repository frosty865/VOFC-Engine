# VOFC Engine - Database Tools

This directory contains root-level tools for managing the VOFC Engine database, specifically for creating and managing submission mirror tables.

## 🏗️ Submission Mirror Tables

The submission mirror tables provide structured storage for submission data during the review process, separate from the production tables.

### 📋 Tables Created

- `submission_vulnerabilities` - Mirror of `vulnerabilities` table
- `submission_options_for_consideration` - Mirror of `options_for_consideration` table  
- `submission_sources` - Mirror of `sources` table
- `submission_vulnerability_ofc_links` - Mirror of `vulnerability_ofc_links` table
- `submission_ofc_sources` - Mirror of `ofc_sources` table

## 🚀 Quick Start

### Prerequisites

1. **Node.js** installed
2. **Python 3.7+** installed (for heuristic parser)
3. **Supabase project** with service role key
4. **Environment variables** configured in `vofc-viewer/.env.local`

### Installation

```bash
# Install dependencies
npm install

# Or install specific packages
npm install @supabase/supabase-js dotenv
```

### Usage

#### 1. Create Submission Tables

```bash
# Create all submission mirror tables
npm run create-tables

# Or run directly
node create-submission-tables.js
```

#### 2. Migrate Existing Data

```bash
# Migrate existing submission data to structured tables
npm run migrate-data

# Or run directly
node vofc-viewer/scripts/migrate-to-structured-tables.js
```

#### 3. Heuristic Parser Tool

```bash
# Full heuristic parsing process
npm run heuristic-parse

# Test parser only
npm run heuristic-test

# Process documents only
npm run heuristic-process

# Install Python dependencies only
npm run heuristic-install
```

#### 4. Complete Setup (Recommended)

```bash
# Run complete integrated process (tables + migration + parsing)
npm run complete-setup

# Or run the main script directly
node create-submission-tables.js

# Alternative: Run individual steps
npm run full-setup
```

## 📊 What This Creates

### Database Tables

- ✅ **Structured Storage**: Data stored in proper relational format
- ✅ **Performance Indexes**: Optimized for fast queries
- ✅ **Security Policies**: RLS configured for service role access
- ✅ **Views**: Easy-to-use views for common queries

### Benefits

- ✅ **Separation of Concerns**: Submission data separate from production
- ✅ **Enhanced Review**: Structured data for admin review
- ✅ **Easy Approval**: Simple migration to production tables
- ✅ **Audit Trail**: Complete history of submission changes

## 🧠 Heuristic Parser Tool

The heuristic parser tool integrates advanced document parsing capabilities using linguistic heuristics and machine learning.

### Features

- ✅ **Multi-format Support**: PDF, HTML, DOCX, TXT
- ✅ **Linguistic Analysis**: Uses heuristics to identify vulnerabilities and OFCs
- ✅ **Confidence Scoring**: Assigns confidence levels to extracted content
- ✅ **Section Awareness**: Understands document structure and context
- ✅ **Machine Learning**: Optional sentence embeddings for better clustering

### Usage

```bash
# Full heuristic parsing process
npm run heuristic-parse

# Test parser functionality
npm run heuristic-test

# Process documents in vofc-viewer/data/docs
npm run heuristic-process

# Install Python dependencies
npm run heuristic-install
```

### Output

The tool processes documents and creates structured JSON output with:
- Extracted vulnerabilities
- Options for consideration (OFCs)
- Confidence scores
- Source attribution
- Category classification

## 🔄 Integrated Process Flow

The complete setup process now includes:

1. **Database Setup**: Creates submission mirror tables, indexes, RLS policies, and views
2. **Heuristic Parsing**: Processes documents with advanced linguistic analysis
3. **Data Migration**: Migrates existing submissions to structured format
4. **Verification**: Confirms all systems are working correctly

### Complete Process Steps

```
Step 1: Create Submission Mirror Tables
Step 2: Create Performance Indexes  
Step 3: Setup Row Level Security (RLS)
Step 4: Create Database Views
Step 5: Verify Table Creation
Step 6: Run Heuristic Parser
Step 7: Migrate Existing Data
Step 8: Complete Setup
```

## 🔧 Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `create-submission-tables.js` | **Complete integrated process** | `npm run complete-setup` |
| `heuristic-parser-tool.js` | Advanced document parsing | `npm run heuristic-parse` |
| `migrate-to-structured-tables.js` | Migrate existing data | `npm run migrate-data` |
| `setup-submissions` | Tables + Migration | `npm run setup-submissions` |
| `full-setup` | Tables + Migration + Parsing | `npm run full-setup` |

## 📁 File Structure

```
VOFC Engine/
├── create-submission-tables.js     # Main table creation script
├── package.json                     # Dependencies and scripts
├── README.md                        # This file
└── vofc-viewer/                     # Main application
    ├── scripts/
    │   └── migrate-to-structured-tables.js
    └── .env.local                   # Environment variables
```

## 🎯 Data Flow

```
1. Submission Created
   ↓
2. Enhanced Parsing
   ↓
3. Store in submission_* tables
   ↓
4. Admin Review
   ↓
5. Approval → Move to production tables
   ↓
6. Cleanup submission_* tables
```

## 🔍 Verification

After running the scripts, you can verify the tables were created:

```bash
# Check if tables exist
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

## 🛠️ Troubleshooting

### Common Issues

1. **Module not found**: Make sure dependencies are installed
   ```bash
   npm install
   ```

2. **Database connection error**: Check environment variables in `vofc-viewer/.env.local`

3. **Permission denied**: Ensure service role key has proper permissions

4. **Table already exists**: Tables are created with `IF NOT EXISTS`, so this is safe

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📝 Next Steps

After running the setup:

1. **Update Admin Interface**: Modify admin panel to show structured data
2. **Test Submission Flow**: Verify new submissions use structured tables
3. **Update Approval Process**: Modify approval workflow to use structured data
4. **Monitor Performance**: Check query performance with new tables

## 🎉 Success!

Once complete, you'll have:
- ✅ Structured submission data storage
- ✅ Separate from production tables
- ✅ Enhanced review capabilities
- ✅ Easy approval process
- ✅ Complete audit trail
