# VOFC Engine API Documentation

## 🔌 API Overview

The VOFC Engine provides a comprehensive REST API with enterprise-grade security, supporting authentication, content management, and system monitoring.

---

## 🔐 Authentication Endpoints

### **POST** `/api/auth/login`
**Purpose**: Secure user authentication with JWT tokens

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "full_name": "string",
    "role": "admin|spsa|psa|analyst",
    "agency": "string"
  },
  "sessionId": "uuid"
}
```

**Security Features**:
- ✅ **Rate limiting**: 5 attempts per 15 minutes
- ✅ **bcrypt password verification**
- ✅ **HTTP-only cookies** (no localStorage)
- ✅ **Account lockout protection**

---

### **GET** `/api/auth/verify`
**Purpose**: Verify authentication token

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "full_name": "string",
    "role": "string",
    "agency": "string"
  }
}
```

**Security Features**:
- ✅ **Server-side token validation**
- ✅ **Session expiration checking**
- ✅ **Automatic session cleanup**

---

### **POST** `/api/auth/logout`
**Purpose**: Secure user logout

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Security Features**:
- ✅ **Token invalidation**
- ✅ **Cookie clearing**
- ✅ **Session cleanup**

---

### **GET** `/api/auth/permissions`
**Purpose**: Check user permissions

**Query Parameters**:
- `permission` (optional): Specific permission to check

**Response**:
```json
{
  "success": true,
  "hasPermission": true,
  "permissions": {
    "canRead": true,
    "canWrite": false,
    "canValidate": true,
    "canPromote": false,
    "isAdmin": false
  }
}
```

---

## 📊 Content Management Endpoints

### **GET** `/api/vulnerabilities`
**Purpose**: Retrieve published vulnerabilities

**Query Parameters**:
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset
- `sector` (optional): Filter by sector
- `discipline` (optional): Filter by discipline

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "vulnerability": "string",
      "discipline": "string",
      "sector": "string",
      "source": "string",
      "created_at": "timestamp"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

---

### **GET** `/api/ofcs`
**Purpose**: Retrieve published Options for Consideration

**Query Parameters**:
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset
- `discipline` (optional): Filter by discipline

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "text": "string",
      "discipline": "string",
      "effort_level": "string",
      "effectiveness": "string",
      "source": "string"
    }
  ]
}
```

---

### **GET** `/api/vulnerability-ofc-links`
**Purpose**: Retrieve vulnerability-OFC relationships

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "vulnerability_id": "uuid",
      "ofc_id": "uuid"
    }
  ]
}
```

---

## 📝 Submission Endpoints

### **POST** `/api/submissions`
**Purpose**: Submit new VOFC content for review

**Request Body**:
```json
{
  "type": "vulnerability|ofc",
  "data": {
    "text": "string",
    "discipline": "string",
    "sector": "string",
    "source": "string"
  },
  "submitter_email": "string"
}
```

**Response**:
```json
{
  "success": true,
  "submission_id": "uuid",
  "message": "Submission received for review"
}
```

**Security Features**:
- ✅ **Input validation**
- ✅ **HTML sanitization**
- ✅ **XSS protection**

---

### **GET** `/api/submissions`
**Purpose**: Retrieve user submissions (Admin/SPSA only)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "vulnerability|ofc",
      "status": "pending|approved|rejected",
      "data": "object",
      "submitted_at": "timestamp"
    }
  ]
}
```

---

### **PUT** `/api/submissions/{id}/approve`
**Purpose**: Approve submission (Admin/SPSA only)

**Response**:
```json
{
  "success": true,
  "message": "Submission approved and published"
}
```

---

### **PUT** `/api/submissions/{id}/reject`
**Purpose**: Reject submission (Admin/SPSA only)

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Submission rejected"
}
```

---

## 💾 Backup Endpoints

### **POST** `/api/backup/create`
**Purpose**: Create encrypted database backup (Admin only)

**Response**:
```json
{
  "success": true,
  "filePath": "/path/to/encrypted/backup.sql.enc",
  "backupId": "uuid"
}
```

**Security Features**:
- ✅ **AES-256-GCM encryption**
- ✅ **Admin-only access**
- ✅ **Integrity verification**

---

### **GET** `/api/backup/list`
**Purpose**: List available backups (Admin only)

**Response**:
```json
{
  "success": true,
  "backups": [
    {
      "id": "uuid",
      "file_name": "string",
      "file_size": 12345,
      "created_at": "timestamp",
      "status": "completed|pending|failed"
    }
  ]
}
```

---

### **POST** `/api/backup/restore`
**Purpose**: Restore from backup (Admin only)

**Request Body**:
```json
{
  "backup_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Database restored successfully"
}
```

---

## 🏥 Monitoring Endpoints

### **GET** `/api/health`
**Purpose**: System health check

**Response**:
```json
{
  "status": "healthy|degraded|critical",
  "healthChecks": {
    "database": {
      "status": "healthy",
      "result": { "connected": true }
    },
    "authentication": {
      "status": "healthy",
      "result": { "service": "operational" }
    },
    "backup_system": {
      "status": "healthy",
      "result": { "accessible": true }
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

### **GET** `/api/metrics`
**Purpose**: System metrics and monitoring (Admin only)

**Response**:
```json
{
  "success": true,
  "metrics": {
    "requests": 1250,
    "errors": 5,
    "authFailures": 2,
    "backupOperations": 12,
    "uptime": 86400000,
    "errorRate": 0.4,
    "requestsPerMinute": 15
  },
  "recentAlerts": [
    {
      "id": "ALERT_123",
      "type": "high_error_rate",
      "severity": "high",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "healthChecks": { /* health check results */ }
}
```

---

## 🔧 User Management Endpoints

### **GET** `/api/users`
**Purpose**: List all users (Admin only)

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "user_id": "uuid",
      "username": "string",
      "full_name": "string",
      "role": "string",
      "agency": "string",
      "is_active": true,
      "last_login": "timestamp"
    }
  ]
}
```

---

### **POST** `/api/users`
**Purpose**: Create new user (Admin only)

**Request Body**:
```json
{
  "username": "string",
  "password": "string",
  "full_name": "string",
  "role": "admin|spsa|psa|analyst",
  "agency": "string"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "user_id": "uuid",
    "username": "string",
    "role": "string"
  }
}
```

---

### **PUT** `/api/users/{id}`
**Purpose**: Update user (Admin only)

**Request Body**:
```json
{
  "full_name": "string",
  "role": "string",
  "agency": "string",
  "is_active": true
}
```

---

### **DELETE** `/api/users/{id}`
**Purpose**: Delete user (Admin only)

**Response**:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 🛡️ Security Features

### **Authentication**
- **JWT tokens** with HTTP-only cookies
- **No localStorage** usage
- **Server-side session management**
- **Account lockout protection**

### **Authorization**
- **Role-based access control** (RBAC)
- **Resource-level permissions**
- **Admin-only endpoints**

### **Data Protection**
- **Input validation** and sanitization
- **XSS protection** with DOMPurify
- **SQL injection prevention**
- **Rate limiting**

### **Monitoring**
- **Health checks** for all services
- **Performance metrics**
- **Security event logging**
- **Automated alerting**

---

## 📋 Error Handling

### **Standard Error Response**
```json
{
  "success": false,
  "error": "Error message",
  "errorId": "ERR_1234567890_abc123",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### **HTTP Status Codes**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## 🔄 Rate Limiting

### **Authentication Endpoints**
- **Login**: 5 attempts per 15 minutes per IP
- **Other auth**: 10 requests per minute per IP

### **Content Endpoints**
- **Read operations**: 100 requests per minute per user
- **Write operations**: 20 requests per minute per user

### **Admin Endpoints**
- **User management**: 10 requests per minute per admin
- **Backup operations**: 5 requests per hour per admin

---

## 📚 Usage Examples

### **Authentication Flow**
```javascript
// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ username, password })
});

// Verify session
const verifyResponse = await fetch('/api/auth/verify', {
  credentials: 'include'
});

// Logout
const logoutResponse = await fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'include'
});
```

### **Content Retrieval**
```javascript
// Get vulnerabilities
const vulns = await fetch('/api/vulnerabilities?limit=50&sector=cybersecurity', {
  credentials: 'include'
});

// Get OFCs
const ofcs = await fetch('/api/ofcs?discipline=Physical Security', {
  credentials: 'include'
});
```

### **Submission**
```javascript
// Submit new vulnerability
const submission = await fetch('/api/submissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    type: 'vulnerability',
    data: {
      text: 'Unauthorized physical access to server room',
      discipline: 'Physical Security',
      sector: 'Information Technology'
    },
    submitter_email: 'user@example.com'
  })
});
```

---

## ⚠️ Security Notes

1. **All requests** must include credentials for authentication
2. **Sensitive operations** require admin permissions
3. **Rate limiting** is enforced on all endpoints
4. **Input validation** prevents malicious data
5. **Audit logging** tracks all operations

This API provides a secure, comprehensive interface for the VOFC Engine with enterprise-grade security and monitoring capabilities.

