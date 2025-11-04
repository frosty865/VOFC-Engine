# VOFC Engine - AI Context & Project State

## Project Overview
**VOFC Engine** is a Next.js application with Supabase backend for managing Vulnerability Options for Consideration (OFCs) in security assessments.

## Current Project State (December 19, 2024)

### 🏗️ **Architecture**
- **Frontend**: Next.js 14 with App Router
- **Backend**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with custom user roles
- **Deployment**: Vercel-ready with environment configuration

### 📁 **Project Structure**
```
VOFC Engine/
├── vofc-viewer/                 # Main application
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API routes
│   │   ├── components/          # React components
│   │   ├── lib/                 # Utility functions
│   │   └── page.jsx            # Main dashboard
│   ├── supabase/               # Database configuration
│   ├── sql/                    # Database schemas
│   └── scripts/               # Data processing scripts
├── .cursor/                   # AI context and rules
└── archive/                   # Legacy code and documentation
```

### 🗄️ **Database Schema (Current)**

#### Core Tables
- **`sources`**: Reference documents and guidelines
- **`vulnerabilities`**: Security vulnerabilities
- **`options_for_consideration`**: OFC records
- **`sectors`** & **`subsectors`**: Industry classifications

#### Linking Tables
- **`ofc_sources`**: Links OFCs to their source references
- **`vulnerability_sources`**: Links vulnerabilities to sources
- **`vulnerability_ofc_links`**: Links vulnerabilities to OFCs

#### Key Relationships
```
Vulnerabilities → OFCs (1:many)
OFCs → Sources (many:many via ofc_sources)
Vulnerabilities → Sources (many:many via vulnerability_sources)
```

### 🔧 **Current API Functions**

#### Core Data Fetching
```javascript
// Optimized relationship query
export async function fetchVOFC() {
  const { data, error } = await supabase
    .from('options_for_consideration')
    .select(`
      id,
      option_text,
      ofc_sources (
        source_id,
        sources (
          reference_number,
          source_text
        )
      )
    `);
  if (error) throw error;
  return data;
}

// Source linking function
export async function linkOFCtoSource(ofcId, referenceNumber) {
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('id')
    .eq('reference_number', referenceNumber)
    .single();
  
  if (sourceError || !source) throw sourceError || new Error('Source not found');
  
  const { error: linkError } = await supabase
    .from('ofc_sources')
    .insert([{ ofc_id: ofcId, source_id: source.id }])
    .select();
    
  if (linkError && !linkError.message.includes('duplicate key')) throw linkError;
  return { success: true };
}
```

#### AI-Powered Services
```javascript
// AI Discovery Service
export async function discoverNewVOFC(sector, inputText) {
  // Uses GPT-5 to analyze content and discover new vulnerabilities/OFCs
  // Returns structured JSON with categories, vulnerabilities, and citations
}

// AI Enhancement Service  
export async function enhanceOFC(ofcId) {
  // Uses GPT-5 to improve OFC text clarity and add citations
  // Auto-suggests authoritative sources and refined phrasing
}
```

#### Citation Management
```javascript
// Citation Resolution
export async function resolveCitations(ofcId, optionText) {
  // Scans text for [cite: #] patterns and links them automatically
}

// Shortcut Functions
export async function resolveCitationsForOFC(ofc) {
  // Shortcut: await resolveCitations(ofc.id, ofc.option_text)
}

export async function resolveCitationsBatch(ofcs) {
  // Batch process multiple OFCs for citation resolution
}
```

#### Additional Functions
- `fetchVulnerabilities()`: Get vulnerabilities with OFC counts
- `fetchSubsectors()`: Get all subsectors
- `fetchSectors()`: Get all sectors
- `getOFCsForVulnerability(vulnerabilityId)`: Get OFCs for specific vulnerability

### 🎯 **Current Features**

#### Dashboard Capabilities
- **Vulnerability Management**: View and manage security vulnerabilities
- **OFC Management**: Create and edit Options for Consideration
- **Source Linking**: Connect OFCs to reference sources
- **Assessment Tools**: Question-based vulnerability assessments
- **User Management**: Role-based access control

#### Data Processing
- **Citation System**: `[cite: #]` pattern for source references
- **Bulk Import**: CSV data processing for large datasets
- **Source Mapping**: Automatic linking of references to sources

### 🔒 **Security & Access Control**

#### Row Level Security (RLS)
- **Public Read**: Core data accessible to all users
- **Admin Write**: Only admins can modify data
- **User Sessions**: Individual user data protection

#### Authentication Flow
- Supabase Auth integration
- Custom user roles (admin, user)
- Session management with timeout
- Secure API endpoints

### 📊 **Current Data State**

#### Sample Sources
- CISA Physical Security Guidelines
- NIST Cybersecurity Framework
- DHS Protective Security Guidelines
- ASIS International Standards
- NFPA 730 Security Management

#### Data Relationships
- Vulnerabilities linked to multiple OFCs
- OFCs linked to multiple source references
- Hierarchical sector/subsector structure
- Assessment questions for vulnerability evaluation

### 🚀 **Recent Updates**

#### Database Optimizations
- Added relationship queries for better performance
- Created database views for complex joins
- Implemented proper foreign key constraints
- Added performance indexes

#### API Improvements
- Optimized `fetchVOFC()` with relationship queries
- Added `linkOFCtoSource()` for source linking
- Improved error handling across all functions
- Enhanced logging for debugging

#### Code Quality
- Consistent async/await patterns
- Proper error handling and logging
- TypeScript-ready function signatures
- Comprehensive documentation

### 🔄 **Development Workflow**

#### Current Git Status
- Modified files: `app/page.jsx`, `app/submit/`, `lib/fetchVOFC.js`
- New files: `app/lib/` functions, debug scripts
- Untracked: Various utility and debug files

#### Environment Setup
- Supabase URL: `NEXT_PUBLIC_SUPABASE_URL`
- Supabase Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service Role: For admin operations

### 🎯 **Next Development Priorities**

#### Immediate Tasks
1. **Complete Source Linking**: Finish implementation of citation system
2. **Data Validation**: Ensure all references are properly linked
3. **UI Improvements**: Enhance dashboard user experience
4. **Testing**: Comprehensive testing of all API functions

#### Future Enhancements
1. **Advanced Analytics**: Vulnerability trend analysis
2. **Export Features**: PDF/Excel report generation
3. **API Documentation**: Complete API reference
4. **Performance Optimization**: Query optimization and caching

### 🛠️ **Development Guidelines**

#### Code Standards
- Use async/await for all database operations
- Throw errors for database failures, return empty arrays for no data
- Include console.log for debugging database operations
- Prefer Supabase relationship queries over manual joins

#### Database Best Practices
- Always handle Supabase errors with proper error messages
- Use RLS policies for security (public read, admin write)
- Leverage database views for complex queries
- Maintain referential integrity with foreign keys

#### File Organization
- API routes in `app/api/`
- Components in `app/components/`
- Utility functions in `app/lib/`
- Database schemas in `sql/`
- Scripts in `scripts/`

## Context for AI Assistance

When working on this project, consider:
1. **Database Relationships**: Always use proper Supabase relationship queries
2. **Error Handling**: Implement comprehensive error handling for all database operations
3. **Security**: Respect RLS policies and user permissions
4. **Performance**: Use database views and indexes for optimal queries
5. **Consistency**: Follow established patterns for async functions and error handling

This context should be referenced for all development work on the VOFC Engine project.
