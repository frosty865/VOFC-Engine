@echo off
REM Quick helper for local dev on Windows
echo Starting Ollama server...
start "Ollama Server" cmd /k "ollama serve"

echo Starting backend server...
cd apps/backend
npm run dev
