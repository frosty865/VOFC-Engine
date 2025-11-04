# AI Tools Setup Guide

This guide will help you set up AI tools that connect to your personal Ollama server for the VOFC Engine, including document parsing and vulnerability analysis.

## Prerequisites

1. **Ollama Server Running**: Make sure Ollama is installed and running on your machine OR on another machine on your network
2. **Model Downloaded**: Have at least one model downloaded (e.g., `llama3:8b-instruct` or `vofc-engine:latest`)
3. **Network Access**: If using a remote Ollama server, ensure network connectivity

## Quick Setup

### 1. Start Ollama Server

**For Local Ollama Server:**
```bash
# Start Ollama server (if not already running)
ollama serve

# Download a model (if not already downloaded)
ollama pull llama3:8b-instruct
```

**For Remote Ollama Server:**
```bash
# On the remote machine running Ollama:
ollama serve --host 0.0.0.0:11434

# Download a model on the remote machine:
ollama pull llama3:8b-instruct
```

### 2. Configure Environment Variables

Create a `.env` file in the `vofc-viewer/apps/backend/` directory by copying the example:

```bash
# Copy the example environment file
cp vofc-viewer/apps/backend/env.example vofc-viewer/apps/backend/.env
```

The environment file should contain:

**For Local Ollama Server:**
```env
# Ollama Configuration
OLLAMA_BASE=http://localhost:11434
OLLAMA_MODEL=llama3:8b-instruct

# AI Service Configuration
AI_TEMPERATURE=0.2
AI_TOP_P=0.9
AI_MAX_TOKENS=2048

# Server Configuration
PORT=4000
```

**For Remote Ollama Server:**
```env
# Ollama Configuration (replace with actual IP)
OLLAMA_BASE=http://10.0.0.XXX:11434
OLLAMA_MODEL=llama3:8b-instruct

# AI Service Configuration
AI_TEMPERATURE=0.2
AI_TOP_P=0.9
AI_MAX_TOKENS=2048

# Server Configuration
PORT=4000
```

**Alternative models you can use:**
- `llama3.1:8b-instruct`
- `llama3.1:70b-instruct`
- `mistral:7b-instruct`
- `codellama:7b-instruct`

### 3. Start Backend Server

```bash
cd vofc-viewer/apps/backend
npm install
npm start
```

The backend server will start on port 4000 by default.

### 4. Test AI Connection

Visit: `http://localhost:4000/api/ai-tools/test-connection`

You should see a response like:
```json
{
  "success": true,
  "response": "Ollama connection successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Available AI Tools

### AI Tools (Basic Analysis)
- **Endpoint**: `POST /api/ai-tools/analyze-vulnerability`
- **Purpose**: Analyze vulnerability text for clarity, specificity, and improvements
- **Input**: `{ "vulnerabilityText": "...", "discipline": "..." }`

- **Endpoint**: `POST /api/ai-tools/generate-ofcs`
- **Purpose**: Generate new OFCs for a vulnerability
- **Input**: `{ "vulnerabilityText": "...", "discipline": "...", "count": 3 }`

- **Endpoint**: `GET /api/ai-tools/test-connection`
- **Purpose**: Test if Ollama server is accessible

### Ollama Parser (Document Processing)
- **Endpoint**: `POST /api/parser/process-document`
- **Purpose**: Parse security documents using Ollama with heuristic analysis
- **Input**: `{ "documentContent": "...", "documentType": "security_guidance", "sourceUrl": "...", "categoryHint": "..." }`

- **Endpoint**: `POST /api/parser/test-parsing`
- **Purpose**: Test document parsing functionality
- **Input**: `{}`

- **Endpoint**: `POST /api/parser/analyze-vulnerability`
- **Purpose**: Enhanced vulnerability analysis using Ollama
- **Input**: `{ "vulnerabilityText": "...", "discipline": "..." }`

- **Endpoint**: `POST /api/parser/generate-ofcs`
- **Purpose**: Enhanced OFC generation using Ollama
- **Input**: `{ "vulnerabilityText": "...", "discipline": "...", "count": 3 }`

## Frontend Integration

The AI tools are integrated into the main dashboard:

1. **AI Tools Button**: Each vulnerability card has a "🤖 AI Tools" button
2. **AI Tools Panel**: Click the button to open the AI tools panel
3. **Three Tabs Available**:
   - **Analyze Vulnerability**: Get AI analysis of the vulnerability
   - **Generate OFCs**: Create new Options for Consideration
   - **Test Connection**: Verify Ollama server connection

## Model Recommendations

### For Development/Testing:
- `llama3:8b-instruct` - Fast, good quality
- `mistral:7b-instruct` - Very fast, decent quality

### For Production:
- `llama3.1:70b-instruct` - High quality, slower
- `llama3.1:8b-instruct` - Good balance of speed and quality

## Troubleshooting

### Connection Issues
1. **Check Ollama is running**: 
   - Local: `curl http://localhost:11434/api/tags`
   - Remote: `curl http://REMOTE_IP:11434/api/tags`
2. **Verify model is downloaded**: `ollama list` (on the Ollama server machine)
3. **Check environment variables**: Ensure `OLLAMA_BASE` and `OLLAMA_MODEL` are correct
4. **Test network connectivity**: `ping REMOTE_IP` and `telnet REMOTE_IP 11434`

### Remote Server Issues
1. **Ollama not accessible**: Ensure Ollama is started with `ollama serve --host 0.0.0.0:11434`
2. **Firewall blocking**: Check if port 11434 is open on the remote machine
3. **Wrong IP address**: Verify the correct IP address of the Ollama server
4. **Network connectivity**: Ensure both machines are on the same network

### Performance Issues
1. **Use smaller models** for faster responses
2. **Adjust temperature** in environment variables
3. **Check system resources** (CPU/RAM usage)

### Model Quality Issues
1. **Try different models** (llama3.1, mistral, etc.)
2. **Adjust temperature** (0.1 for more focused, 0.5 for more creative)
3. **Use larger models** for better quality

## API Examples

### Test Connection
```bash
curl -X GET http://localhost:4000/api/ai-tools/test-connection
```

### Analyze Vulnerability
```bash
curl -X POST http://localhost:4000/api/ai-tools/analyze-vulnerability \
  -H "Content-Type: application/json" \
  -d '{
    "vulnerabilityText": "The facility lacks proper access controls",
    "discipline": "Entry Controls"
  }'
```

### Generate OFCs
```bash
curl -X POST http://localhost:4000/api/ai-tools/generate-ofcs \
  -H "Content-Type: application/json" \
  -d '{
    "vulnerabilityText": "The facility lacks proper access controls",
    "discipline": "Entry Controls",
    "count": 3
  }'
```

## Security Notes

- The AI tools connect to your local Ollama server
- No data is sent to external services
- All AI processing happens locally
- Environment variables should be kept secure

## Next Steps

1. **Test the connection** using the test endpoint
2. **Try the frontend AI tools** on a vulnerability
3. **Experiment with different models** to find the best fit
4. **Customize prompts** in the AI service files if needed
