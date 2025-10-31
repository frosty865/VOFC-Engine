@echo off
echo ========================================
echo Starting VOFC Ollama Server
echo ========================================
echo.

cd /d "%~dp0.."
cd vofc-viewer

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Installing/updating Python dependencies...
python -m pip install -q -r ollama/requirements.txt

echo.
echo Starting Ollama server on http://127.0.0.1:5000
echo Press Ctrl+C to stop the server
echo.

python ollama/server.py

pause

