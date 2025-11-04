# Thin Client Configuration for Field PCs

## 🎯 **Architecture Overview**

Field PCs have **no RAM or hard drives** - they are thin clients that must process everything on the Ollama server.

## 🏗️ **Correct Architecture:**

### **Field PC (Thin Client)**
- ✅ **Frontend Only**: Lightweight web interface
- ❌ **No Backend**: No local processing or storage
- ❌ **No File Storage**: No local file system
- ✅ **Network Only**: All communication via HTTP to Ollama server

### **Ollama Server (`10.0.0.213:11434`)**
- ✅ **AI Backend**: All processing logic
- ✅ **File Storage**: Document storage and management
- ✅ **Database**: All data persistence
- ✅ **Processing**: Document parsing and analysis

## 🔧 **Required Configuration:**

### **1. Frontend Configuration**
```javascript
// All API calls go directly to Ollama server
const OLLAMA_SERVER = 'http://10.0.0.213:11434';
const API_BASE = `${OLLAMA_SERVER}/api`;

// Document upload goes to Ollama server
const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/documents/submit`, {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};
```

### **2. Ollama Server Endpoints**
The Ollama server needs to provide:
- `POST /api/documents/submit` - Document upload and processing
- `GET /api/documents/list` - List processed documents
- `GET /api/documents/{id}` - Get document details
- `POST /api/parser/process-document` - Document parsing
- `GET /api/health` - Health check

### **3. File Storage on Ollama Server**
```
Ollama Server File System:
├── /documents/
│   ├── uploads/          # Original uploaded files
│   ├── processing/       # Files being processed
│   ├── completed/        # Successfully processed files
│   └── failed/          # Failed processing attempts
├── /data/
│   ├── submissions/      # Database records
│   └── metadata/        # Processing metadata
└── /logs/
    └── processing.log   # Processing logs
```

## 🚀 **Implementation Steps:**

### **Step 1: Deploy Backend to Ollama Server**
- Move AI backend code to Ollama server
- Configure Ollama server to run Express.js backend
- Set up file storage on Ollama server

### **Step 2: Update Frontend**
- Remove all local backend dependencies
- Point all API calls to Ollama server
- Remove local file storage logic

### **Step 3: Test Thin Client**
- Verify no local processing occurs
- Confirm all operations go to Ollama server
- Test document upload and processing

## 📊 **Current Status:**

### ❌ **What's Wrong:**
- AI backend running locally on field PC
- Local file storage being used
- Processing happening on thin client

### ✅ **What Should Happen:**
- All processing on Ollama server
- All storage on Ollama server
- Field PC only runs lightweight frontend

## 🎯 **Next Steps:**

1. **Stop local AI backend** on field PC
2. **Deploy backend to Ollama server**
3. **Update frontend** to use remote endpoints
4. **Test thin client** configuration

This ensures field PCs with no RAM/hard drives can still process documents through the Ollama server's resources.
