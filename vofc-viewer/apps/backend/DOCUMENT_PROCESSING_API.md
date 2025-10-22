# Document Processing API

Complete API documentation for the VOFC Engine document processing system.

## Overview

The Document Processing API provides a comprehensive workflow for processing documents through the universal VOFC parser. Documents are automatically moved through different folders based on their processing status.

## Base URL
```
http://localhost:4000/api/documents
```

## Directory Structure

```
data/
├── docs/           # Input documents (PDF, DOCX, TXT, HTML, XLSX)
├── processing/     # Documents currently being processed
├── completed/      # Successfully processed documents
└── failed/         # Documents that failed processing
```

## API Endpoints

### 1. List Pending Documents
**GET** `/api/documents/list`

Returns a list of all documents in the `docs/` folder that are ready for processing.

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "filename": "security_guidance.pdf",
      "size": 1024000,
      "modified": "2025-10-21T20:00:00.000Z",
      "status": "pending"
    }
  ],
  "total": 1
}
```

### 2. Process Single Document
**POST** `/api/documents/process`

Process a single document through the universal VOFC parser.

**Request Body:**
```json
{
  "filename": "security_guidance.pdf",
  "options": {
    "sector": "Healthcare",
    "priority": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Started processing security_guidance.pdf",
  "filename": "security_guidance.pdf",
  "status": "processing"
}
```

### 3. Process Multiple Documents
**POST** `/api/documents/process-batch`

Process multiple documents in batch.

**Request Body:**
```json
{
  "filenames": [
    "security_guidance.pdf",
    "emergency_procedures.docx",
    "cyber_security.txt"
  ],
  "options": {
    "priority": "normal"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Started processing 3 documents",
  "results": [
    {
      "filename": "security_guidance.pdf",
      "success": true,
      "status": "processing"
    },
    {
      "filename": "emergency_procedures.docx",
      "success": true,
      "status": "processing"
    }
  ]
}
```

### 4. Process All Documents
**POST** `/api/documents/process-all`

Process all pending documents in the `docs/` folder.

**Request Body:**
```json
{
  "options": {
    "batch_size": 5,
    "priority": "normal"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Started processing 5 documents",
  "results": [
    {
      "filename": "document1.pdf",
      "success": true,
      "status": "processing"
    }
  ]
}
```

### 5. Get Processing Status
**GET** `/api/documents/status`

Get the processing status of all documents.

**Response:**
```json
{
  "success": true,
  "statuses": [
    {
      "filename": "security_guidance.pdf",
      "status": "processing",
      "timestamp": "2025-10-21T20:05:00.000Z"
    }
  ],
  "total": 1
}
```

### 6. Get Specific Document Status
**GET** `/api/documents/status/:filename`

Get the processing status of a specific document.

**Response:**
```json
{
  "success": true,
  "filename": "security_guidance.pdf",
  "status": "processing",
  "timestamp": "2025-10-21T20:05:00.000Z"
}
```

### 7. List Completed Documents
**GET** `/api/documents/completed`

Get a list of all successfully processed documents.

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "filename": "security_guidance.pdf",
      "size": 1024000,
      "completed": "2025-10-21T20:10:00.000Z"
    }
  ],
  "total": 1
}
```

### 8. List Failed Documents
**GET** `/api/documents/failed`

Get a list of all documents that failed processing.

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "filename": "corrupted_file.pdf",
      "size": 0,
      "failed": "2025-10-21T20:15:00.000Z"
    }
  ],
  "total": 1
}
```

### 9. Retry Failed Document
**POST** `/api/documents/retry/:filename`

Retry processing a failed document by moving it back to the `docs/` folder.

**Response:**
```json
{
  "success": true,
  "message": "Document corrupted_file.pdf moved back to docs folder for retry"
}
```

### 10. Delete Completed Document
**DELETE** `/api/documents/completed/:filename`

Delete a completed document and its processing results.

**Response:**
```json
{
  "success": true,
  "message": "Document security_guidance.pdf deleted"
}
```

## Processing Pipeline

### 1. Document Detection
- System scans `docs/` folder for supported file types
- Supported formats: PDF, DOCX, TXT, HTML, XLSX
- File metadata is collected (size, modification date)

### 2. File Movement
- Document is moved from `docs/` to `processing/` folder
- Processing status is tracked in memory
- Concurrent processing is prevented

### 3. Universal Parsing
- Document is processed using the universal parser
- Content is extracted based on document type
- OFCs and vulnerabilities are identified

### 4. Sector Mapping
- Content is analyzed for sector-specific keywords
- Automatic sector and subsector assignment
- Confidence scoring for sector classification

### 5. AI Normalization
- Content is processed through the vofc-engine model
- Consistent VOFC schema is generated
- Professional vulnerability statements are created

### 6. Validation
- Normalized data is validated against VOFC schema
- Quality checks are performed
- Error reporting for invalid data

### 7. Output Generation
- Structured VOFC JSON is created
- Processing results are saved
- Metadata is preserved

### 8. File Organization
- Successfully processed documents move to `completed/` folder
- Failed documents move to `failed/` folder
- Processing logs are maintained

## Error Handling

### Common Error Responses

**Document Not Found (404):**
```json
{
  "success": false,
  "error": "Document not found"
}
```

**Already Processing (409):**
```json
{
  "success": false,
  "error": "Document is already being processed"
}
```

**Processing Error (500):**
```json
{
  "success": false,
  "error": "Internal processing error"
}
```

### Error Logging

Failed documents include detailed error logs:
```json
{
  "filename": "corrupted_file.pdf",
  "error": "PDF parsing failed: corrupted file structure",
  "stack": "Error stack trace...",
  "timestamp": "2025-10-21T20:15:00.000Z",
  "processing_time_ms": 5000
}
```

## Status Codes

| Status | Description |
|--------|-------------|
| `pending` | Document is in docs folder, ready for processing |
| `processing` | Document is currently being processed |
| `completed` | Document has been successfully processed |
| `failed` | Document processing failed |

## Supported File Types

| Format | Extension | Parser | Notes |
|--------|-----------|--------|-------|
| PDF | .pdf | Universal Parser | Complex documents with tables |
| Word | .docx | Universal Parser | Rich formatting support |
| Text | .txt | Universal Parser | Plain text documents |
| HTML | .html | Universal Parser | Web pages and online docs |
| Excel | .xlsx | Universal Parser | Spreadsheet data |

## Rate Limiting

- No rate limiting is currently implemented
- Processing is limited by system resources
- Concurrent processing is controlled by file locking

## Authentication

- No authentication is required for document processing
- All endpoints are publicly accessible
- Consider implementing authentication for production use

## Frontend Integration

The document processor is accessible at `/process` in the frontend application.

### Features:
- **Real-time Status Updates**: Automatic refresh every 5 seconds
- **Batch Processing**: Select multiple documents for processing
- **Progress Tracking**: Visual indicators for processing status
- **Error Handling**: Retry failed documents
- **File Management**: View and manage processed documents

## Example Usage

### Process a Single Document
```javascript
const response = await fetch('/api/documents/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ filename: 'security_guidance.pdf' })
});

const result = await response.json();
console.log(result.message); // "Started processing security_guidance.pdf"
```

### Monitor Processing Status
```javascript
const response = await fetch('/api/documents/status');
const result = await response.json();

result.statuses.forEach(doc => {
  console.log(`${doc.filename}: ${doc.status}`);
});
```

### Retry Failed Document
```javascript
const response = await fetch('/api/documents/retry/corrupted_file.pdf', {
  method: 'POST'
});

const result = await response.json();
console.log(result.message); // "Document corrupted_file.pdf moved back to docs folder for retry"
```

## Production Considerations

1. **File Storage**: Implement proper file storage for large document libraries
2. **Authentication**: Add authentication and authorization
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Monitoring**: Add comprehensive logging and monitoring
5. **Backup**: Implement backup strategies for processed documents
6. **Security**: Ensure secure file handling and processing
7. **Scalability**: Consider distributed processing for large volumes
