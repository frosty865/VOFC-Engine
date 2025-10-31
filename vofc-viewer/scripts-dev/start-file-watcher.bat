@echo off
echo ========================================
echo Starting VOFC File Watcher
echo ========================================
echo.

cd /d "%~dp0.."
cd vofc-viewer

echo Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Starting file watcher...
echo Monitoring: C:\Users\frost\AppData\Local\Ollama\data\incoming
echo Press Ctrl+C to stop the watcher
echo.

npm run watch-files

pause
