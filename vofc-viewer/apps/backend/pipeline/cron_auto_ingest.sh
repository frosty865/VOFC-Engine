#!/bin/bash
# Auto-Ingestion Cron Job
# ======================
# 
# This script runs the auto-ingestion pipeline on a schedule.
# Add to crontab with: crontab -e
# 
# Examples:
#   # Run every hour
#   0 * * * * /path/to/cron_auto_ingest.sh
#   
#   # Run every 6 hours
#   0 */6 * * * /path/to/cron_auto_ingest.sh
#   
#   # Run daily at 2 AM
#   0 2 * * * /path/to/cron_auto_ingest.sh

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$BACKEND_DIR")")"
LOG_DIR="$BACKEND_DIR/logs"
DOCS_DIR="$PROJECT_ROOT/docs"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Set up environment
cd "$BACKEND_DIR"

# Load environment variables if .env exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run the auto-ingestion pipeline
echo "$(date): Starting auto-ingestion pipeline" >> "$LOG_DIR/cron.log"

python3 pipeline/auto_ingest.py \
    --path "$DOCS_DIR" \
    --cleanup 7 \
    2>&1 | tee -a "$LOG_DIR/cron.log"

# Check exit code
if [ $? -eq 0 ]; then
    echo "$(date): Auto-ingestion completed successfully" >> "$LOG_DIR/cron.log"
else
    echo "$(date): Auto-ingestion failed with exit code $?" >> "$LOG_DIR/cron.log"
fi

# Rotate logs if they get too large (keep last 10MB)
if [ -f "$LOG_DIR/cron.log" ] && [ $(stat -f%z "$LOG_DIR/cron.log" 2>/dev/null || stat -c%s "$LOG_DIR/cron.log" 2>/dev/null) -gt 10485760 ]; then
    mv "$LOG_DIR/cron.log" "$LOG_DIR/cron.log.old"
    touch "$LOG_DIR/cron.log"
fi
