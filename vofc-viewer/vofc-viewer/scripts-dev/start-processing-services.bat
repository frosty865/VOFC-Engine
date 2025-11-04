@echo off
echo ========================================
echo Starting VOFC Processing Services
echo ========================================
echo.
echo This will start:
echo   1. Ollama Server (http://127.0.0.1:5000)
echo   2. File Watcher (monitoring incoming folder)
echo.
echo Press Ctrl+C in each window to stop the services
echo.

cd /d "%~dp0.."
cd vofc-viewer

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo Installing/updating Python dependencies...
python -m pip install -q -r ollama/requirements.txt

echo.
echo Starting Ollama Server...
start "VOFC Ollama Server" cmd /k "cd /d %CD% && python ollama/server.py"

REM Wait a few seconds for server to start
echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Starting File Watcher...
start "VOFC File Watcher" cmd /k "cd /d %CD% && npm run watch-files"

echo.
echo ========================================
echo Both services are starting!
echo ========================================
echo.
echo - Ollama Server should be available at http://127.0.0.1:5000
echo - File Watcher is monitoring: C:\Users\frost\AppData\Local\Ollama\data\incoming
echo.
echo Two separate windows have opened - keep them running.
echo Close those windows to stop the services.
echo.
pause

