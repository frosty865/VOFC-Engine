# VOFC Engine Scripts

This directory contains root-level utility scripts for the VOFC Engine project.

## 🛠️ **Available Scripts**

### **AI Management**
- **`ai-reindex.js`** - Automated AI tools reindexing and setup
  - Checks Ollama server connection
  - Installs dependencies
  - Tests AI connections
  - Usage: `node scripts/ai-reindex.js`

### **Network Utilities**
- **`find-ollama.js`** - Network scanner for Ollama servers
  - Scans local network for Ollama instances
  - Tests connectivity on port 11434
  - Usage: `node scripts/find-ollama.js`

### **Database Management**
- **`create-submission-tables.js`** - Database table creation
  - Creates submission tables in Supabase
  - Sets up proper schema and relationships
  - Usage: `node scripts/create-submission-tables.js`

## 🚀 **Usage Examples**

### **Setup AI Tools**
```bash
# Run AI reindexing
node scripts/ai-reindex.js

# Find Ollama servers
node scripts/find-ollama.js
```

### **Database Setup**
```bash
# Create submission tables
node scripts/create-submission-tables.js
```

## 📋 **Script Requirements**

### **Prerequisites**
- Node.js 18+
- Access to Ollama server (10.0.0.213:11434)
- Supabase credentials configured

### **Environment Variables**
```bash
# Required for AI scripts
OLLAMA_BASE=http://10.0.0.213:11434
OLLAMA_MODEL=vofc-engine:latest

# Required for database scripts
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🔧 **Script Details**

### **ai-reindex.js**
- **Purpose**: Automated AI tools setup and testing
- **Features**:
  - Ollama server connectivity check
  - Dependency installation verification
  - AI endpoint testing
  - Configuration validation

### **find-ollama.js**
- **Purpose**: Network discovery for Ollama servers
- **Features**:
  - IP range scanning (10.0.0.1-254)
  - Port 11434 connectivity testing
  - Server response validation
  - Results reporting

### **create-submission-tables.js**
- **Purpose**: Database schema setup
- **Features**:
  - Submission table creation
  - Foreign key relationships
  - Index creation
  - RLS policy setup

## ⚠️ **Important Notes**

- All scripts require proper environment configuration
- Database scripts use service role keys (bypass RLS)
- Network scripts may take time to complete scans
- AI scripts require Ollama server to be running

## 🐛 **Troubleshooting**

### **Common Issues**
1. **Ollama Connection Failed**
   - Check if Ollama server is running
   - Verify network connectivity
   - Check firewall settings

2. **Database Connection Failed**
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure service role key is valid

3. **Script Execution Errors**
   - Check Node.js version (18+)
   - Verify all dependencies installed
   - Check environment variables

---

**Last Updated**: October 28, 2025  
**Scripts Version**: 1.0.0
