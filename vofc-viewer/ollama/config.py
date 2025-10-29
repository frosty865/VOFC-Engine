# Ollama Server Configuration

## Server Settings
- Host: 0.0.0.0
- Port: 11435
- Upload Directory: ./uploads/
- Model: vofc-engine:latest

## Endpoints

### File Management
- `GET /api/files/list` - List uploaded documents
- `GET /health` - Server health check

### Ollama API Compatibility
- `GET /api/version` - Server version
- `GET /api/tags` - Available models
- `POST /api/chat` - Chat endpoint
- `POST /api/generate` - Generate endpoint

## Setup Instructions

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   python server.py
   ```

3. Test the file listing:
   ```bash
   curl http://localhost:11435/api/files/list
   ```

4. Test health check:
   ```bash
   curl http://localhost:11435/health
   ```

## Integration with VOFC Engine

The VOFC Engine will connect to this server to:
- List documents in the uploads folder
- Process documents with Ollama models
- Track document processing status

Make sure to update your Ollama URL in the VOFC Engine to point to this server.
