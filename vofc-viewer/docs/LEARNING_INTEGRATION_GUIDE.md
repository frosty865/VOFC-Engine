# Ollama Learning Module Integration Guide

## Overview

The Ollama learning module is now fully integrated with the document processing workflow. This ensures that the AI system continuously improves based on the documents it processes.

## How the Learning Integration Works

### 1. Document Processing Flow

```
Document Upload → Ollama AI Processing → Learning Event Creation → Continuous Learning Trigger
```

### 2. Learning Event Capture

When a document is processed using Ollama AI:

1. **Event Storage**: Processing events are stored in the `learning_events` table
2. **Data Capture**: Extracted vulnerabilities, OFCs, and metadata are captured
3. **Learning Trigger**: Every 5 documents processed triggers a learning cycle
4. **Continuous Improvement**: The AI model learns from processing patterns

### 3. Database Schema

#### learning_events Table
- `event_type`: Type of learning event (document_processed, user_feedback, etc.)
- `filename`: Name of processed document
- `vulnerabilities_found`: Number of vulnerabilities extracted
- `ofcs_found`: Number of OFCs extracted
- `extraction_method`: Method used (ollama, basic, manual)
- `confidence`: AI confidence level (high, medium, low)
- `data`: JSONB field containing extracted data for learning
- `learning_processed`: Whether the event has been processed by learning system

#### learning_stats Table
- Tracks learning system performance metrics
- Monitors successful/failed retrains
- Tracks rules generated and embeddings updated
- System health monitoring

### 4. Learning System Components

#### Continuous Learning Daemon
- **Location**: `apps/backend/learning/continuous_learning.py`
- **Function**: Automatically retrains embeddings and rules based on human feedback
- **Triggers**: Every 4 hours or when 5+ new events are available

#### Adaptive Prompts
- **Location**: `apps/backend/ollama/adaptive_prompts.py`
- **Function**: Adapts Ollama prompts based on processing success patterns
- **Integration**: Updates system prompts for better document analysis

#### Pattern Learning
- **Location**: `apps/backend/ai/pattern_learner.py`
- **Function**: Discovers patterns in vulnerability and OFC extraction
- **Output**: Generates new rules and improves classification accuracy

### 5. API Integration

#### Document Processing API
- **File**: `app/api/documents/process/route.js`
- **Function**: Triggers learning events after successful AI processing
- **Learning Trigger**: Calls `/api/learning/start` with `action: 'cycle'`

#### Learning API
- **File**: `app/api/learning/start/route.js`
- **Actions**:
  - `start`: Start continuous learning daemon
  - `cycle`: Run single learning cycle
  - `status`: Get learning system status

### 6. UI Integration

#### DocumentProcessor Component
- **Learning Status Indicator**: Shows when learning system is active
- **AI Processing Status**: Shows when Ollama is processing documents
- **Learning Feedback**: Displays learning system health and metrics

#### Learning Monitor
- **File**: `app/components/LearningMonitor.jsx`
- **Function**: Monitor continuous learning system status
- **Features**: Start/stop learning, view metrics, run cycles

## Setup Instructions

### 1. Database Setup
```bash
# Run the learning database setup script
node setup_learning_database.js
```

### 2. Environment Variables
Ensure these are set in your `.env.local`:
```env
OLLAMA_API_BASE_URL=http://localhost:11434
OLLAMA_MODEL=vofc-engine:latest
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 3. Start Learning System
```bash
# Start continuous learning daemon
curl -X POST http://localhost:3000/api/learning/start \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

## Learning Workflow

### 1. Document Processing
1. User uploads document
2. Document processed with Ollama AI
3. Learning event created and stored
4. If 5+ events accumulated, trigger learning cycle

### 2. Learning Cycle
1. Analyze recent processing events
2. Identify patterns in successful extractions
3. Update AI prompts based on patterns
4. Retrain embeddings if needed
5. Generate new classification rules

### 3. Continuous Improvement
1. Learning system runs every 4 hours
2. Processes accumulated learning events
3. Updates AI model parameters
4. Improves extraction accuracy over time

## Monitoring Learning System

### 1. Learning Status
```bash
# Check learning system status
curl -X POST http://localhost:3000/api/learning/start \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

### 2. Learning Metrics
- **Total Events Processed**: Number of documents processed
- **Successful Retrains**: Number of successful model updates
- **Rules Generated**: Number of new classification rules
- **System Health**: Overall learning system health status

### 3. Learning Insights
- **Pattern Discovery**: New patterns found in vulnerability/OFC extraction
- **Accuracy Improvements**: Measured improvements in extraction accuracy
- **Adaptive Prompts**: Evolution of AI prompts for better performance

## Benefits of Learning Integration

### 1. Continuous Improvement
- AI model gets better with each document processed
- Learns from successful extraction patterns
- Adapts to new types of documents and content

### 2. Pattern Recognition
- Discovers common vulnerability patterns
- Identifies OFC extraction best practices
- Generates rules for better classification

### 3. Adaptive Performance
- Prompts evolve based on processing success
- Model parameters adjust to improve accuracy
- System becomes more efficient over time

### 4. Quality Assurance
- Tracks processing success rates
- Monitors AI confidence levels
- Identifies areas for improvement

## Troubleshooting

### 1. Learning System Not Starting
- Check Python dependencies are installed
- Verify Supabase connection
- Check learning database tables exist

### 2. Learning Events Not Created
- Verify document processing is using Ollama
- Check learning_events table exists
- Ensure service role has proper permissions

### 3. Learning Cycles Not Triggering
- Check if 5+ events are accumulated
- Verify learning API is accessible
- Check learning daemon is running

## Future Enhancements

### 1. Advanced Learning
- Deep learning model integration
- Neural network-based pattern recognition
- Advanced NLP techniques

### 2. User Feedback Integration
- Human feedback on extraction quality
- Manual corrections for learning
- Quality scoring system

### 3. Cross-Document Learning
- Learn from multiple document types
- Cross-sector pattern recognition
- Industry-specific adaptations

## Conclusion

The Ollama learning module is now fully integrated with the document processing workflow, ensuring continuous improvement of the AI system. The learning system captures processing events, analyzes patterns, and adapts the AI model for better performance over time.

This integration provides:
- ✅ Automatic learning from document processing
- ✅ Continuous AI model improvement
- ✅ Pattern recognition and rule generation
- ✅ Adaptive prompt optimization
- ✅ Performance monitoring and metrics
- ✅ Seamless integration with existing workflow
