# Source-Agnostic Ingestion System

Complete documentation for the VOFC Engine's source-agnostic document processing system.

## Overview

The source-agnostic ingestion system allows PSAs to submit any useful document containing security best practices or mitigations, regardless of origin. The system automatically processes, structures, and validates content while maintaining proper traceability and trust workflows.

## Core Principles

### 1. Source-Agnostic Processing
- **No gating rules**: Documents are accepted from any reputable source
- **Metadata-driven**: Source information is treated as metadata, not restrictions
- **Universal parsing**: Same processing pipeline for all document types
- **Flexible classification**: Automatic sector assignment with confidence scoring

### 2. Trust Workflow
- **Two-stage validation**: Automated syntax + human content review
- **Review status tracking**: pending → approved/rejected
- **Confidence scoring**: Automated confidence calculation based on source metadata
- **Audit trail**: Complete submission and review history

### 3. PSA Empowerment
- **Localized learning**: PSAs build regional best-practice pools
- **Cross-pollination**: Strong mitigations from one industry surface in another
- **Crowd-sourced OFCs**: Every field team contributes new data
- **Continuous updates**: Engine grows as PSAs upload new material

## Database Schema

### Enhanced Sources Table
```sql
-- Core source information
source_title TEXT NOT NULL
source_type source_type_enum DEFAULT 'unknown'
source_url TEXT
author_org TEXT
publication_year INTEGER

-- Trust and review fields
source_confidence NUMERIC DEFAULT 0.0
submitted_by TEXT
review_status review_status_enum DEFAULT 'pending'
reviewed_by TEXT
reviewed_at TIMESTAMPTZ
content_restriction content_restriction_enum DEFAULT 'public'
```

### Source Types
- **government**: Federal, state, or local government documents
- **academic**: University research, studies, or papers
- **corporate**: Industry reports, vendor documentation
- **field_note**: Operational experience, lessons learned
- **media**: News articles, press releases
- **unknown**: Source type not specified

### Review Status
- **pending**: Awaiting review
- **approved**: Approved for public use
- **rejected**: Rejected due to quality/appropriateness issues
- **needs_review**: Requires additional review

### Content Restrictions
- **public**: No restrictions, can be shared freely
- **restricted**: Limited distribution, internal use
- **confidential**: Sensitive information, authorized personnel only
- **classified**: Classified information, security clearance required

## API Endpoints

### PSA Document Submission
**POST** `/api/psa/submit`

Submit a document for source-agnostic processing.

**Request (multipart/form-data):**
```
file: [document file]
source_title: "Document Title"
source_type: "government|academic|corporate|field_note|media|unknown"
source_url: "https://example.com/document"
author_org: "Organization Name"
publication_year: 2025
content_restriction: "public|restricted|confidential|classified"
```

**Response:**
```json
{
  "success": true,
  "message": "Document submitted successfully",
  "filename": "document_1234567890.pdf",
  "source_metadata": {
    "source_type": "government",
    "author_org": "DHS",
    "publication_year": 2025,
    "content_restriction": "public"
  },
  "status": "processing"
}
```

### Get PSA Submissions
**GET** `/api/psa/submissions`

Retrieve submissions by the authenticated PSA.

**Response:**
```json
{
  "success": true,
  "submissions": [
    {
      "id": "uuid",
      "filename": "document.pdf",
      "source_title": "Security Guidelines",
      "source_type": "government",
      "review_status": "approved",
      "submitted_at": "2025-10-21T20:00:00Z",
      "confidence_score": 0.87
    }
  ]
}
```

## Processing Pipeline

### 1. Document Submission
```
PSA Upload → File Validation → Metadata Extraction → Queue for Processing
```

### 2. Universal Parsing
```
Document → Universal Parser → Content Extraction → OFC/Vulnerability Detection
```

### 3. Sector Classification
```
Content → Keyword Analysis → Sector Assignment → Confidence Scoring
```

### 4. AI Normalization
```
Raw Content → vofc-engine Model → Structured VOFC JSON → Schema Validation
```

### 5. Trust Workflow
```
Structured Data → Syntax Validation → PSA Review → Approval/Rejection
```

## Confidence Scoring Algorithm

The system automatically calculates source confidence based on multiple factors:

### Base Confidence: 0.5
### Source Type Bonus
- **Government**: +0.3
- **Academic**: +0.25
- **Corporate**: +0.15
- **Field Note**: +0.1
- **Media**: +0.05

### Organization Bonus
- **Federal/Government**: +0.2
- **University/College**: +0.15
- **Corporation**: +0.1
- **Other**: +0.05

### Recency Bonus
- **Last 2 years**: +0.1
- **Last 5 years**: +0.05
- **Older**: +0.0

### Review Bonus
- **Each review**: +0.05 (max +0.2)

### Final Confidence
```
confidence = min(1.0, base + type_bonus + org_bonus + recency_bonus + review_bonus)
```

## Frontend Interface

### PSA Submission Form
- **Document Information**: Title, type, organization, year
- **Content Classification**: Restriction level selection
- **File Upload**: Drag-and-drop with validation
- **Review Guidelines**: Pre-submission checklist

### Document Processor
- **Real-time Status**: Processing progress tracking
- **Batch Operations**: Multiple document processing
- **Error Handling**: Failed document retry
- **Results Review**: Processed document inspection

## Security Considerations

### Content Filtering
- **No personal data**: Automatic detection and rejection
- **No classified content**: Restriction level enforcement
- **No proprietary code**: Content type validation
- **FOIA compliance**: Public domain vs restricted tagging

### Access Control
- **PSA submissions**: Authenticated users only
- **Review access**: Analyst and admin roles
- **Public access**: Approved sources only
- **Audit logging**: Complete submission history

### Data Protection
- **Local processing**: No external service dependencies
- **Encrypted storage**: Sensitive document protection
- **Access logging**: Who accessed what and when
- **Retention policies**: Automatic cleanup of old data

## Benefits

### For PSAs
- **Easy submission**: Simple form-based interface
- **Local relevance**: Submit region-specific guidance
- **Immediate feedback**: Processing status updates
- **Contribution tracking**: View submission history

### For Analysts
- **Quality control**: Review and approve submissions
- **Source diversity**: Access to varied document types
- **Confidence scoring**: Automated quality assessment
- **Audit trail**: Complete review history

### For the System
- **Continuous learning**: Never stagnates, always growing
- **Cross-pollination**: Best practices from one sector inform others
- **Crowd-sourced intelligence**: Leverage collective knowledge
- **Adaptive processing**: Improves with more data

## Implementation Status

### ✅ Completed
- [x] Database schema with source metadata
- [x] Universal parser with metadata support
- [x] PSA submission interface
- [x] Document processing API
- [x] Confidence scoring algorithm
- [x] Trust workflow framework

### 🚧 In Progress
- [ ] Database migration scripts
- [ ] Authentication integration
- [ ] Review interface for analysts
- [ ] Notification system for status updates

### 📋 Planned
- [ ] Advanced content filtering
- [ ] Machine learning confidence tuning
- [ ] Cross-sector correlation analysis
- [ ] Automated quality scoring

## Usage Examples

### Submit Government Document
```javascript
const formData = new FormData();
formData.append('file', governmentDoc);
formData.append('source_title', 'DHS Infrastructure Security Guidelines');
formData.append('source_type', 'government');
formData.append('author_org', 'Department of Homeland Security');
formData.append('publication_year', '2025');
formData.append('content_restriction', 'public');

const response = await fetch('/api/psa/submit', {
  method: 'POST',
  body: formData
});
```

### Submit Academic Research
```javascript
const formData = new FormData();
formData.append('file', researchPaper);
formData.append('source_title', 'Cybersecurity in Critical Infrastructure');
formData.append('source_type', 'academic');
formData.append('author_org', 'MIT Cybersecurity Lab');
formData.append('publication_year', '2024');
formData.append('content_restriction', 'public');
```

### Submit Field Notes
```javascript
const formData = new FormData();
formData.append('file', fieldReport);
formData.append('source_title', 'Airport Security Lessons Learned');
formData.append('source_type', 'field_note');
formData.append('author_org', 'TSA Field Operations');
formData.append('publication_year', '2025');
formData.append('content_restriction', 'restricted');
```

## Monitoring and Analytics

### Submission Metrics
- **Total submissions**: Count by PSA, source type, time period
- **Processing success rate**: Percentage of successful processing
- **Review turnaround**: Time from submission to review
- **Approval rate**: Percentage of approved submissions

### Quality Metrics
- **Confidence distribution**: Average confidence by source type
- **Content quality**: Automated quality scoring
- **Review feedback**: Analyst comments and ratings
- **Usage patterns**: Most accessed sources and sectors

### System Health
- **Processing performance**: Average processing time
- **Error rates**: Failed processing percentage
- **Storage usage**: Document storage consumption
- **API performance**: Response times and throughput

This source-agnostic system transforms the VOFC Engine into a truly collaborative platform where every PSA can contribute valuable security knowledge while maintaining the highest standards of quality and trust.
