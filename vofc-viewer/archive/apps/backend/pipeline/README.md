# VOFC Auto-Ingestion Pipeline

Automated document processing pipeline for the VOFC Engine that monitors the `docs/` folder and automatically processes new documents through the complete workflow.

## 🚀 Features

- **Automatic Processing**: Monitors `docs/` folder for new documents
- **AI-Powered**: Uses Ollama for content normalization and analysis
- **Schema Validation**: Ensures data integrity before staging
- **Staging Workflow**: Documents are staged for admin review before going live
- **Comprehensive Logging**: Detailed logs for monitoring and debugging
- **Error Handling**: Robust error handling with retry mechanisms
- **File Management**: Automatic cleanup of old files
- **Cross-Platform**: Works on Windows, Linux, and macOS

## 📁 Directory Structure

```
pipeline/
├── auto_ingest.py          # Main orchestration script
├── setup_auto_ingest.py    # Setup and configuration
├── cron_auto_ingest.sh     # Unix/Linux cron job script
├── cron_auto_ingest.bat    # Windows batch script
├── README.md              # This documentation
└── requirements.txt        # Python dependencies

docs/                      # Source documents (created by setup)
├── README.md              # Documentation for docs folder
└── sample_*.txt           # Sample test documents

staging/                   # Temporary processing files
├── parsed_*.json          # Parsed document content
└── processed_*.done      # Processing completion markers

logs/                      # Log files
├── auto_ingest.log        # Main processing logs
├── cron.log              # Cron job execution logs
└── error.log             # Error-specific logs

completed/                 # Successfully processed documents
failed/                    # Failed processing attempts
archive/                   # Archived submissions
```

## 🛠️ Setup

### 1. Initial Setup

```bash
# Navigate to the pipeline directory
cd vofc-viewer/apps/backend/pipeline

# Run the setup script
python setup_auto_ingest.py
```

### 2. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Or install from the backend directory
pip install -r ../requirements.txt
```

### 3. Configure Environment

```bash
# Copy the sample environment file
cp .env.sample .env

# Edit the environment variables
nano .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `OLLAMA_BASE_URL`: URL for your Ollama instance (default: http://localhost:11434)

### 4. Test the Pipeline

```bash
# Test in dry-run mode
python auto_ingest.py --dry-run

# Test with actual processing
python auto_ingest.py --path docs
```

## ⏰ Scheduling

### Unix/Linux (Cron)

```bash
# Edit crontab
crontab -e

# Add one of these lines:
# Run every hour
0 * * * * /path/to/vofc-viewer/apps/backend/pipeline/cron_auto_ingest.sh

# Run every 6 hours
0 */6 * * * /path/to/vofc-viewer/apps/backend/pipeline/cron_auto_ingest.sh

# Run daily at 2 AM
0 2 * * * /path/to/vofc-viewer/apps/backend/pipeline/cron_auto_ingest.sh
```

### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily, hourly, etc.)
4. Set action to run `cron_auto_ingest.bat`
5. Configure to run with appropriate permissions

### Manual Execution

```bash
# Process documents once
python auto_ingest.py

# Process with custom path
python auto_ingest.py --path /path/to/documents

# Dry run (no database writes)
python auto_ingest.py --dry-run

# Cleanup old files (7 days default)
python auto_ingest.py --cleanup 7
```

## 📊 Monitoring

### Log Files

- **`logs/auto_ingest.log`**: Main processing logs
- **`logs/cron.log`**: Cron job execution logs
- **`logs/error.log`**: Error-specific logs

### Log Levels

- `INFO`: Normal processing steps
- `WARNING`: Non-critical issues
- `ERROR`: Processing failures
- `DEBUG`: Detailed debugging information

### Monitoring Commands

```bash
# View recent logs
tail -f logs/auto_ingest.log

# Check processing status
grep "Successfully processed" logs/auto_ingest.log

# View errors
grep "ERROR" logs/auto_ingest.log

# Check cron job status
tail -f logs/cron.log
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Required |
| `OLLAMA_BASE_URL` | Ollama instance URL | `http://localhost:11434` |
| `MAX_FILE_SIZE_MB` | Maximum file size | `50` |
| `SUPPORTED_FORMATS` | Supported file formats | `pdf,docx,txt,html` |
| `CLEANUP_DAYS` | Days to keep old files | `7` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Command Line Options

```bash
python auto_ingest.py [OPTIONS]

Options:
  --path PATH          Path to documents folder (default: docs)
  --dry-run            Run in dry-run mode (no database writes)
  --cleanup DAYS       Cleanup files older than N days (default: 7)
  --help               Show help message
```

## 📋 Processing Workflow

1. **Document Detection**: Scans `docs/` folder for new files
2. **Metadata Extraction**: Extracts document metadata (title, authors, year, etc.)
3. **Content Parsing**: Parses document content using universal parser
4. **AI Normalization**: Uses Ollama to normalize and structure content
5. **Schema Validation**: Validates data against VOFC schema
6. **Staging**: Saves to `vofc_submissions` table for admin review
7. **File Management**: Moves processed files to appropriate directories
8. **Logging**: Records all processing steps and results

## 🚨 Error Handling

### Common Issues

1. **Missing Dependencies**: Install requirements.txt
2. **Environment Variables**: Check .env file configuration
3. **File Permissions**: Ensure write access to staging and logs directories
4. **Ollama Connection**: Verify Ollama is running and accessible
5. **Database Connection**: Check Supabase credentials and network

### Troubleshooting

```bash
# Check Python dependencies
pip list | grep -E "(supabase|ollama|jsonschema)"

# Test Ollama connection
curl http://localhost:11434/api/tags

# Test Supabase connection
python -c "from supabase import create_client; print('Supabase OK')"

# Check file permissions
ls -la docs/ staging/ logs/

# View detailed logs
python auto_ingest.py --dry-run 2>&1 | tee debug.log
```

## 🔒 Security Considerations

- **File Validation**: All files are validated before processing
- **Schema Enforcement**: Strict schema validation prevents malformed data
- **Access Control**: Uses service role key for database access
- **Logging**: Comprehensive audit trail of all operations
- **Error Handling**: Prevents sensitive information in error logs

## 📈 Performance

### Optimization Tips

1. **File Size**: Keep documents under 50MB for optimal processing
2. **Batch Processing**: Process multiple documents in single run
3. **Cleanup**: Regular cleanup of old staging files
4. **Monitoring**: Monitor log files for performance issues

### Resource Usage

- **CPU**: Moderate usage during AI processing
- **Memory**: ~100MB base + document size
- **Disk**: Temporary files in staging directory
- **Network**: Ollama API calls and Supabase operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the VOFC Engine and follows the same licensing terms.

## 🆘 Support

For issues and questions:
1. Check the logs for error messages
2. Review this documentation
3. Check the main VOFC Engine documentation
4. Create an issue in the repository
