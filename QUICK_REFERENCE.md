# VOFC Engine - Quick Reference

## 🚀 Quick Start Commands

```bash
# Complete setup (recommended)
npm run complete-setup

# Individual steps
npm run create-tables      # Create submission tables
npm run migrate-data       # Migrate existing data
npm run heuristic-parse   # Run heuristic parser
```

## 📊 Key Database Tables

### Production Tables
- `vulnerabilities` - Core vulnerability data
- `options_for_consideration` - OFC data
- `sources` - Source references
- `vulnerability_ofc_links` - Vulnerability-OFC relationships
- `ofc_sources` - OFC-Source relationships
- `submissions` - Submission tracking

### Submission Mirror Tables
- `submission_vulnerabilities` - Submission vulnerability data
- `submission_options_for_consideration` - Submission OFC data
- `submission_sources` - Submission source data
- `submission_vulnerability_ofc_links` - Submission vulnerability-OFC links
- `submission_ofc_sources` - Submission OFC-Source links

## 🛣️ Key API Routes

### Submissions
- `POST /api/submissions` - Create submission
- `POST /api/submissions/[id]/approve` - Approve submission
- `POST /api/submissions/[id]/reject` - Reject submission
- `DELETE /api/submissions/[id]/delete` - Delete submission

### Documents
- `GET /api/documents/list` - List documents
- `POST /api/documents/process` - Process document
- `GET /api/documents/preview` - Preview document

### Admin
- `GET /api/admin/users` - Get users
- `GET /api/admin/stats` - Get statistics

## 📁 Key File Locations

### Root Level
- `create-submission-tables.js` - Main setup script
- `heuristic-parser-tool.js` - Heuristic parser integration
- `package.json` - Dependencies and scripts
- `README.md` - Main documentation

### Main Application (vofc-viewer/)
- `app/api/` - API routes
- `app/admin/` - Admin pages
- `app/submit/` - Submission pages
- `scripts/` - Utility scripts
- `sql/` - SQL schema files
- `data/` - Data directories

### Heuristic Parser
- `heuristic_parser/vofc_heuristic_parser.py` - Main parser
- `heuristic_parser/requirements.txt` - Python dependencies

## 🔧 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

## 📊 Data Flow

```
Documents → Heuristic Parser → Structured JSON → Submission Tables → Admin Review → Production Tables
```

## 🎯 Process Steps

1. **Create Tables** - Set up submission mirror tables
2. **Install Dependencies** - Python packages for parser
3. **Run Parser** - Process documents with heuristic parser
4. **Migrate Data** - Move existing data to structured format
5. **Verify Setup** - Confirm all systems working

## 🛠️ Troubleshooting

### Common Issues
- **Python not found**: Install Python 3.7+
- **Dependencies fail**: Run `npm run heuristic-install`
- **Database connection**: Check environment variables
- **Permission denied**: Verify service role key

### Verification
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

## 📋 Next Steps After Setup

1. **Update Admin Interface** - Modify admin panel for structured data
2. **Test Submission Flow** - Verify new submissions work
3. **Review Parser Results** - Check heuristic parser output
4. **Monitor Performance** - Check query performance
5. **Train Staff** - Update documentation and train users
