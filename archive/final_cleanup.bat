@echo off
echo Final cleanup of orphaned files and directories...

REM Remove empty directories
if exist "data" (
    echo Removing data directory...
    rmdir /s /q "data"
)

if exist "logs" (
    echo Removing logs directory...
    rmdir /s /q "logs"
)

if exist "src" (
    echo Removing src directory...
    rmdir /s /q "src"
)

REM Remove orphaned files
if exist "VOFC_Library.xlsx" (
    echo Removing VOFC_Library.xlsx...
    del "VOFC_Library.xlsx"
)

echo.
echo Final cleanup completed!
echo.
echo Current project structure:
dir /b
echo.
pause


