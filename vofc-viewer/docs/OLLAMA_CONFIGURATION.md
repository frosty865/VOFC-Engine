# Ollama Server Configuration & Structure

## Overview
The Ollama server is a Flask-based Python server that handles file storage, processing, and integration with the heuristic pipeline.

## Directory Structure

### Local File System
```
C:\Users\frost\AppData\Local\Ollama\
├── data/                    # Main data directory
│   ├── incoming/           # New files arrive here (monitored by file watcher)
│   ├── processed/          # Files moved after processing (intermediate)
│   ├── library/            # ✅ Successfully processed files + JSON outputs
│   ├── errors/             # ❌ Failed processing files
│   └── vectors/            # Vector embeddings storage
│
├── pipeline/               # Heuristic processing pipeline
│   ├── heuristic_pipeline.py    # Main extraction script
│   └── run_vofc_pipeline.py     # Pipeline runner
│
├── automation/             # Auto-processing scripts
├── app/                    # Main application code
├── routes/                 # API route handlers
├── utils/                  # Utility functions
└── logs/                   # Application logs
```

### VOFC Viewer Integration
```
vofc-viewer/
├── ollama/
│   ├── server.py          # Flask server (runs on port 5000)
│   ├── requirements.txt   # Python dependencies
│   ├── config.py          # Configuration file
│   └── README.md
│
└── scripts-dev/
    ├── file-watcher.js    # Monitors incoming/ folder
    └── start-processing-services.bat  # Starts both services
```

## Configuration

### Server Settings
```python
BASE_DIR = C:\Users\frost\AppData\Local\Ollama\data
UPLOAD_DIR = C:\Users\frost\AppData\Local\Ollama\data\incoming
PROCESSED_DIR = C:\Users\frost\AppData\Local\Ollama\data\processed
LIBRARY_DIR = C:\Users\frost\AppData\Local\Ollama\data\library
ERRORS_DIR = C:\Users\frost\AppData\Local\Ollama\data\errors

SERVER_HOST = 127.0.0.1
SERVER_PORT = 5000
MODEL_NAME = vofc-engine:latest
DEBUG_MODE = True
```

### Environment Variables (`.env.local`)
```env
# File Storage Paths (use /data, not /files)
OLLAMA_FILE_STORAGE=C:\Users\frost\AppData\Local\Ollama\data
OLLAMA_INCOMING_PATH=C:\Users\frost\AppData\Local\Ollama\data\incoming
OLLAMA_PROCESSED_PATH=C:\Users\frost\AppData\Local\Ollama\data\processed
OLLAMA_LIBRARY_DIR=C:\Users\frost\AppData\Local\Ollama\data\library
OLLAMA_ERROR_PATH=C:\Users\frost\AppData\Local\Ollama\data\errors

# Server URLs
OLLAMA_LOCAL_URL=http://127.0.0.1:5000
OLLAMA_URL=https://ollama.frostech.site
NEXT_PUBLIC_OLLAMA_URL=http://127.0.0.1:5000

# Processing Settings
OLLAMA_MODEL=vofc-engine:latest
AUTO_PROCESS_ON_UPLOAD=true

# Heuristic Pipeline Environment
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
OLLAMA_HOST=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
LOG_LEVEL=INFO
```

## API Endpoints

### File Management
- `GET /api/files/list` - List files in incoming folder
- `GET /api/files/list-all` - List files from all folders (incoming, processed, library, errors)
- `GET /api/files/get/<filename>` - Get file contents
- `GET /api/files/download/<filename>` - Download file
- `POST /api/files/move` - Move file between folders
- `POST /api/files/write` - Write content to a file

### Processing
- `POST /api/files/process` - Process all files in incoming folder
  - Extracts text from PDFs
  - Runs heuristic pipeline
  - Saves JSON output to library/
  - Moves original file to library/
- `POST /api/documents/process-batch` - Process specific files by filename

### Ollama Integration (Placeholders)
- `POST /api/chat` - Chat endpoint (placeholder)
- `POST /api/generate` - Generate endpoint (placeholder)
- `GET /api/tags` - List available models

### System
- `GET /api/version` - Server version info
- `GET /health` - Health check with directory status

## File Processing Flow

### 1. File Arrives
```
File placed in: C:\Users\frost\AppData\Local\Ollama\data\incoming\
```

### 2. File Watcher Detects
```
scripts-dev/file-watcher.js detects new file
→ Waits 5 seconds (debounce)
→ Calls: POST http://127.0.0.1:5000/api/files/process
```

### 3. Ollama Server Processes
```
/api/files/process endpoint:
1. Lists all files in incoming/
2. For each file:
   a. Extract text (PDF → text conversion)
   b. Call heuristic_pipeline.py with --dry-run
   c. Parse JSON output
   d. Save JSON to library/<filename>.json
   e. Move original file to library/<filename>
   OR (on error):
   f. Move file to errors/<filename>
```

### 4. Heuristic Pipeline Execution
```
Location: C:\Users\frost\AppData\Local\Ollama\pipeline\heuristic_pipeline.py

Command:
python heuristic_pipeline.py \
  --submission-id <uuid> \
  --text-file <path-to-text-file> \
  --dry-run

Output: JSON with vulnerabilities and OFCs
```

### 5. Final State
```
✅ Success:
   - Original file: library/<filename>
   - JSON output: library/<filename>.json

❌ Failure:
   - File: errors/<filename>
   - Error logged in console
```

## Dependencies

Emergency `requirements.txt`:
```
Flask==2.3.3
Werkzeug==2.3.7
python-dateutil==2.8.2
PyPDF2>=3.0.0
pypdf>=3.0.0
requests>=2.31.0
```

Heuristic Pipeline (`pipeline/heuristic_pipeline.py`):
- Requires: `requests` (for Supabase API)
- Optional: Ollama embeddings for semantic deduplication

## Startup Process

### Manual Start
```bash
# Terminal 1: Ollama Server
cd vofc-viewer
python ollama/server.py

# Terminal 2: File Watcher
npm run watch-files
```

### Automated Start (Windows)
```batch
scripts-dev\start-processing-services.bat
```
This starts both services in separate windows.

## Error Handling

### Logging Levels
- **Console output**: Detailed step-by-step processing
- **Error messages**: Include error type, message, and traceback
- **API responses**: Include error details in JSON response

### Common Errors
1. **Heuristic pipeline not found**
   - Check: `C:\Users\frost\AppData\Local\Ollama\pipeline\heuristic_pipeline.py`
   - Fix: Ensure pipeline script exists

2. **PDF extraction failed**
   - Check: PDF libraries installed (PyPDF2, pypdf)
   - Fix: `pip install PyPDF2 pypdf`

3. **Pipeline execution failed**
   - Check: Python environment and dependencies
   - Check: Pipeline script has correct permissions
   - Check: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set

4. **File permissions**
   - Check: Write permissions on `data/` directory
   - Fix: Ensure user has full access to Ollama folder

## File Status Mapping

| Folder | Status | Description |
|--------|--------|-------------|
| `incoming/` | `pending_review` | New files waiting for processing |
| `processed/` | `processing` | Currently being processed (intermediate) |
| `library/` | `approved` | Successfully processed with JSON output |
| `errors/` | `rejected` | Processing failed |

## Integration Points

### With Next.js App
- Frontend calls: `http://127.0.0.1:5000/api/files/process` or `/api/documents/process-batch`
- Frontend reads: `/api/files/list-all` for dashboard display

### With Heuristic Pipeline
- Server calls: `python heuristic_pipeline.py --dry-run`
- Pipeline reads: Text files (PDF extracted or raw .txt/.md)
- Pipeline outputs: JSON with vulnerabilities and OFCs

### With Supabase
- Pipeline can write to: `submission_vulnerabilities`, `submission_options_for_consideration`
- Next.js reads: Submissions table for review dashboard

## Current Status

✅ **Configured:**
- File storage structure (`data/` folder)
- Processing endpoints
- Error logging
- File watcher integration

⚠️ **Needs Verification:**
- Heuristic pipeline script location
- Python dependencies installed
- Environment variables set correctly
- PDF extraction libraries available

## Troubleshooting Commands

```bash
# Check server is running
curl http://127.0.0.1:5000/health

# Check file list
curl http://127.0.0.1:5000/api/files/list-all

# Test processing (manual)
curl -X POST http://127.0.0.1:5000/api/files/process

# Check pipeline script exists
dir C:\Users\frost\AppData\Local\Ollama\pipeline\heuristic_pipeline.py

# Check Python dependencies
python -c "import PyPDF2, pypdf, requests, flask; print('OK')"
```

