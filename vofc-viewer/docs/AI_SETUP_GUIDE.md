# AI Tools Setup Guide

This guide will help you set up AI tools that connect to your personal Ollama server for the VOFC Engine.

## Prerequisites

1. **Ollama Server Running**: Make sure Ollama is installed and running on your machine
2. **Model Downloaded**: Have at least one model downloaded (e.g., `llama3:8b-instruct`)

## Quick Setup

### 1. Start Ollama Server

```bash
# Start Ollama server (if not already running)
ollama serve

# Download a model (if not already downloaded)
ollama pull llama3:8b-instruct
```

### 2. Configure Environment Variables

Create a `.env` file in the `vofc-viewer/apps/backend/` directory:

```env
# Ollama Configuration
OLLAMA_BASE=http://localhost:11434
OLLAMA_MODEL=llama3:8b-instruct

# Alternative models you can use:
# OLLAMA_MODEL=llama3.1:8b-instruct
# OLLAMA_MODEL=llama3.1:70b-instruct
# OLLAMA_MODEL=mistral:7b-instruct
# OLLAMA_MODEL=codellama:7b-instruct

# AI Service Configuration
AI_TEMPERATURE=0.2
AI_TOP_P=0.9
AI_MAX_TOKENS=2048
```

### 3. Start Backend Server

```bash
cd vofc-viewer/apps/backend
npm install
npm start
```

### 4. Test AI Connection

Visit: `http://localhost:3001/api/ai-tools/test-connection`

You should see a response like:
```json
{
  "success": true,
  "response": "Ollama connection successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Available AI Tools

### 1. Vulnerability Analysis
- **Endpoint**: `POST /api/ai-tools/analyze-vulnerability`
- **Purpose**: Analyze vulnerability text for clarity, specificity, and improvements
- **Input**: `{ "vulnerabilityText": "...", "discipline": "..." }`

### 2. Generate New Vulnerabilities
- **Endpoint**: `POST /api/ai-tools/generate-vulnerabilities`
- **Purpose**: Generate new vulnerabilities for a specific sector
- **Input**: `{ "sector": "...", "context": "...", "count": 3 }`

### 3. OFC Analysis
- **Endpoint**: `POST /api/ai-tools/analyze-ofc`
- **Purpose**: Analyze an Option for Consideration for improvements
- **Input**: `{ "optionText": "...", "vulnerabilityContext": "..." }`

### 4. Generate New OFCs
- **Endpoint**: `POST /api/ai-tools/generate-ofcs`
- **Purpose**: Generate new OFCs for a vulnerability
- **Input**: `{ "vulnerabilityText": "...", "discipline": "...", "count": 3 }`

### 5. Test Connection
- **Endpoint**: `GET /api/ai-tools/test-connection`
- **Purpose**: Test if Ollama server is accessible

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
1. **Check Ollama is running**: `curl http://localhost:11434/api/tags`
2. **Verify model is downloaded**: `ollama list`
3. **Check environment variables**: Ensure `OLLAMA_BASE` and `OLLAMA_MODEL` are correct

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
curl -X GET http://localhost:3001/api/ai-tools/test-connection
```

### Analyze Vulnerability
```bash
curl -X POST http://localhost:3001/api/ai-tools/analyze-vulnerability \
  -H "Content-Type: application/json" \
  -d '{
    "vulnerabilityText": "The facility lacks proper access controls",
    "discipline": "Entry Controls"
  }'
```

### Generate OFCs
```bash
curl -X POST http://localhost:3001/api/ai-tools/generate-ofcs \
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
