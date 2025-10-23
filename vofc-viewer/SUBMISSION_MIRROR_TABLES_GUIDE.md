# Submission Mirror Tables Setup Guide

## 🎯 Overview

This guide explains how to create submission mirror tables that store structured data during the review process, separate from the production tables.

## 📋 Tables to Create

### 1. submission_vulnerabilities
**Purpose**: Mirror of `vulnerabilities` table for submissions
```sql
CREATE TABLE IF NOT EXISTS submission_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  vulnerability TEXT NOT NULL,
  discipline TEXT,
  source TEXT,
  source_title TEXT,
  source_url TEXT,
  ofc_count INTEGER DEFAULT 0,
  vulnerability_count INTEGER DEFAULT 0,
  enhanced_extraction JSONB,
  parsed_at TIMESTAMP WITH TIME ZONE,
  parser_version TEXT,
  extraction_stats JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. submission_options_for_consideration
**Purpose**: Mirror of `options_for_consideration` table for submissions
```sql
CREATE TABLE IF NOT EXISTS submission_options_for_consideration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  discipline TEXT,
  vulnerability_id UUID REFERENCES submission_vulnerabilities(id) ON DELETE CASCADE,
  source TEXT,
  source_title TEXT,
  source_url TEXT,
  confidence_score DECIMAL(3,2) DEFAULT 1.00,
  pattern_matched TEXT,
  context TEXT,
  citations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. submission_sources
**Purpose**: Mirror of `sources` table for submissions
```sql
CREATE TABLE IF NOT EXISTS submission_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  source_text TEXT NOT NULL,
  reference_number TEXT,
  source_title TEXT,
  source_url TEXT,
  author_org TEXT,
  publication_year INTEGER,
  content_restriction TEXT DEFAULT 'public',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. submission_vulnerability_ofc_links
**Purpose**: Mirror of `vulnerability_ofc_links` table for submissions
```sql
CREATE TABLE IF NOT EXISTS submission_vulnerability_ofc_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  vulnerability_id UUID REFERENCES submission_vulnerabilities(id) ON DELETE CASCADE,
  ofc_id UUID REFERENCES submission_options_for_consideration(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'direct',
  confidence_score DECIMAL(3,2) DEFAULT 1.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. submission_ofc_sources
**Purpose**: Mirror of `ofc_sources` table for submissions
```sql
CREATE TABLE IF NOT EXISTS submission_ofc_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  ofc_id UUID REFERENCES submission_options_for_consideration(id) ON DELETE CASCADE,
  source_id UUID REFERENCES submission_sources(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Setup Instructions

### Method 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to SQL Editor

2. **Create Tables**
   - Copy and paste each CREATE TABLE statement above
   - Execute them one by one

3. **Create Indexes**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_submission_id ON submission_vulnerabilities(submission_id);
   CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_discipline ON submission_vulnerabilities(discipline);
   CREATE INDEX IF NOT EXISTS idx_submission_ofcs_submission_id ON submission_options_for_consideration(submission_id);
   CREATE INDEX IF NOT EXISTS idx_submission_ofcs_discipline ON submission_options_for_consideration(discipline);
   CREATE INDEX IF NOT EXISTS idx_submission_sources_submission_id ON submission_sources(submission_id);
   ```

4. **Setup RLS Policies**
   ```sql
   ALTER TABLE submission_vulnerabilities ENABLE ROW LEVEL SECURITY;
   ALTER TABLE submission_options_for_consideration ENABLE ROW LEVEL SECURITY;
   ALTER TABLE submission_sources ENABLE ROW LEVEL SECURITY;
   ALTER TABLE submission_vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;
   ALTER TABLE submission_ofc_sources ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow service role full access" ON submission_vulnerabilities FOR ALL USING (auth.role() = 'service_role');
   CREATE POLICY "Allow service role full access" ON submission_options_for_consideration FOR ALL USING (auth.role() = 'service_role');
   CREATE POLICY "Allow service role full access" ON submission_sources FOR ALL USING (auth.role() = 'service_role');
   CREATE POLICY "Allow service role full access" ON submission_vulnerability_ofc_links FOR ALL USING (auth.role() = 'service_role');
   CREATE POLICY "Allow service role full access" ON submission_ofc_sources FOR ALL USING (auth.role() = 'service_role');
   ```

### Method 2: Using Supabase CLI

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to your project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Create migration**
   ```bash
   supabase migration new create_submission_mirror_tables
   ```

5. **Add SQL to migration file**
   - Copy all the CREATE TABLE statements above
   - Add them to the migration file

6. **Apply migration**
   ```bash
   supabase db push
   ```

## 🎯 Benefits of Submission Mirror Tables

### ✅ **Structured Data Storage**
- Data is stored in proper relational format
- Easy to query and analyze
- Maintains data integrity

### ✅ **Separation of Concerns**
- Submission data is separate from production data
- No risk of affecting live data during review
- Clear audit trail

### ✅ **Enhanced Review Process**
- Admins can see structured data during review
- Easy to approve/reject specific items
- Better data organization

### ✅ **Easy Approval Process**
- Simple data migration from submission to production tables
- Automated approval workflow
- Data validation before production

## 📊 Data Flow

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

## 🔄 Migration Script

Once tables are created, use this script to migrate existing data:

```javascript
// Run: node scripts/migrate-to-structured-tables.js
```

## 🎉 Result

After setup, you'll have:
- ✅ Structured submission data storage
- ✅ Separate from production tables
- ✅ Enhanced review capabilities
- ✅ Easy approval process
- ✅ Complete audit trail

## 📝 Next Steps

1. Create the tables using Method 1 or 2 above
2. Run the migration script to populate existing data
3. Update the submission API to use structured tables
4. Test the new structured data flow
5. Update admin interface to show structured data
