@echo off
REM Auto-Ingestion Cron Job (Windows)
REM =================================
REM 
REM This script runs the auto-ingestion pipeline on a schedule.
REM Use Windows Task Scheduler to run this script periodically.
REM 
REM Examples:
REM   - Run every hour
REM   - Run every 6 hours  
REM   - Run daily at 2 AM

REM Configuration
set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%..
set PROJECT_ROOT=%BACKEND_DIR%..
set LOG_DIR=%BACKEND_DIR%\logs
set DOCS_DIR=%PROJECT_ROOT%\docs

REM Ensure log directory exists
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Change to backend directory
cd /d "%BACKEND_DIR%"

REM Load environment variables if .env exists
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set %%a=%%b
    )
)

REM Run the auto-ingestion pipeline
echo %date% %time%: Starting auto-ingestion pipeline >> "%LOG_DIR%\cron.log"

python pipeline\auto_ingest.py --path "%DOCS_DIR%" --cleanup 7 >> "%LOG_DIR%\cron.log" 2>&1

REM Check exit code
if %errorlevel% equ 0 (
    echo %date% %time%: Auto-ingestion completed successfully >> "%LOG_DIR%\cron.log"
) else (
    echo %date% %time%: Auto-ingestion failed with exit code %errorlevel% >> "%LOG_DIR%\cron.log"
)

REM Rotate logs if they get too large (keep last 10MB)
for %%F in ("%LOG_DIR%\cron.log") do (
    if %%~zF gtr 10485760 (
        move "%LOG_DIR%\cron.log" "%LOG_DIR%\cron.log.old"
        echo. > "%LOG_DIR%\cron.log"
    )
)
