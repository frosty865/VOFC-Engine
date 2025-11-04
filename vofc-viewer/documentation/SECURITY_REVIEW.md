# API Security and Data Validation Review

## 🚨 **Critical Security Issues Found**

### **1. Authentication Vulnerabilities**

#### **Hardcoded Credentials (HIGH RISK)**
```javascript
// File: app/api/auth/login/route.js
const validUsers = [
  { email: 'admin@vofc.gov', password: 'Admin123!', role: 'admin', name: 'Administrator' },
  { email: 'spsa@vofc.gov', password: 'Admin123!', role: 'spsa', name: 'Senior PSA' },
  // ... more hardcoded users
];
```
**Risk**: Hardcoded passwords in source code
**Impact**: Anyone with code access can login as admin
**Fix**: Move to environment variables or database

#### **Weak JWT Secret (HIGH RISK)**
```javascript
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);
```
**Risk**: Default fallback secret is public
**Impact**: JWT tokens can be forged
**Fix**: Require JWT_SECRET environment variable

### **2. Input Validation Issues**

#### **Missing Input Sanitization (MEDIUM RISK)**
```javascript
// File: app/api/ai-tools/analyze-vulnerability/route.js
const { vulnerabilityText } = await request.json();
// No validation or sanitization
```
**Risk**: XSS, injection attacks
**Impact**: Malicious input could affect AI processing
**Fix**: Add input validation and sanitization

#### **File Upload Vulnerabilities (HIGH RISK)**
```javascript
// File: app/api/documents/process/route.js
const document = formData.get('file');
// No file type validation, size limits, or sanitization
```
**Risk**: Malicious file uploads, DoS attacks
**Impact**: Server compromise, resource exhaustion
**Fix**: Add file validation, size limits, type checking

### **3. Data Exposure Issues**

#### **Service Role Key Exposure (HIGH RISK)**
```javascript
// Multiple files use service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```
**Risk**: Service role bypasses RLS policies
**Impact**: Unauthorized data access
**Fix**: Use regular client with proper RLS

#### **Sensitive Data Logging (MEDIUM RISK)**
```javascript
console.log('📄 Processing document via Vercel → Ollama:', {
  source_title,
  source_type,
  author_org,
  document_name: document?.name,
  document_size: document?.size
});
```
**Risk**: Sensitive data in logs
**Impact**: Data leakage through logs
**Fix**: Remove or sanitize logged data

### **4. Network Security Issues**

#### **Hardcoded Ollama URL (MEDIUM RISK)**
```javascript
const ollamaResponse = await fetch('http://10.0.0.213:11434/api/chat', {
```
**Risk**: Hardcoded internal IP
**Impact**: Configuration inflexibility
**Fix**: Use environment variable

#### **No Request Timeouts (LOW RISK)**
```javascript
const ollamaResponse = await fetch('http://10.0.0.213:11434/api/chat', {
  method: 'POST',
  // No timeout specified
```
**Risk**: Hanging requests
**Impact**: Resource exhaustion
**Fix**: Add request timeouts

## 🛡️ **Recommended Security Fixes**

### **1. Authentication Security**
```javascript
// Fix: Use environment variables for credentials
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Fix: Use Supabase Auth instead of hardcoded users
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

### **2. Input Validation**
```javascript
// Fix: Add input validation
import { z } from 'zod';

const vulnerabilitySchema = z.object({
  vulnerabilityText: z.string().min(1).max(10000).trim()
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { vulnerabilityText } = vulnerabilitySchema.parse(body);
    // ... rest of code
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    // ... handle other errors
  }
}
```

### **3. File Upload Security**
```javascript
// Fix: Add file validation
const ALLOWED_FILE_TYPES = ['text/plain', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request) {
  try {
    const formData = await request.formData();
    const document = formData.get('file');
    
    // Validate file
    if (!document || !ALLOWED_FILE_TYPES.includes(document.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    
    if (document.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }
    
    // ... rest of code
  } catch (error) {
    // ... error handling
  }
}
```

### **4. Network Security**
```javascript
// Fix: Use environment variables and timeouts
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
if (!OLLAMA_BASE_URL) {
  throw new Error('OLLAMA_BASE_URL environment variable is required');
}

const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(30000) // 30 second timeout
});
```

### **5. Data Protection**
```javascript
// Fix: Use regular Supabase client with RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Fix: Sanitize logged data
console.log('📄 Processing document:', {
  source_title: source_title?.substring(0, 50) + '...',
  document_size: document?.size,
  // Don't log sensitive content
});
```

## 🔒 **Security Best Practices Implementation**

### **1. Add Rate Limiting**
```javascript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

export async function POST(request) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  // ... rest of code
}
```

### **2. Add CORS Protection**
```javascript
import { NextResponse } from 'next/server';

export async function POST(request) {
  const response = NextResponse.json(data);
  
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://your-domain.com');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}
```

### **3. Add Request Size Limits**
```javascript
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
```

## 📊 **Security Score: 3/10 (CRITICAL)**

### **Issues Summary:**
- ❌ **Authentication**: Hardcoded credentials, weak JWT secret
- ❌ **Input Validation**: Missing sanitization, no file validation
- ❌ **Data Protection**: Service role exposure, sensitive logging
- ❌ **Network Security**: Hardcoded URLs, no timeouts
- ❌ **Access Control**: Missing rate limiting, CORS protection

### **Priority Fixes:**
1. **IMMEDIATE**: Fix hardcoded credentials and JWT secret
2. **HIGH**: Add input validation and file upload security
3. **MEDIUM**: Implement proper authentication with Supabase Auth
4. **LOW**: Add rate limiting and CORS protection

This security review reveals critical vulnerabilities that need immediate attention before production deployment.
