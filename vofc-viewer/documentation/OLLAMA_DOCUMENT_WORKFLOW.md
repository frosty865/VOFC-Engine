# Ollama Document Processing Workflow

## Overview
The VOFC Engine now has a complete document upload and processing workflow that integrates with the remote Ollama server for intelligent document analysis and vulnerability extraction.

## Workflow Steps

### 1. Document Upload via UI
- **Location**: `/submit` page → PSA Document Submission
- **Component**: `PSASubmission.jsx`
- **Process**: User uploads document through web interface
- **Validation**: File type, size (10MB limit), required fields

### 2. Document Processing Pipeline
- **Route**: `/api/documents/submit-ollama`
- **Process**:
  1. Save original document to `data/uploads/`
  2. Extract document content (text, metadata)
  3. Send content to Ollama server for processing
  4. Receive parsed vulnerabilities and OFCs
  5. Store processed data and original file

### 3. Ollama Server Processing
- **Endpoint**: `http://10.0.0.213:11434` (remote server)
- **Model**: `vofc-engine:latest`
- **Parser**: `/api/parser/process-document`
- **Method**: Heuristic analysis with AI enhancement
- **Output**: Structured JSON with vulnerabilities and OFCs

### 4. File Storage Structure
```
data/
├── uploads/          # Original uploaded files
├── processing/       # Files currently being processed
├── completed/        # Successfully processed files
│   ├── document.pdf
│   └── document.pdf.processed.json
└── failed/          # Failed processing attempts
    ├── document.pdf
    └── document.pdf.error.json
```

### 5. Database Integration
- **Table**: `submissions`
- **Status**: `completed` (immediate processing)
- **Data**: Full processed results with extraction stats
- **Metadata**: Processing method, timestamps, file paths

## Key Features

### ✅ **Real-time Processing**
- Documents are processed immediately upon upload
- No queuing or batch processing required
- Instant feedback to user

### ✅ **Intelligent Extraction**
- Heuristic analysis identifies security vulnerabilities
- AI enhancement improves clarity and specificity
- Confidence scoring for each extraction

### ✅ **Comprehensive Storage**
- Original files preserved
- Processed data stored separately
- Error logging for failed attempts
- Complete audit trail

### ✅ **Remote Ollama Integration**
- All processing done on remote Ollama server
- No local parsing dependencies
- Scalable AI processing

## API Endpoints

### Document Submission
- **POST** `/api/documents/submit-ollama`
- **Input**: FormData with file and metadata
- **Output**: Processing results with extraction stats

### Ollama Parser
- **POST** `/api/parser/process-document`
- **Input**: Document content and metadata
- **Output**: Structured vulnerabilities and OFCs

### Health Check
- **GET** `/api/parser/test-parsing`
- **Purpose**: Test Ollama connection and processing

## Example Response

```json
{
  "success": true,
  "submission_id": "12345",
  "status": "completed",
  "message": "Document processed successfully with Ollama",
  "file_path": "data/completed/document_1234567890.pdf",
  "processed_data_path": "data/completed/document_1234567890.pdf.processed.json",
  "extraction_stats": {
    "total_entries": 3,
    "vulnerabilities_found": 3,
    "ofcs_found": 8
  },
  "entries": [
    {
      "topic": "Inadequate Physical Access Control Measures",
      "category": "Security Management|Access Control",
      "vulnerability": "Many facilities lack proper access control systems, allowing unauthorized individuals to enter and potentially compromise sensitive areas.",
      "options_for_consideration": [
        "Implement a comprehensive access control system with biometric authentication and smart card readers",
        "Install surveillance cameras with motion detection and recording capabilities",
        "Enhance lighting in high-risk areas to deter criminal activity"
      ],
      "confidence": 0.95,
      "enhancement_metadata": {
        "improvements_made": ["Improved vulnerability statement for clarity and specificity"],
        "enhanced_at": "2025-10-28T19:47:32.000Z"
      }
    }
  ]
}
```

## User Experience

### Frontend Feedback
- **Upload**: "🔍 Analyzing document to auto-fill form fields..."
- **Processing**: "🤖 Processing document with Ollama parser..."
- **Success**: "✅ Document processed successfully with Ollama! Found X entries (Y vulnerabilities, Z OFCs)."
- **Error**: Detailed error messages with file paths

### File Management
- **Automatic Organization**: Files moved through processing pipeline
- **Error Handling**: Failed files moved to failed folder with error logs
- **Data Preservation**: Both original and processed data maintained

## Configuration

### Environment Variables
```env
OLLAMA_BASE=http://10.0.0.213:11434
OLLAMA_MODEL=vofc-engine:latest
```

### Directory Structure
- **Uploads**: `data/uploads/`
- **Processing**: `data/processing/`
- **Completed**: `data/completed/`
- **Failed**: `data/failed/`

## Benefits

1. **Centralized Processing**: All AI processing on remote Ollama server
2. **Intelligent Extraction**: Heuristic + AI enhancement for better results
3. **Complete Audit Trail**: Every step logged and stored
4. **Error Recovery**: Failed processing attempts preserved for debugging
5. **Scalable Architecture**: Remote server handles processing load
6. **Real-time Results**: Immediate feedback to users

## Status: ✅ **FULLY OPERATIONAL**

The complete document upload and processing workflow is now integrated with the Ollama server and ready for production use.
