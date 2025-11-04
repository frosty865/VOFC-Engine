#!/bin/bash
# ========================================
# VOFC Processing System - Unified Startup (Linux/Mac)
# Starts Flask server, file watcher, and all services
# ========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT/vofc-viewer"

echo ""
echo "========================================"
echo " VOFC Processing System - Unified Startup"
echo "========================================"
echo ""

# Check Python
echo "[1/4] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python3 is not installed or not in PATH"
    exit 1
fi
python3 --version
echo ""

# Check Node.js
echo "[2/4] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    exit 1
fi
node --version
echo ""

# Install Python dependencies
echo "[3/4] Installing Python dependencies..."
python3 -m pip install -q -r ollama/requirements.txt
echo "Done."
echo ""

# Check Node.js dependencies
echo "[4/4] Checking Node.js dependencies..."
if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
    echo "Installing Node.js packages..."
    npm install --silent
fi
echo ""

echo "========================================"
echo " Starting Services"
echo "========================================"
echo ""
echo "Flask Server (Python) will run on: http://127.0.0.1:5000"
echo "File Watcher will monitor incoming folder"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================"
echo ""

# Start Flask server in background
echo "Starting Flask server..."
python3 ollama/server.py &
FLASK_PID=$!
sleep 3

# Start file watcher in background
echo "Starting file watcher..."
node scripts-dev/file-watcher.js &
WATCHER_PID=$!
sleep 2

echo ""
echo "========================================"
echo " Services Started"
echo "========================================"
echo ""
echo "Flask Server PID: $FLASK_PID"
echo "File Watcher PID: $WATCHER_PID"
echo ""

# Test Flask server
echo "Testing Flask server..."
sleep 2
if curl -s http://127.0.0.1:5000/health > /dev/null 2>&1; then
    echo "  SUCCESS: Flask server is responding"
else
    echo "  WARNING: Flask server may not be responding yet"
    echo "  Give it a few more seconds to start up"
fi
echo ""

echo "All services are running!"
echo ""
echo "To stop services, run:"
echo "  kill $FLASK_PID $WATCHER_PID"
echo ""
echo "Or press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
trap "echo ''; echo 'Stopping services...'; kill $FLASK_PID $WATCHER_PID 2>/dev/null; exit" INT TERM
wait

