# Complete VOFC Document Processing Workflow

## Overview
This document outlines the complete process from document upload to acceptance/rejection and database storage in the VOFC Engine.

## 1. Document Upload Process

### API Endpoint: `/api/documents/submit`
**File**: `app/api/documents/submit/route.js`

#### Steps:
1. **Form Validation**
   - Validates `multipart/form-data` content type
   - Extracts form fields: `source_title`, `source_type`, `source_url`, `author_org`, `publication_year`, `content_restriction`
   - Validates file size (10MB limit)

2. **Local File Storage**
   - Saves file to: `OLLAMA_INCOMING_PATH` (default: `C:\Users\frost\AppData\Local\Ollama\files\incoming`)
   - Archives copy to: `OLLAMA_LIBRARY_PATH` (default: `C:\Users\frost\AppData\Local\Ollama\files\library`)
   - Creates timestamped filename: `{basename}_{timestamp}.{extension}`

3. **Database Record Creation**
   - Creates submission record in `submissions` table
   - Status: `pending_review`
   - Stores metadata in JSON format
   - Records local file path for processing

4. **Optional Auto-Processing**
   - If `AUTO_PROCESS_ON_UPLOAD=true`, calls Ollama API
   - Sends document to Ollama for initial analysis

#### Response:
```json
{
  "success": true,
  "submission_id": "uuid-or-local-timestamp",
  "status": "pending_review",
  "message": "Document submitted successfully to local storage",
  "file_path": "C:\\Users\\frost\\AppData\\Local\\Ollama\\files\\incoming\\document_1234567890.pdf",
  "document_name": "document.pdf",
  "document_size": 1024000,
  "storage_type": "local_filesystem",
  "tracked_in_database": true
}
```

## 2. Document Processing (Optional)

### API Endpoint: `/api/documents/process-simple`
**File**: `app/api/documents/process-simple/route.js`

#### Steps:
1. **File Discovery**
   - Scans `OLLAMA_INCOMING_PATH` for files
   - Processes each file individually

2. **Ollama Analysis**
   - Calls Ollama API: `POST /api/chat`
   - Uses model: `vofc-engine:latest`
   - Sends system prompt for vulnerability/OFC extraction

3. **File Movement**
   - Success: Move to `OLLAMA_PROCESSED_PATH`
   - Failure: Move to `OLLAMA_ERROR_PATH`

## 3. Review Process

### UI Component: SubmissionReview
**File**: `app/components/SubmissionReview.jsx`

#### Features:
- Lists all submissions with `status = 'pending_review'`
- Shows document metadata and extracted content
- Provides approve/reject buttons
- Displays statistics (total, pending, approved, rejected)

### API Endpoint: `/api/admin/submissions`
**File**: `app/api/admin/submissions/route.js`

#### Returns:
- All submissions for admin review
- Filtered by user permissions
- Includes submission metadata and extracted content

## 4. Approval Process

### API Endpoint: `/api/submissions/[id]/approve`
**File**: `app/api/submissions/[id]/approve/route.js`

#### Steps:
1. **Validation**
   - Checks submission exists
   - Validates status is `pending_review`
   - Validates action is `approve` or `reject`

2. **Status Update**
   - Updates submission status to `approved`
   - Sets `processed_at` timestamp
   - Records `processed_by` user

3. **Learning Event Recording**
   - Creates record in `learning_events` table
   - Event type: `submission_approved`
   - Confidence: 1.0 (human decision)

4. **Database Insertion** (if approved)
   - **For Vulnerabilities**:
     - Inserts into `vulnerabilities` table
     - Generates 5-10 assessment questions via Supabase function
     - Inserts questions into `assessment_questions` table
     - Creates associated OFCs if present
     - Links vulnerabilities to OFCs in `vulnerability_ofc_links`
   
   - **For OFCs**:
     - Inserts into `options_for_consideration` table
     - Links to associated vulnerabilities if found

#### Database Tables Updated:
- `submissions` (status update)
- `learning_events` (approval record)
- `vulnerabilities` (if vulnerability submission)
- `options_for_consideration` (if OFC submission)
- `assessment_questions` (auto-generated questions)
- `vulnerability_ofc_links` (relationships)

## 5. Rejection Process

### API Endpoint: `/api/submissions/[id]/reject`
**File**: `app/api/submissions/[id]/reject/route.js`

#### Steps:
1. **Validation**
   - Checks submission exists
   - Validates status is `pending_review`

2. **Status Update**
   - Updates submission status to `rejected`
   - Sets `processed_at` timestamp
   - Records `processed_by` user
   - Adds rejection comments

3. **No Database Insertion**
   - Rejected submissions remain in `submissions` table
   - No data added to main VOFC tables
   - Preserves audit trail

## 6. File Management

### Directory Structure:
```
C:\Users\frost\AppData\Local\Ollama\files\
├── incoming/          # New uploads awaiting processing
├── processed/         # Successfully processed files
├── errors/           # Failed processing attempts
└── library/          # Permanent archive of all uploads
```

### File Lifecycle:
1. **Upload**: File saved to `incoming/` and `library/`
2. **Processing**: File moved from `incoming/` to `processed/` or `errors/`
3. **Archive**: Original file preserved in `library/` permanently

## 7. Database Schema

### Key Tables:

#### `submissions`
- `id`: UUID primary key
- `type`: 'document', 'vulnerability', 'ofc'
- `status`: 'pending_review', 'approved', 'rejected'
- `data`: JSON metadata and extracted content
- `source`: 'document_submission', 'manual', etc.
- `created_at`, `updated_at`, `processed_at`
- `processed_by`: User who approved/rejected

#### `vulnerabilities`
- `id`: UUID primary key
- `vulnerability`: Text description
- `discipline`: Category
- `source`: Source information

#### `options_for_consideration`
- `id`: UUID primary key
- `option_text`: OFC description
- `discipline`: Category
- `source`: Source information

#### `assessment_questions`
- `id`: UUID primary key
- `question_text`: Question content
- `question_en`, `question_es`: Multilingual support
- `is_root`: Boolean flag

#### `vulnerability_ofc_links`
- `vulnerability_id`: Foreign key to vulnerabilities
- `ofc_id`: Foreign key to options_for_consideration
- `link_type`: 'direct', 'inferred', etc.
- `confidence_score`: 0.0-1.0

#### `learning_events`
- `event_type`: 'submission_approved', 'submission_rejected'
- `submission_id`: Foreign key
- `confidence`: Confidence score
- `approved`: Boolean
- `processed_by`: User ID
- `comments`: Additional notes

## 8. Error Handling

### File Storage Errors:
- Non-critical: File still saved if database fails
- Graceful degradation: System continues working

### Database Errors:
- Logged but don't stop file processing
- Learning events are non-critical
- Assessment question generation is optional

### Ollama Errors:
- Auto-processing failures are logged but non-critical
- Manual processing can be retried

## 9. Security & Permissions

### RLS (Row Level Security):
- Submissions filtered by user permissions
- Admin users can see all submissions
- Regular users see only their submissions

### File Access:
- Files stored locally (not in cloud)
- Access controlled by application logic
- No direct file system access from frontend

## 10. Monitoring & Analytics

### Statistics Available:
- Total submissions
- Pending review count
- Approved/rejected counts
- Processing success rates
- File storage usage

### Learning System:
- Tracks human approval/rejection decisions
- Builds confidence scores for future automation
- Enables continuous improvement of extraction algorithms
