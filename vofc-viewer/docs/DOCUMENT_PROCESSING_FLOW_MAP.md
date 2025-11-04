# PDF/Document Submission Through Processing System - Detailed Flow Map

## Overview
This document provides a comprehensive map of how PDFs and documents flow through the VOFC Engine processing system, from initial submission to final completion.

## System Architecture Components

### 1. Frontend Components
- **DocumentProcessor.jsx** - Main UI component for document management
- **PSASubmission.jsx** - Document submission form
- **Navigation.jsx** - Navigation with CISA branding

### 2. API Endpoints
- **`/api/documents/submit`** - Document submission endpoint
- **`/api/documents/process`** - Individual document processing
- **`/api/documents/process-batch`** - Batch processing
- **`/api/documents/process-all`** - Process all documents
- **`/api/documents/preview`** - Document preview
- **`/api/documents/status-all`** - Consolidated status check
- **`/api/documents/retry/{filename}`** - Retry failed documents

### 3. Database Tables
- **`document_processing`** - Processing status tracking
- **`submissions`** - Document submissions
- **`learning_events`** - Learning system events
- **`learning_stats`** - Learning system statistics

### 4. Storage Systems
- **Supabase Storage** - Document file storage (documents bucket)
- **Supabase Database** - Metadata and processing status

## Detailed Processing Flow

### Phase 1: Document Submission

#### 1.1 User Interface (DocumentProcessor.jsx)
```
User Action → DocumentProcessor Component
├── File Selection (checkbox system)
├── Preview Document (calls /api/documents/preview)
├── Process Single Document (calls /api/documents/process)
├── Process Selected Documents (calls /api/documents/process-batch)
└── Process All Documents (calls /api/documents/process-all)
```

#### 1.2 Document Upload (PSASubmission.jsx)
```
Form Submission → /api/documents/submit
├── Form Data Validation
│   ├── source_title (required)
│   ├── source_type
│   ├── source_url
│   ├── author_org
│   ├── publication_year
│   ├── content_restriction
│   └── document file (required, max 10MB)
├── File Size Validation (10MB limit)
└── Supabase Storage Upload
    ├── Generate unique filename
    ├── Convert to buffer
    └── Upload to 'documents' bucket
```

### Phase 2: Document Processing

#### 2.1 Processing Initiation
```
Processing Request → /api/documents/process
├── File Detection
│   ├── Check if PDF (filename.endsWith('.pdf'))
│   └── Check if binary content (startsWith('%PDF'))
├── Content Preparation
│   ├── PDF: Convert to base64 for Ollama
│   └── Text: Read as text content
└── Status Update
    └── Update document_processing table (status: 'processing')
```

#### 2.2 Ollama AI Processing (Multi-Pass Approach)
```
Ollama API Call → processWithOllama()
├── System Prompt Configuration
│   ├── PDF Processing Capabilities
│   ├── Multi-pass Processing Instructions
│   ├── Heuristic Analysis Requirements
│   └── Content Validation Rules
├── User Prompt (PDF-specific)
│   ├── Multi-pass Processing Steps:
│   │   1. PDF Text Extraction
│   │   2. Heuristic Analysis
│   │   3. Content Analysis
│   │   4. Validation
│   ├── Extraction Methods:
│   │   - Text objects (BT...ET)
│   │   - Streams processing
│   │   - OCR capabilities
│   └── Metadata Filtering
├── API Call with Timeout (60 seconds)
│   ├── POST to Ollama /api/chat
│   ├── Model: vofc-engine:latest
│   └── Stream: false
└── Response Processing
    ├── JSON Extraction from Markdown
    ├── Content Validation
    └── Error Handling
```

#### 2.3 PDF-Specific Processing
```
PDF Processing Pipeline:
├── Base64 Encoding
│   └── Convert PDF binary to base64
├── Ollama Multi-Pass Analysis
│   ├── Pass 1: PDF Text Extraction
│   ├── Pass 2: Heuristic Analysis
│   ├── Pass 3: Content Analysis
│   └── Pass 4: Validation
├── Content Quality Checks
│   ├── Readable text validation
│   ├── Metadata filtering
│   └── Length requirements
└── Fallback Processing
    └── Basic parsing if Ollama fails
```

#### 2.4 Learning System Integration
```
Learning Event Creation → triggerLearningSystem()
├── Create learning_events record
│   ├── event_type: 'document_processed'
│   ├── filename
│   ├── vulnerabilities_found
│   ├── ofcs_found
│   ├── extraction_method: 'ollama'
│   ├── confidence: 'high'
│   └── data: full processed data
├── Check Learning Threshold
│   └── Trigger learning cycle if 5+ events
└── Update Learning Statistics
    └── Update learning_stats table
```

### Phase 3: Status Management

#### 3.1 Status Tracking
```
Status Updates → document_processing table
├── 'pending' → Initial state
├── 'processing' → During Ollama processing
├── 'completed' → Successful processing
└── 'failed' → Processing errors
```

#### 3.2 Status Consolidation
```
Status Check → /api/documents/status-all
├── Supabase Storage Files
│   └── List all files in 'documents' bucket
├── Processing Records
│   └── Query document_processing table
├── Status Categorization
│   ├── Pending (no processing record)
│   ├── Processing (status: 'processing')
│   ├── Completed (status: 'completed')
│   └── Failed (status: 'failed')
└── Return Consolidated Data
    └── JSON response with all categories
```

### Phase 4: Error Handling & Retry

#### 4.1 Error Scenarios
```
Processing Failures:
├── Ollama API Timeout (60s limit)
├── PDF Parsing Failures
├── JSON Parsing Errors
├── Content Quality Issues
└── Network/Connection Errors
```

#### 4.2 Retry Mechanism
```
Retry Process → /api/documents/retry/{filename}
├── Reset Processing Status
├── Clear Previous Errors
├── Restart Processing Pipeline
└── Update Status Tracking
```

## Data Flow Diagram

```
User Upload
    ↓
[PSASubmission.jsx]
    ↓
/api/documents/submit
    ↓
Supabase Storage Upload
    ↓
Database Record Creation
    ↓
Ollama Processing (Multi-Pass)
    ↓
Content Validation
    ↓
Learning System Integration
    ↓
Status Update (Completed/Failed)
    ↓
UI Status Display
```

## Key Processing Features

### 1. Multi-Pass PDF Processing
- **Pass 1**: PDF text extraction using built-in capabilities
- **Pass 2**: Heuristic analysis for document structure
- **Pass 3**: Content analysis for vulnerabilities/OFCs
- **Pass 4**: Validation of extracted content quality

### 2. Content Quality Validation
- Minimum text length requirements
- Metadata filtering (endstream, endobj, etc.)
- Readable content validation
- PDF structure artifact removal

### 3. Learning System Integration
- Automatic learning event creation
- Processing statistics tracking
- Continuous model improvement
- Threshold-based learning cycles

### 4. Robust Error Handling
- Timeout protection (60 seconds)
- Fallback processing methods
- Detailed error logging
- Retry mechanisms

## API Endpoints Summary

| Endpoint | Method | Purpose | Input | Output |
|----------|--------|---------|-------|--------|
| `/api/documents/submit` | POST | Document upload | FormData | Submission confirmation |
| `/api/documents/process` | POST | Single document processing | {filename} | Processing results |
| `/api/documents/process-batch` | POST | Batch processing | {filenames[]} | Batch results |
| `/api/documents/process-all` | POST | Process all documents | {} | All processing results |
| `/api/documents/preview` | POST | Document preview | {filename} | Document metadata |
| `/api/documents/status-all` | GET | Status consolidation | None | All document statuses |
| `/api/documents/retry/{filename}` | POST | Retry failed document | None | Retry confirmation |

## Database Schema

### document_processing table
```sql
- id (UUID, Primary Key)
- filename (TEXT)
- status (TEXT) -- 'pending', 'processing', 'completed', 'failed'
- error_message (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### submissions table
```sql
- id (UUID, Primary Key)
- type (TEXT)
- data (JSONB) -- Contains document metadata and Ollama results
- status (TEXT)
- source (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### learning_events table
```sql
- id (UUID, Primary Key)
- event_type (TEXT)
- filename (TEXT)
- vulnerabilities_found (INTEGER)
- ofcs_found (INTEGER)
- extraction_method (TEXT)
- confidence (TEXT)
- processed_at (TIMESTAMP)
- data (JSONB)
- created_at (TIMESTAMP)
```

## Storage Structure

### Supabase Storage (documents bucket)
```
documents/
├── {filename}_{timestamp}.pdf
├── {filename}_{timestamp}.txt
├── {filename}_{timestamp}.docx
└── ...
```

## Performance Considerations

### 1. Processing Timeouts
- Ollama API: 60-second timeout
- File size limit: 10MB
- Batch processing: Sequential to avoid overload

### 2. Error Recovery
- Automatic retry mechanisms
- Fallback processing methods
- Detailed error logging

### 3. Learning System
- Event-driven learning triggers
- Statistical tracking
- Continuous improvement

## Security Features

### 1. File Validation
- File type restrictions
- Size limits (10MB)
- Content validation

### 2. Authentication
- JWT-based authentication
- Role-based access control
- Session management

### 3. Data Protection
- Secure file storage
- Encrypted communications
- Access logging

This comprehensive flow map shows how documents move through the entire VOFC Engine processing system, from initial upload through AI analysis to final completion, with robust error handling and learning system integration throughout.
