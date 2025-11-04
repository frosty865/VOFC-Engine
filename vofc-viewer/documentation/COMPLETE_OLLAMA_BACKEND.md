# Complete Ollama Server Backend Architecture

## 🎯 **Architecture Constraints:**
- **Field PCs**: No RAM/hard drives (thin clients only)
- **Vercel**: No processing or storage capabilities  
- **Supabase**: Buckets too small for document library
- **Ollama Server**: Must handle ALL processing AND storage

## 🏗️ **Required Ollama Server Setup:**

### **Ollama Server (`10.0.0.213:11434`) Must Provide:**

#### **1. Document Management API**
```
POST /api/documents/submit          # Upload and process documents
GET  /api/documents/list            # List all documents
GET  /api/documents/{id}            # Get specific document
DELETE /api/documents/{id}         # Delete document
```

#### **2. Document Processing API**
```
POST /api/parser/process-document   # Process document content
GET  /api/parser/test-parsing       # Test parsing functionality
POST /api/parser/analyze-vulnerability  # Analyze vulnerabilities
POST /api/parser/generate-ofcs      # Generate OFCs
```

#### **3. Document Storage System**
```
Ollama Server File System:
/ollama-server/
├── models/                    # AI models (already exists)
│   ├── vofc-engine:latest
│   ├── llama3:latest
│   ├── mistral:latest
│   └── nomic-embed-text:latest
├── documents/                 # Document library
│   ├── uploads/              # Original uploaded files
│   ├── processing/           # Files being processed
│   ├── completed/            # Successfully processed
│   └── failed/               # Failed processing
├── database/                 # Local database
│   ├── submissions.db        # Document submissions
│   ├── vulnerabilities.db   # Extracted vulnerabilities
│   └── ofcs.db              # Options for consideration
└── logs/                    # Processing logs
    └── processing.log
```

#### **4. Database Schema (SQLite on Ollama Server)**
```sql
-- Documents table
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    source_title TEXT NOT NULL,
    source_type TEXT,
    author_org TEXT,
    publication_year INTEGER,
    content_restriction TEXT,
    document_type TEXT,
    document_size INTEGER,
    processed_at DATETIME,
    status TEXT DEFAULT 'completed',
    storage_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vulnerabilities table
CREATE TABLE vulnerabilities (
    id INTEGER PRIMARY KEY,
    document_id INTEGER,
    topic TEXT NOT NULL,
    category TEXT NOT NULL,
    vulnerability TEXT NOT NULL,
    confidence REAL,
    section_context TEXT,
    enhanced_at DATETIME,
    FOREIGN KEY (document_id) REFERENCES documents (id)
);

-- OFCs table
CREATE TABLE ofcs (
    id INTEGER PRIMARY KEY,
    document_id INTEGER,
    vulnerability_id INTEGER,
    option_text TEXT NOT NULL,
    confidence REAL,
    enhanced_at DATETIME,
    FOREIGN KEY (document_id) REFERENCES documents (id),
    FOREIGN KEY (vulnerability_id) REFERENCES vulnerabilities (id)
);
```

## 🚀 **Implementation Plan:**

### **Phase 1: Extend Ollama Server**
1. **Add Express.js backend** to Ollama server
2. **Implement SQLite database** for document storage
3. **Create file management system** on Ollama server
4. **Add document processing endpoints**

### **Phase 2: Update Frontend**
1. **Remove all local processing** from field PC
2. **Point all APIs** to Ollama server
3. **Remove Supabase dependencies**
4. **Implement thin client UI**

### **Phase 3: Test Architecture**
1. **Upload document** from field PC
2. **Verify processing** on Ollama server
3. **Confirm storage** on Ollama server
4. **Test retrieval** from field PC

## 📊 **Current Status:**

### ✅ **Available on Ollama Server:**
- AI models (vofc-engine, llama3, mistral, nomic-embed-text)
- Basic API endpoints (/api/chat, /api/tags, /api/version)
- File system for model storage

### ❌ **Missing on Ollama Server:**
- Document upload endpoints
- Document storage system
- Database for document metadata
- File management for documents
- Processing workflow endpoints

## 🎯 **Next Steps:**

1. **Deploy complete backend** to Ollama server
2. **Set up SQLite database** on Ollama server
3. **Implement file storage** on Ollama server
4. **Update frontend** to use Ollama server exclusively
5. **Test thin client** architecture

This ensures the Ollama server handles ALL processing and storage, making it suitable for field PCs with no local resources.
