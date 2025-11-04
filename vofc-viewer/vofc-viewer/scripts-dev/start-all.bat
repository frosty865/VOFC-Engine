@echo off
REM ========================================
REM VOFC Processing System - Unified Startup
REM Starts Flask server, file watcher, and all services
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  VOFC Processing System - Unified Startup
echo ========================================
echo.

cd /d "%~dp0.."

REM Check Python
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)
python --version
echo.

REM Check Node.js
echo [2/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)
node --version
echo.

REM Install Python dependencies
echo [3/4] Installing Python dependencies...
cd vofc-viewer
python -m pip install -q -r ollama/requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)
echo Done.
echo.

REM Install Node.js dependencies (if needed)
echo [4/4] Checking Node.js dependencies...
if exist package.json (
    if not exist node_modules (
        echo Installing Node.js packages...
        call npm install --silent
    )
)
echo.

echo ========================================
echo  Starting Services
echo ========================================
echo.
echo Flask Server (Python) will run on: http://127.0.0.1:5000
echo File Watcher will monitor: C:\Users\frost\AppData\Local\Ollama\data\incoming
echo.
echo Press Ctrl+C to stop all services
echo ========================================
echo.

REM Start Flask server in a new window
echo Starting Flask server...
start "VOFC Flask Server" /min cmd /c "python ollama\server.py & echo Flask server stopped. & pause"

REM Wait a moment for Flask to start
timeout /t 3 /nobreak >nul

REM Start file watcher in a new window
echo Starting file watcher...
start "VOFC File Watcher" /min cmd /c "node scripts-dev\file-watcher.js & echo File watcher stopped. & pause"

REM Wait a moment
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo  Services Started
echo ========================================
echo.
echo Flask Server: Running in background window
echo File Watcher: Running in background window
echo.
echo To view logs, check the background windows
echo To stop services, close those windows or press Ctrl+C here
echo.

REM Test Flask server
echo Testing Flask server...
timeout /t 2 /nobreak >nul
curl -s http://127.0.0.1:5000/health >nul 2>&1
if errorlevel 1 (
    echo WARNING: Flask server may not be responding yet
    echo Give it a few more seconds to start up
) else (
    echo SUCCESS: Flask server is responding
)
echo.

echo All services are running!
echo This window will remain open to monitor the system.
echo Press any key to exit (services will continue running in background)...
pause >nul

