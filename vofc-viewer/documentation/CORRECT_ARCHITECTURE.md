# Correct Architecture: Ollama → Vercel/Supabase

## 🎯 **Correct Data Flow:**

### **1. Document Upload**
- **Field PC** → Upload document to **Ollama Server**
- **Ollama Server** → Process document with AI
- **Ollama Server** → Extract vulnerabilities and OFCs

### **2. Data Submission**
- **Ollama Server** → Send processed data to **Vercel/Supabase**
- **Vercel/Supabase** → Store structured data in database
- **Field PC** → Retrieve data from **Vercel/Supabase**

## 🔄 **Complete Workflow:**

```
Field PC (Thin Client)
    ↓ (Upload Document)
Ollama Server (Processing)
    ↓ (Send Processed Data)
Vercel/Supabase (Database Storage)
    ↓ (Retrieve Data)
Field PC (Display Results)
```

## 🚀 **Implementation:**

### **Ollama Server Processing:**
```javascript
// On Ollama Server
async function processDocument(documentContent) {
  // 1. Process with AI
  const aiResult = await ollamaChat([
    { role: "user", content: `Extract vulnerabilities and OFCs: ${documentContent}` }
  ]);
  
  // 2. Parse AI response
  const parsedData = JSON.parse(aiResult);
  
  // 3. Send to Vercel/Supabase
  await submitToDatabase(parsedData);
  
  return { success: true, data: parsedData };
}

async function submitToDatabase(data) {
  const response = await fetch('https://your-app.vercel.app/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vulnerabilities: data.vulnerabilities,
      ofcs: data.ofcs,
      source: 'ollama_processing',
      processed_at: new Date().toISOString()
    })
  });
  
  return response.json();
}
```

### **Vercel API Endpoint:**
```javascript
// /api/submissions/route.js
export async function POST(request) {
  const data = await request.json();
  
  // Store in Supabase
  const { data: submission, error } = await supabase
    .from('submissions')
    .insert([{
      type: 'document',
      data: JSON.stringify(data),
      status: 'completed',
      source: 'ollama_processing',
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
    
  return NextResponse.json({ success: true, submission });
}
```

### **Field PC Frontend:**
```javascript
// Upload document to Ollama
const uploadToOllama = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://10.0.0.213:11434/api/documents/process', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};

// Retrieve data from Vercel/Supabase
const getSubmissions = async () => {
  const response = await fetch('https://your-app.vercel.app/api/submissions');
  return response.json();
};
```

## 📊 **Data Structure:**

### **Ollama → Vercel/Supabase:**
```json
{
  "vulnerabilities": [
    {
      "topic": "Access Control Issues",
      "category": "Security Management|Access Control",
      "vulnerability": "Many facilities lack proper access control systems.",
      "confidence": 0.9,
      "section_context": "Vulnerability Assessment"
    }
  ],
  "ofcs": [
    {
      "text": "Implement comprehensive security measures including cameras, lighting, and access controls.",
      "confidence": 0.95,
      "related_vulnerability": "Access Control Issues"
    }
  ],
  "metadata": {
    "source_title": "Security Planning Workbook",
    "author_org": "DHS",
    "publication_year": 2024,
    "processed_at": "2025-10-29T00:21:58.621Z",
    "processing_method": "ollama_heuristic_parser"
  }
}
```

## 🎯 **Benefits:**

1. **Field PCs**: No processing/storage requirements
2. **Ollama Server**: Handles AI processing
3. **Vercel/Supabase**: Stores structured data
4. **Scalable**: Multiple field PCs can use same Ollama server
5. **Centralized**: All data in one database

## ✅ **Status:**
- ✅ Ollama server processing working
- ✅ Need to implement data submission to Vercel/Supabase
- ✅ Need to update frontend for thin client architecture
