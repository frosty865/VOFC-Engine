# VOFC Engine - Supabase Database Schema

## Overview
This document indexes the complete Supabase database schema for the VOFC (Vulnerability Options for Consideration) Engine system.

## Core Tables

### 1. Users & Authentication
- **vofc_users**: User management with roles
- **user_sessions**: Session tracking
- **user_permissions**: Permission management

### 2. Main Data Tables
- **vulnerabilities**: Core vulnerability data
- **options_for_consideration**: OFC records linked to vulnerabilities
- **sources**: Reference sources and documents
- **sectors**: Industry sectors
- **subsectors**: Sub-categories within sectors

### 3. Linking Tables
- **vulnerability_ofc_links**: Links vulnerabilities to OFCs
- **ofc_sources**: Links OFCs to their source references
- **vulnerability_sources**: Links vulnerabilities to source references

### 4. Assessment System
- **assessment_questions**: Questions for vulnerability assessments
- **questions**: Question bank for the system

## Detailed Schema Files

### Sources Schema (`sql/sources_schema.sql`)
```sql
-- Main sources table with comprehensive metadata
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    publication_date DATE,
    document_type TEXT CHECK (document_type IN ('guideline', 'standard', 'regulation', 'best_practice', 'technical_specification', 'other')),
    organization TEXT,
    url TEXT,
    isbn TEXT,
    doi TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Linking tables for sources
CREATE TABLE vulnerability_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    page_number INTEGER,
    section TEXT,
    quote TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vulnerability_id, source_id)
);

CREATE TABLE ofc_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ofc_id UUID NOT NULL REFERENCES options_for_consideration(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    page_number INTEGER,
    section TEXT,
    quote TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ofc_id, source_id)
);
```

### Database Functions (`scripts/create-db-functions.sql`)
```sql
-- Views for optimized queries
CREATE VIEW ofcs_with_sources AS
SELECT
  o.id, o.option_text, o.discipline, o.sector_id, o.subsector_id, o.vulnerability_id,
  o.created_at, o.updated_at,
  STRING_AGG(s.source_id::text, ', ') AS sources
FROM options_for_consideration o
LEFT JOIN ofc_sources os ON o.id = os.ofc_id
LEFT JOIN sources s ON os.source_id = s.id
GROUP BY o.id, o.option_text, o.discipline, o.sector_id, o.subsector_id, o.vulnerability_id, o.created_at, o.updated_at;

CREATE VIEW vulnerabilities_with_ofcs AS
SELECT
  v.id, v.vulnerability_name, v.description, v.discipline, v.sector_id, v.subsector_id,
  v.created_at, v.updated_at,
  COUNT(o.id) as ofc_count,
  STRING_AGG(o.id::text, ', ') AS ofc_ids
FROM vulnerabilities v
LEFT JOIN options_for_consideration o ON v.id = o.vulnerability_id
GROUP BY v.id, v.vulnerability_name, v.description, v.discipline, v.sector_id, v.subsector_id, v.created_at, v.updated_at;

-- Functions for optimized data retrieval
CREATE FUNCTION get_ofcs_with_sources() RETURNS SETOF ofcs_with_sources;
CREATE FUNCTION get_vulnerabilities_with_ofcs() RETURNS SETOF vulnerabilities_with_ofcs;
```

### Assessment Questions (`scripts/sql/populate-assessment-questions.sql`)
```sql
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,
    options JSONB,
    required BOOLEAN DEFAULT false,
    order_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security & RLS Policies

### Row Level Security (RLS)
- All tables have RLS enabled
- Public read access for core data
- Admin-only write access
- User-specific access for personal data

### Key Policies
```sql
-- Sources are publicly readable
CREATE POLICY "sources_are_public" ON sources FOR SELECT USING (true);

-- Admin management policies
CREATE POLICY "admins_can_manage_sources" ON sources FOR ALL USING (
    EXISTS (SELECT 1 FROM vofc_users WHERE user_id = auth.uid() AND role = 'admin')
);
```

## Indexes for Performance
```sql
-- Source linking indexes
CREATE INDEX idx_vulnerability_sources_vulnerability_id ON vulnerability_sources(vulnerability_id);
CREATE INDEX idx_vulnerability_sources_source_id ON vulnerability_sources(source_id);
CREATE INDEX idx_ofc_sources_ofc_id ON ofc_sources(ofc_id);
CREATE INDEX idx_ofc_sources_source_id ON ofc_sources(source_id);

-- Source search indexes
CREATE INDEX idx_sources_title ON sources(title);
CREATE INDEX idx_sources_organization ON sources(organization);
```

## Key Relationships

### Data Flow
1. **Vulnerabilities** → **Options for Consideration** (1:many)
2. **OFCs** → **Sources** (many:many via `ofc_sources`)
3. **Vulnerabilities** → **Sources** (many:many via `vulnerability_sources`)
4. **Sectors** → **Subsectors** (1:many)
5. **Users** → **Sessions** (1:many)

### Foreign Key Constraints
- `ofc_sources.ofc_id` → `options_for_consideration.id`
- `ofc_sources.source_id` → `sources.id`
- `vulnerability_sources.vulnerability_id` → `vulnerabilities.id`
- `vulnerability_sources.source_id` → `sources.id`

## API Functions

### Core Fetch Functions
- `fetchVOFC()`: Get OFCs with their sources
- `fetchVulnerabilities()`: Get vulnerabilities with OFCs
- `fetchSubsectors()`: Get all subsectors
- `fetchSectors()`: Get all sectors
- `linkOFCtoSource(ofcId, referenceNumber)`: Link OFC to source

### Utility Functions
- `getOFCsForVulnerability(vulnerabilityId)`: Get OFCs for specific vulnerability
- `fetchVulnerabilityOFCLinks()`: Get vulnerability-OFC relationships

## Environment Configuration
- Supabase URL: `NEXT_PUBLIC_SUPABASE_URL`
- Supabase Anon Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service Role: Used for admin operations

## Migration & Setup Scripts
1. `sql/sources_schema.sql` - Main schema with RLS
2. `sql/sources_simple.sql` - Simplified schema without RLS
3. `sql/fix-foreign-keys.sql` - Foreign key constraints
4. `sql/fix-rls-policies.sql` - RLS policy fixes
5. `scripts/create-db-functions.sql` - Database functions and views

## Sample Data
The system includes sample sources from major security organizations:
- CISA Physical Security Guidelines
- NIST Cybersecurity Framework
- DHS Protective Security Guidelines
- ASIS International Standards
- NFPA 730 Security Management
