# VOFC Processing System - Unified Startup

## Quick Start

### Windows (PowerShell) - Recommended
```powershell
.\scripts-dev\start-all.ps1
```

### Windows (Command Prompt)
```cmd
scripts-dev\start-all.bat
```

### Linux/Mac
```bash
chmod +x scripts-dev/start-all.sh
./scripts-dev/start-all.sh
```

## What It Does

The unified startup scripts will:

1. **Check Dependencies**
   - Verify Python is installed
   - Verify Node.js is installed

2. **Install Dependencies**
   - Install Python packages from `ollama/requirements.txt`
   - Install Node.js packages (if needed)

3. **Start Services**
   - **Flask Server** (Python) on `http://127.0.0.1:5000`
     - Handles file processing
     - Provides `/api/files/process` endpoint
     - Manages file storage in `C:\Users\frost\AppData\Local\Ollama\data\`
   
   - **File Watcher** (Node.js)
     - Monitors `C:\Users\frost\AppData\Local\Ollama\data\incoming\`
     - Automatically triggers processing when files are added
     - Runs in background

## Stopping Services

### PowerShell
```powershell
.\scripts-dev\stop-all.ps1
```

### Manual Stop
- Close the Flask server window (or press Ctrl+C)
- Close the File Watcher window (or press Ctrl+C)

## Services

### Flask Server (Python)
- **URL**: http://127.0.0.1:5000
- **Health Check**: http://127.0.0.1:5000/health
- **Processing**: http://127.0.0.1:5000/api/files/process
- **Status**: Shown in background window

### File Watcher (Node.js)
- **Monitors**: `C:\Users\frost\AppData\Local\Ollama\data\incoming\`
- **Triggers**: Automatically processes files
- **Status**: Shown in background window

## Troubleshooting

### Flask Server Not Responding
1. Check if port 5000 is in use: `netstat -ano | findstr :5000`
2. Make sure Python dependencies are installed: `pip install -r ollama/requirements.txt`
3. Check for errors in the Flask server window

### File Watcher Not Working
1. Verify Node.js is installed: `node --version`
2. Check that the incoming folder exists
3. Verify file permissions

### Both Services Fail to Start
1. Check Python: `python --version`
2. Check Node.js: `node --version`
3. Verify you're in the `vofc-viewer` directory

## Manual Start (Alternative)

If the unified script doesn't work, you can start services manually:

### Flask Server
```bash
cd vofc-viewer
python ollama/server.py
```

### File Watcher
```bash
cd vofc-viewer
node scripts-dev/file-watcher.js
```

