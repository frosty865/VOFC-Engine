# VOFC Engine API Documentation

## 🔌 **API Endpoints Overview**

### **Base URL**
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.vercel.app/api`

### **Authentication**
All API endpoints require proper authentication via JWT tokens or Supabase Auth.

---

## 🤖 **AI Tools Endpoints**

### **POST /api/ai-tools/analyze-vulnerability**
Analyzes vulnerability text using Ollama AI.

**Request Body:**
```json
{
  "vulnerabilityText": "Network vulnerability found: Unpatched Windows servers in DMZ"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": "{\"severity_level\": \"high\", \"impact_assessment\": \"...\", \"root_causes\": [...], \"affected_systems\": [...], \"mitigation_priority\": \"urgent\"}",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Security Note:** ⚠️ **CRITICAL** - No input validation implemented. Requires immediate security fix.

---

### **POST /api/ai-tools/generate-ofcs**
Generates Options for Consideration (OFCs) for vulnerabilities.

**Request Body:**
```json
{
  "vulnerabilityText": "Inadequate access control systems",
  "discipline": "Physical Security",
  "count": 3
}
```

**Response:**
```json
{
  "success": true,
  "ofcs": "{\"ofcs\": [{\"title\": \"Implement Multi-Factor Authentication\", \"description\": \"...\", \"implementation_steps\": [...], \"priority\": \"high\", \"estimated_effort\": \"weeks\", \"resources_needed\": [...]}]}",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### **GET /api/ai-tools/test-connection**
Tests connection to Ollama server.

**Response:**
```json
{
  "connected": true,
  "message": "Ollama server is reachable.",
  "models": [
    {
      "name": "vofc-engine:latest",
      "size": 1234567890,
      "modified_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📄 **Document Processing Endpoints**

### **POST /api/documents/process**
Processes documents using Ollama AI for vulnerability and OFC extraction.

**Request:** `multipart/form-data`
```javascript
const formData = new FormData();
formData.append('source_title', 'Security Assessment Report');
formData.append('source_type', 'security_guidance');
formData.append('source_url', 'https://example.com/report.pdf');
formData.append('author_org', 'CISA');
formData.append('publication_year', '2024');
formData.append('content_restriction', 'public');
formData.append('file', documentFile);
```

**Response:**
```json
{
  "success": true,
  "submission_id": "uuid-here",
  "status": "completed",
  "message": "Document processed successfully",
  "extraction_stats": {
    "total_entries": 5,
    "vulnerabilities_found": 3,
    "ofcs_found": 8
  },
  "entries": [
    {
      "topic": "Access Control Vulnerabilities",
      "category": "Physical Security",
      "vulnerability": "Inadequate access control systems",
      "options_for_consideration": [
        "Implement multi-factor authentication",
        "Install biometric access controls"
      ],
      "confidence": 0.85,
      "section_context": "Physical Security Assessment"
    }
  ]
}
```

**Security Note:** ⚠️ **CRITICAL** - No file validation implemented. Requires immediate security fix.

---

## 🔐 **Authentication Endpoints**

### **POST /api/auth/login**
Authenticates users and returns JWT token.

**Request Body:**
```json
{
  "email": "admin@vofc.gov",
  "password": "Admin123!"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "admin@vofc.gov",
    "email": "admin@vofc.gov",
    "role": "admin",
    "name": "Administrator"
  }
}
```

**Security Note:** ⚠️ **CRITICAL** - Hardcoded credentials and weak JWT secret. Requires immediate security fix.

---

### **POST /api/auth/logout**
Logs out user and invalidates session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### **GET /api/auth/validate**
Validates JWT token and returns user information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "admin@vofc.gov",
    "email": "admin@vofc.gov",
    "role": "admin",
    "name": "Administrator"
  }
}
```

---

## 📊 **Submission Management Endpoints**

### **POST /api/submissions**
Creates new vulnerability or OFC submissions.

**Request Body:**
```json
{
  "type": "vulnerability",
  "vulnerability": "Inadequate perimeter security",
  "discipline": "Physical Security",
  "subdiscipline": "Barriers and Fencing",
  "sources": "NIST SP 800-53",
  "source_title": "Security Controls Guide",
  "source_url": "https://example.com/guide.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "submission_id": "uuid-here",
  "status": "pending_review",
  "message": "Submission created and processed with Ollama API"
}
```

---

### **GET /api/submissions/[id]**
Retrieves specific submission details.

**Response:**
```json
{
  "success": true,
  "submission": {
    "id": "uuid-here",
    "type": "vulnerability",
    "data": "{\"vulnerability\": \"...\", \"discipline\": \"...\"}",
    "status": "pending_review",
    "source": "api_submission",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### **POST /api/submissions/[id]/approve**
Approves a submission for inclusion in the database.

**Response:**
```json
{
  "success": true,
  "message": "Submission approved successfully",
  "submission_id": "uuid-here"
}
```

---

### **POST /api/submissions/[id]/reject**
Rejects a submission.

**Request Body:**
```json
{
  "reason": "Insufficient detail provided"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Submission rejected",
  "submission_id": "uuid-here"
}
```

---

## 🏥 **System Health Endpoints**

### **GET /api/health**
Returns system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 12345,
  "memory": {
    "rss": 123456789,
    "heapTotal": 123456789,
    "heapUsed": 123456789,
    "external": 123456789
  },
  "version": "1.0.0"
}
```

**Cache:** 30 seconds

---

## 📈 **Monitoring Endpoints**

### **GET /api/monitor/system**
Returns system monitoring data.

**Response:**
```json
{
  "success": true,
  "system": {
    "cpu": 45.2,
    "memory": 67.8,
    "disk": 23.1,
    "uptime": 12345
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### **GET /api/monitor/processing**
Returns document processing status.

**Response:**
```json
{
  "success": true,
  "processing": {
    "pending": 5,
    "processing": 2,
    "completed": 150,
    "failed": 3
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔧 **Admin Endpoints**

### **GET /api/admin/submissions**
Returns all submissions for admin review.

**Response:**
```json
{
  "success": true,
  "vulnerabilitySubmissions": [...],
  "ofcSubmissions": [...],
  "documentSubmissions": [...],
  "allSubmissions": [...]
}
```

---

### **GET /api/admin/users**
Returns user management data.

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid-here",
      "email": "admin@vofc.gov",
      "role": "admin",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## ⚠️ **Security Warnings**

### **CRITICAL Issues Requiring Immediate Fix:**

1. **Hardcoded Credentials** (`/api/auth/login`)
   - Risk: Anyone with code access can login as admin
   - Fix: Move to environment variables or database

2. **Weak JWT Secret** (`/api/auth/login`)
   - Risk: JWT tokens can be forged
   - Fix: Require secure JWT_SECRET environment variable

3. **No Input Validation** (`/api/ai-tools/*`)
   - Risk: XSS, injection attacks
   - Fix: Add input validation and sanitization

4. **File Upload Vulnerabilities** (`/api/documents/process`)
   - Risk: Malicious file uploads, DoS attacks
   - Fix: Add file validation, size limits, type checking

5. **Service Role Exposure** (Multiple endpoints)
   - Risk: Unauthorized data access
   - Fix: Use regular Supabase client with proper RLS

### **Security Score: 3/10 (CRITICAL)**

**Do not deploy to production until security issues are resolved.**

---

## 📚 **Usage Examples**

### **JavaScript/TypeScript:**
```javascript
// Analyze vulnerability
const response = await fetch('/api/ai-tools/analyze-vulnerability', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vulnerabilityText: 'Inadequate access control systems'
  })
});
const result = await response.json();

// Process document
const formData = new FormData();
formData.append('file', documentFile);
formData.append('source_title', 'Security Report');

const docResponse = await fetch('/api/documents/process', {
  method: 'POST',
  body: formData
});
const docResult = await docResponse.json();
```

### **cURL:**
```bash
# Test AI connection
curl -X GET http://localhost:3000/api/ai-tools/test-connection

# Analyze vulnerability
curl -X POST http://localhost:3000/api/ai-tools/analyze-vulnerability \
  -H "Content-Type: application/json" \
  -d '{"vulnerabilityText": "Inadequate access control systems"}'

# Check system health
curl -X GET http://localhost:3000/api/health
```

---

## 🔄 **API Versioning**

Current API version: **v1.0.0**

All endpoints are under `/api/` with no version prefix. Future versions will use `/api/v2/` pattern.

---

## 📝 **Rate Limits**

**Current Status:** No rate limiting implemented
**Recommendation:** Implement rate limiting (10 requests/minute per IP)

---

## 🚨 **Error Handling**

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

This API documentation covers all current endpoints in the VOFC Engine system. **Remember: Security fixes are required before production deployment.**
