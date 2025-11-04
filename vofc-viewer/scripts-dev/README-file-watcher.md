# File Watcher Service

Automatically processes documents that appear in the `C:\Users\frost\AppData\Local\Ollama\data\incoming` folder.

## Installation

```bash
npm install
```

This will install `chokidar` which is needed for file watching.

## Usage

### Run Manually

```bash
npm run watch-files
```

### Run as Background Service (Windows)

Using `pm2` (recommended):

```bash
npm install -g pm2
pm2 start scripts-dev/file-watcher.js --name file-watcher
pm2 save
pm2 startup
```

### Run as Windows Service

Create a batch file `start-file-watcher.bat`:

```batch
@echo off
cd /d "%~dp0"
node scripts-dev/file-watcher.js
```

Then create a Windows Task Scheduler task to run this batch file on startup.

## Configuration

Set these environment variables in `.env.local`:

```env
# File storage location
OLLAMA_FILE_STORAGE=C:\Users\frost\AppData\Local\Ollama\data
OLLAMA_INCOMING_PATH=C:\Users\frost\AppData\Local\Ollama\data\incoming

# Processing API URL (defaults to localhost:3000)
PROCESSING_API_URL=http://localhost:3000
# Or use your deployed URL:
# PROCESSING_API_URL=https://your-app.vercel.app
```

## How It Works

1. **Watches** the `incoming` folder for new files
2. **Waits** 5 seconds after a file appears (to ensure it's fully written)
3. **Calls** `/api/documents/process-pending` to process submissions linked to files
4. **Calls** `/api/documents/process-simple` to process any remaining files
5. **Periodically checks** every 30 seconds for any missed files

## Features

- ✅ Real-time file monitoring
- ✅ Prevents duplicate processing
- ✅ Handles file write completion (debouncing)
- ✅ Periodic fallback checks
- ✅ Color-coded console output
- ✅ Graceful shutdown on SIGINT/SIGTERM

## Troubleshooting

If files aren't being processed:

1. Check that the Next.js app is running (the watcher calls API endpoints)
2. Verify the `incoming` folder path is correct
3. Check console output for errors
4. Ensure the API endpoints are accessible
5. Check that files have finished being written (wait a few seconds after file appears)

## Logs

The watcher outputs colored logs:
- 🟢 Green = Success
- 🟡 Yellow = Warning
- 🔴 Red = Error
- 🔵 Blue = Info
- 🔵 Cyan = Processing

