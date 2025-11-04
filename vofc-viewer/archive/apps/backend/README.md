# VOFC Backend Development

## Quick Start

### Windows
```bash
# Start both Ollama and backend
devsync.bat
```

### Linux/Mac
```bash
# Start both Ollama and backend
./devsync.sh
```

## Development Workflow

### For Cursor (Code Editor)
- Check `ollama/ollamaTasks.md` for development tasks
- Focus on Python script optimization and testing
- Handle schema validation and database operations

### For Ollama (AI Agent)
- Context path: `apps/backend/data/`
- Default model: `llama3`
- Tools: `parse_pdf`, `normalize_json`, `link_supabase`, `verify_json`

## Architecture

```
apps/backend/
├── server/           # Express server (port 4000)
├── ollama/         # AI agent with context and memory
├── parsers/        # Python PDF/document parsers
├── ai/             # AI processing scripts
├── pipeline/       # Orchestration logic
├── supabase/       # Database client layer
└── data/           # Working directory
```

## Key Features

- **Intelligent Tool Selection**: Natural language commands automatically route to appropriate tools
- **Schema Validation**: Pydantic models ensure data integrity
- **Adaptive Prompts**: Different system prompts for parsing vs. linking tasks
- **Persistent Memory**: Agent learns from previous interactions
- **Comprehensive Logging**: Full audit trail in `data/agent_logs/`

## API Endpoints

- `POST /api/ollama` - Main Ollama agent endpoint
- Accepts natural language commands
- Returns structured responses with tool outputs
