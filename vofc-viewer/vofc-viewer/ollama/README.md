# Ollama Server Integration

This folder contains the Ollama server integration for the VOFC Engine.

## Structure

- `server.py` - Main Ollama server with file listing endpoint
- `requirements.txt` - Python dependencies
- `uploads/` - Directory for uploaded documents
- `config.py` - Server configuration

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   python server.py
   ```

3. The server will run on port 11435 and provide:
   - `/api/files/list` - List uploaded documents
   - `/api/chat` - Ollama chat endpoint
   - `/api/version` - Server version info

## Integration with VOFC Engine

The VOFC Engine will connect to this server at `https://ollama.frostech.site` to:
- List documents in the uploads folder
- Process documents with Ollama models
- Track document processing status
