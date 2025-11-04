# File Processing System Setup Guide

## Overview
The VOFC Engine processes documents through a pipeline that involves:
1. **File Upload** → Creates submission record in Supabase
2. **File Storage** → Files go to `C:\Users\frost\AppData\Local\Ollama\data\incoming`
3. **File Watcher** → Monitors incoming folder and triggers processing
4. **Ollama Server** → Handles batch processing and file operations
5. **Next.js API** → Handles Supabase submission processing

## Prerequisites

### 1. Start Both Services (Recommended)
**Start both Ollama server and File Watcher together:**

```batch
cd vofc-viewer
scripts-dev\start-processing-services.bat
```

This will:
- Install Python dependencies (if needed)
- Start the Ollama server in one window
- Start the File Watcher in another window
- Both services will run in separate windows that you can monitor

### 2. Start Services Separately (Alternative)

**Ollama Server only:**
```batch
cd vofc-viewer
scripts-dev\start-ollama-server.bat
```

**File Watcher only:**
```batch
cd vofc-viewer
scripts-dev\start-file-watcher.bat
```

**Or manually:**
```bash
# Terminal 1: Ollama Server
cd vofc-viewer
python -m pip install -r ollama/requirements.txt  # First time only
python ollama/server.py

# Terminal 2: File Watcher
cd vofc-viewer
npm run watch-files
```

### Service Details

**Ollama Server:**
- Listens on `http://127.0.0.1:5000` (default)
- Creates required folders if they don't exist:
  - `incoming/` - New files go here
  - `processed/` - Successfully processed files
  - `library/` - Completed/approved files
  - `errors/` - Failed processing files

**File Watcher:**
- Monitors `C:\Users\frost\AppData\Local\Ollama\data\incoming`
- Automatically processes files when detected
- Calls Ollama server's processing endpoint

### 3. Environment Variables
Ensure `.env.local` has:
```env
# Ollama Server Configuration
OLLAMA_LOCAL_URL=http://127.0.0.1:5000
OLLAMA_URL=https://ollama.frostech.site  # Remote fallback
OLLAMA_FILE_STORAGE=C:\Users\frost\AppData\Local\Ollama\data
OLLAMA_INCOMING_PATH=C:\Users\frost\AppData\Local\Ollama\data\incoming

# For client-side components (browser)
NEXT_PUBLIC_OLLAMA_URL=http://127.0.0.1:5000

# Auto-processing on upload
AUTO_PROCESS_ON_UPLOAD=true
```

## Processing Flow

### Flow 1: File Upload via Web UI
1. User uploads file via `/submit` page (PSASubmission component)
2. File goes to `/api/documents/submit` endpoint
3. Submission record created in Supabase `submissions` table
4. **NOTE**: Currently files are NOT written to disk automatically
   - Files need to be manually placed in `incoming/` folder, OR
   - Implement file write in submit route

### Flow 2: File Processing (Automatic via Watcher)
1. File appears in `C:\Users\frost\AppData\Local\Ollama\data\incoming`
2. File watcher detects new file (after 5 second debounce)
3. Watcher calls `http://127.0.0.1:5000/api/files/process` (Ollama server)
4. Ollama server moves file from `incoming/` to `processed/` or `errors/`
5. File status updated in dashboard

### Flow 3: Batch Processing via UI
1. User selects files in Document Processor dashboard
2. Frontend calls `${OLLAMA_URL}/api/documents/process-batch` (Ollama server)
3. Ollama processes files and moves them to appropriate folders

### Flow 4: Submission Processing (Supabase-based)
1. User triggers `process-one` for a submission record
2. Frontend calls `/api/documents/process-one` (Next.js API)
3. Next.js API:
   - Fetches submission data from Supabase
   - Calls Ollama API for AI processing
   - Updates submission record with extracted data

## Current Status

### ✅ Ready:
- All processing routes are server-only (`runtime = 'nodejs'`)
- Frontend calls Ollama server directly for batch processing
- File watcher configured to monitor correct folder
- Ollama server has required endpoints

### ⚠️ Manual Steps Required:
1. **Start Ollama Server**: `python ollama/server.py`
2. **Start File Watcher**: `npm run watch-files`
3. **Place Files Manually**: Currently submit API doesn't write files to disk
   - Option A: Manually copy files to `incoming/` folder
   - Option B: Modify submit route to write files to `incoming/` folder

### 🔧 To Make Fully Automatic:
Update `/api/documents/submit/route.js` to write uploaded file to incoming folder:
```javascript
// After creating submission record, write file to incoming folder
const incomingPath = process.env.OLLAMA_INCOMING_PATH || 
  'C:\\Users\\frost\\AppData\\Local\\Ollama\\data\\incoming';
await writeFile(path.join(incomingPath, fileName), await document.arrayBuffer());
```

## Testing

### Test File Processing:
1. Place a test PDF in `C:\Users\frost\AppData\Local\Ollama\data\incoming`
2. Watch file watcher logs - should detect and process
3. Check `processed/` folder - file should move there
4. Check dashboard - file should appear in processed list

### Test Batch Processing:
1. Upload multiple files via web UI
2. Go to Document Processor dashboard
3. Select files and click "Process Selected"
4. Should call Ollama server and process files

### Test Submission Processing:
1. Upload document via `/submit` page
2. Go to Submission Review page
3. Click "Reprocess" on a submission
4. Should trigger `process-one` and extract vulnerabilities

## Troubleshooting

### Files Not Processing:
- ✅ Check Ollama server is running: `curl http://127.0.0.1:5000/health`
- ✅ Check file watcher is running and logging
- ✅ Verify files are in correct `incoming/` folder
- ✅ Check Ollama server logs for errors

### Connection Errors:
- ✅ Verify `OLLAMA_LOCAL_URL` is `http://127.0.0.1:5000`
- ✅ Check firewall isn't blocking port 5000
- ✅ Verify `NEXT_PUBLIC_OLLAMA_URL` is set for client-side calls

### Files Not Appearing in Dashboard:
- ✅ Check Supabase submissions table has records
- ✅ Verify `/api/documents/status-all` endpoint works
- ✅ Check folder permissions on `data/` directory

