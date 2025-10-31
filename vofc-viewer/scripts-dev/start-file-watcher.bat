@echo off
title VOFC File Watcher Service
echo ========================================
echo  VOFC Document File Watcher Service
echo ========================================
echo.
echo Starting file watcher...
echo Monitoring: C:\Users\frost\AppData\Local\Ollama\data\incoming
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

cd /d "%~dp0\.."
node scripts-dev/file-watcher.js

pause

