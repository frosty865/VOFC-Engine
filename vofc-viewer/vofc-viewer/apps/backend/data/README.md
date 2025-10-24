# Document Processing Workflow

This directory contains the document processing workflow for the VOFC Engine.

## Directory Structure

```
data/
├── docs/           # Input documents (PDF, DOCX, TXT, HTML, XLSX)
├── processing/     # Documents currently being processed
├── completed/      # Successfully processed documents
└── failed/         # Documents that failed processing
```

## Workflow

### 1. Document Input
- Place documents in the `docs/` folder
- Supported formats: PDF, DOCX, TXT, HTML, XLSX
- The system will automatically detect and list available documents

### 2. Processing
- Documents are moved to `processing/` folder during processing
- Uses the universal parser and vofc-engine model for normalization
- Processing status is tracked in real-time

### 3. Completion
- Successfully processed documents are moved to `completed/` folder
- Each completed document gets its own subfolder with:
  - Original document
  - Processing results JSON
  - Normalized VOFC data
  - Error logs (if any)

### 4. Failure Handling
- Failed documents are moved to `failed/` folder
- Error logs are saved for debugging
- Failed documents can be retried

## API Endpoints

### Document Management
- `GET /api/documents/list` - List pending documents
- `POST /api/documents/process` - Process single document
- `POST /api/documents/process-batch` - Process multiple documents
- `POST /api/documents/process-all` - Process all pending documents

### Status Tracking
- `GET /api/documents/status` - Get all processing statuses
- `GET /api/documents/status/:filename` - Get specific document status
- `GET /api/documents/completed` - List completed documents
- `GET /api/documents/failed` - List failed documents

### Document Actions
- `POST /api/documents/retry/:filename` - Retry failed document
- `DELETE /api/documents/completed/:filename` - Delete completed document

## Frontend Interface

Access the document processor at `/process` in the frontend application.

### Features
- **Document List**: View all pending documents with file details
- **Batch Processing**: Select multiple documents for processing
- **Status Monitoring**: Real-time status updates
- **Retry Failed**: Retry failed documents
- **Progress Tracking**: Visual progress indicators

## Processing Pipeline

1. **Document Detection**: Scan `docs/` folder for supported file types
2. **File Movement**: Move document to `processing/` folder
3. **Universal Parsing**: Extract content using document-agnostic parser
4. **Sector Mapping**: Automatically assign sector and subsector
5. **AI Normalization**: Use vofc-engine model for consistent schema
6. **Validation**: Validate normalized data against VOFC schema
7. **Output Generation**: Create structured VOFC JSON
8. **File Organization**: Move to `completed/` or `failed/` folder

## Supported Document Types

| Format | Extension | Parser | Notes |
|--------|-----------|--------|-------|
| PDF | .pdf | Universal Parser | Complex documents with tables |
| Word | .docx | Universal Parser | Rich formatting support |
| Text | .txt | Universal Parser | Plain text documents |
| HTML | .html | Universal Parser | Web pages and online docs |
| Excel | .xlsx | Universal Parser | Spreadsheet data |

## Sector Classification

Documents are automatically classified into Critical Infrastructure sectors:

- **Chemical** - Chemical plants, storage facilities
- **Commercial Facilities** - Malls, stadiums, hotels
- **Communications** - Telecom, broadcast, satellite
- **Critical Manufacturing** - Assembly, aerospace, automotive
- **Dams** - Hydroelectric, reservoirs, spillways
- **Defense Industrial Base** - Contractors, military, aerospace
- **Education** - Schools, universities, campuses
- **Emergency Services** - Fire, EMS, police, dispatch
- **Energy** - Grid, substations, pipelines, generators
- **Financial Services** - Banks, insurance, trading
- **Food and Agriculture** - Farms, processing, distribution
- **Government Facilities** - Courthouses, city halls, federal offices
- **Healthcare and Public Health** - Hospitals, clinics, medical facilities
- **Information Technology** - Networks, servers, data centers
- **Transportation Systems** - Airports, rail, ports, transit
- **Water and Wastewater Systems** - Treatment, reservoirs, distribution

## Error Handling

### Common Issues
- **File Format Not Supported**: Only specific formats are supported
- **Processing Timeout**: Large documents may take longer to process
- **AI Model Errors**: vofc-engine model may fail on complex content
- **File Permissions**: Ensure proper read/write permissions

### Debugging
- Check `failed/` folder for error logs
- Review processing results in `completed/` folder
- Monitor backend logs for detailed error information
- Use retry functionality for transient errors

## Performance Considerations

- **Large Documents**: Processing time scales with document size
- **Batch Processing**: Process multiple documents efficiently
- **Resource Usage**: AI model processing requires adequate resources
- **Storage**: Completed documents consume storage space

## Security Notes

- Documents are processed locally
- No external services required for parsing
- AI model runs on local Ollama instance
- Processed data remains in controlled environment