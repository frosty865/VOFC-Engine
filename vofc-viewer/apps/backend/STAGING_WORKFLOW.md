# VOFC Staging Workflow Documentation

## Overview

The VOFC Engine now implements a comprehensive staging workflow that ensures data quality and traceability. Documents are processed automatically and stored in a staging area for admin review before being committed to the production database.

## Architecture

### 1. Document Processing Flow

```
PSA Uploads Document
        │
        ▼
 [Universal Parser + Ollama]
  ↓                ↓
 Extract content    Extract metadata
        │
        ▼
  Generate submission package (VOFC schema)
        │
        ▼
  Store in staging table (vofc_submissions)
        │
        ▼
   Admin Review UI
        │
        ▼
   Approved → Commit to Supabase
   Rejected → Archive with reason
```

### 2. Key Components

#### **Staging Table (`vofc_submissions`)**
- Stores submission packages before approval
- Includes metadata, source information, and extracted entries
- Tracks approval status and reviewer information
- Maintains audit trail for compliance

#### **Submission Package Format**
```json
{
  "status": "pending_review",
  "source": {
    "title": "Counter Terrorism Protective Security Advice",
    "authors": ["NaCTSO"],
    "year": "2021",
    "source_type": "Government",
    "source_confidence": 0.92
  },
  "entries": [
    {
      "category": "Perimeter Security",
      "vulnerability": "The venue lacks clear vehicle access control points.",
      "ofc": "Establish layered vehicle access control zones...",
      "sector": "Commercial Facilities",
      "subsector": "Sports and Entertainment Venues"
    }
  ]
}
```

## Implementation Details

### 1. Database Schema

**Staging Table: `vofc_submissions`**
```sql
CREATE TABLE vofc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending_review',
  data JSONB NOT NULL,
  uploaded_by TEXT NOT NULL,
  approved_by TEXT,
  rejected_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  submission_metadata JSONB DEFAULT '{}'::jsonb
);
```

### 2. API Endpoints

#### **Document Processing**
- `POST /api/psa/submit` - Upload document for processing
- `GET /api/approve/pending` - Get pending submissions
- `GET /api/approve/:id` - Get specific submission
- `POST /api/approve/:id/approve` - Approve submission
- `POST /api/approve/:id/reject` - Reject submission
- `GET /api/approve/stats/overview` - Get submission statistics

#### **Approval Process**
1. **Parse Document**: Universal parser extracts content and metadata
2. **Generate Package**: Creates structured submission package
3. **Store in Staging**: Saves to `vofc_submissions` table
4. **Admin Review**: Review UI displays submission details
5. **Approve/Reject**: Admin makes decision with audit trail
6. **Commit to Production**: Approved submissions are inserted into main tables

### 3. Security & Compliance

#### **Row Level Security (RLS)**
- Users can only view their own submissions
- Admins can view and manage all submissions
- Audit trail maintained for all actions

#### **Data Protection**
- No direct writes to production tables from parser
- Two-person approval process (PSA + SPSA)
- Complete audit trail with timestamps and reasons
- Rollback capability for rejected submissions

### 4. File Management

#### **Directory Structure**
```
data/
├── docs/           # Original uploaded documents
├── processing/     # Documents being processed
├── completed/      # Successfully processed documents
├── failed/        # Failed processing attempts
└── staging/
    └── submissions/ # Generated submission packages
```

#### **File Lifecycle**
1. **Upload**: Document saved to `docs/`
2. **Processing**: Moved to `processing/` during parsing
3. **Success**: Moved to `completed/` after staging
4. **Failure**: Moved to `failed/` with error logs

## Usage Guide

### 1. PSA Document Submission

**Frontend**: `/submit-psa`
- Upload document with metadata
- Specify source type, authors, year
- Set content restriction level
- Submit for processing

**Backend Processing**:
- Validates file type and metadata
- Processes document with universal parser
- Generates submission package
- Stores in staging table
- Moves document to completed folder

### 2. Admin Review Process

**Frontend**: `/review`
- View all pending submissions
- Review extracted vulnerabilities and OFCs
- Edit or approve submissions
- Reject with reason if needed

**Approval Actions**:
- **Approve**: Commits to production database
- **Reject**: Archives with reason
- **Edit**: Modify before approval (future feature)

### 3. Database Operations

#### **Approval Process**
1. Insert source into `sources` table
2. Insert vulnerabilities into `vulnerabilities` table
3. Insert OFCs into `options_for_consideration` table
4. Link OFCs to sources in `ofc_sources` table
5. Update submission status to "approved"

#### **Rejection Process**
1. Update submission status to "rejected"
2. Record rejection reason
3. Maintain submission for audit trail

## Benefits

### 1. Data Quality
- **Pre-review**: All data reviewed before production
- **Validation**: Automated and manual validation layers
- **Traceability**: Complete audit trail for compliance

### 2. Workflow Efficiency
- **Pre-filled Forms**: Saves hours of manual data entry
- **Batch Processing**: Handle multiple documents efficiently
- **Universal Workflow**: Works for any source, any sector

### 3. Security & Compliance
- **No Accidental Injection**: Staging prevents direct database writes
- **Audit Trail**: Complete history of all actions
- **Role-based Access**: Different permissions for PSAs and admins

### 4. Scalability
- **Source Agnostic**: Works with any document type
- **Sector Agnostic**: Handles all 16 CI sectors
- **Metadata Rich**: Preserves source information and confidence

## Future Enhancements

### 1. Advanced Features
- **Bulk Approval**: Approve multiple submissions at once
- **Template Matching**: Auto-suggest based on similar submissions
- **Version Control**: Track changes to submissions
- **Integration**: Connect with external document sources

### 2. Analytics
- **Processing Metrics**: Track parsing success rates
- **Review Analytics**: Monitor approval/rejection patterns
- **Source Analysis**: Identify most valuable sources
- **Performance Monitoring**: Track processing times

### 3. Automation
- **Auto-approval**: For high-confidence submissions
- **Smart Routing**: Direct submissions to appropriate reviewers
- **Notification System**: Alert reviewers of new submissions
- **Scheduled Processing**: Batch process documents at off-peak times

## Troubleshooting

### Common Issues

1. **Parser Failures**: Check document format and content
2. **Staging Errors**: Verify Supabase connection and permissions
3. **Approval Failures**: Check database constraints and relationships
4. **File Management**: Ensure proper directory permissions

### Debug Tools

1. **Logs**: Check backend console for processing logs
2. **Database**: Query `vofc_submissions` table for status
3. **Files**: Check `data/failed/` for error logs
4. **API**: Test endpoints with curl or Postman

## Conclusion

The staging workflow provides a robust, secure, and scalable solution for document processing and data management. It ensures data quality while maintaining efficiency and compliance requirements.

For technical support or questions, contact the development team or refer to the API documentation.
