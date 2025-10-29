# Correct Architecture: Ollama Server is Private

## 🎯 **Correct Architecture:**

### **Field PCs (Thin Clients)**
- ✅ **No processing/storage**: Zero local resources
- ✅ **Web interface only**: Lightweight frontend
- ✅ **Public access**: Connect to Vercel over internet

### **Vercel (Web Server)**
- ✅ **Public API**: Accessible from field PCs
- ✅ **Document handling**: Receives uploads from field PCs
- ✅ **Ollama integration**: Sends documents to private Ollama server
- ✅ **Database storage**: Stores processed data in Supabase

### **Ollama Server (Private Processing)**
- ❌ **NOT web-accessible**: Private network only
- ✅ **Internal processing**: Processes documents from Vercel
- ✅ **Returns data**: Sends processed data back to Vercel
- ✅ **No direct access**: Field PCs cannot reach Ollama directly

### **Supabase (Database)**
- ✅ **Data storage**: Stores processed vulnerabilities and OFCs
- ✅ **Public access**: Accessible from Vercel
- ✅ **Structured data**: No document files, only extracted data

## 🔄 **Correct Data Flow:**

```
Field PC (Internet)
    ↓ (Upload Document)
Vercel (Public Web Server)
    ↓ (Send to Private Network)
Ollama Server (Private Processing)
    ↓ (Return Processed Data)
Vercel (Web Server)
    ↓ (Store in Database)
Supabase (Database)
    ↓ (Retrieve Data)
Field PC (Display Results)
```

## 🚀 **Implementation:**

### **1. Vercel API Endpoint (`/api/documents/process`)**
```javascript
export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  
  // Extract document content
  const documentContent = await file.text();
  
  // Send to private Ollama server
  const ollamaResponse = await fetch('http://10.0.0.213:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'vofc-engine:latest',
      messages: [{
        role: 'user',
        content: `Extract vulnerabilities and OFCs: ${documentContent}`
      }]
    })
  });
  
  const aiResult = await ollamaResponse.json();
  
  // Store processed data in Supabase
  const { data, error } = await supabase
    .from('submissions')
    .insert([{
      type: 'document',
      data: JSON.stringify(aiResult),
      status: 'completed',
      source: 'ollama_processing'
    }]);
  
  return NextResponse.json({ success: true, data });
}
```

### **2. Field PC Frontend**
```javascript
// Upload document to Vercel (NOT Ollama)
const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('https://your-app.vercel.app/api/documents/process', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};
```

### **3. Ollama Server (Private)**
- Only accessible from Vercel server
- Processes documents and returns structured data
- No direct web access from field PCs

## 📊 **Network Architecture:**

### **Public Network (Internet)**
- Field PCs ↔ Vercel
- Vercel ↔ Supabase

### **Private Network (Internal)**
- Vercel ↔ Ollama Server (10.0.0.213:11434)

## ✅ **Benefits:**

1. **Security**: Ollama server not exposed to internet
2. **Scalability**: Multiple field PCs can use same Vercel instance
3. **Thin Clients**: Field PCs need no processing power
4. **Centralized**: All processing through Vercel
5. **Database**: Structured data in Supabase, not document files

## 🎯 **Current Status:**

- ❌ **Wrong**: Ollama server exposed to web
- ✅ **Correct**: Ollama server private, Vercel handles web requests
- ✅ **Correct**: Field PCs only connect to Vercel
- ✅ **Correct**: All processing through private Ollama server
