# VOFC Engine Documentation

## 📚 Documentation Overview

This directory contains comprehensive documentation for the VOFC Engine, a secure, enterprise-grade application for managing Vulnerabilities and Options for Consideration (VOFC).

---

## 📖 Documentation Structure

### **Core Documentation**
- **[Database Schema](DATABASE_SCHEMA.md)** - Complete database structure and relationships
- **[API Documentation](API_DOCUMENTATION.md)** - REST API endpoints and usage
- **[Security Architecture](SECURITY_ARCHITECTURE.md)** - Security implementation and controls
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment instructions

### **Additional Resources**
- **[Security Guide](../SECURITY_GUIDE.md)** - Security implementation overview
- **[Security Setup Guide](../SECURITY_SETUP_GUIDE.md)** - Setup instructions
- **[Security Checklist](../SECURITY_CHECKLIST.md)** - Security verification checklist

---

## 🏗️ System Architecture

### **Three-Tier Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Presentation  │    │   Application   │    │      Data      │
│                 │    │                 │    │                 │
│ • React/Next.js │───▶│ • API Routes    │───▶│ • PostgreSQL   │
│ • Secure UI     │    │ • Authentication│    │ • Supabase     │
│ • No localStorage│    │ • Authorization │    │ • Encrypted    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Security Layers**
- **Network**: HTTPS, Firewall, DDoS Protection
- **Application**: JWT, RBAC, Input Validation
- **Database**: RLS, Encryption, Audit Logging
- **Infrastructure**: Container Security, Monitoring

---

## 🔐 Security Features

### **Authentication & Authorization**
- ✅ **Zero localStorage** - All authentication server-side
- ✅ **JWT tokens** with HTTP-only cookies
- ✅ **Role-based access control** (Admin, SPSA, PSA, Analyst)
- ✅ **Account lockout protection**
- ✅ **Rate limiting** (5 attempts per 15 minutes)

### **Data Protection**
- ✅ **XSS prevention** with HTML sanitization
- ✅ **SQL injection protection** with parameterized queries
- ✅ **Input validation** and sanitization
- ✅ **Encrypted backups** (AES-256-GCM)

### **Database Security**
- ✅ **Row Level Security** on all tables
- ✅ **Encrypted password storage** (bcrypt)
- ✅ **Secure session management**
- ✅ **Comprehensive audit logging**

---

## 🚀 Quick Start

### **1. Install Dependencies**
```bash
# Install security dependencies
node scripts/install-secure-deps.js
```

### **2. Setup Database**
```bash
# Initialize secure authentication system
node scripts/setup-secure-auth.js
```

### **3. Start Application**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### **4. Test Security**
```bash
# Health check
curl http://localhost:3000/api/health

# Authentication test
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

---

## 📊 API Endpoints

### **Authentication**
- `POST /api/auth/login` - Secure login
- `GET /api/auth/verify` - Token verification
- `POST /api/auth/logout` - Secure logout
- `GET /api/auth/permissions` - Permission checks

### **Content Management**
- `GET /api/vulnerabilities` - Retrieve vulnerabilities
- `GET /api/ofcs` - Retrieve OFCs
- `GET /api/vulnerability-ofc-links` - Get relationships
- `POST /api/submissions` - Submit content

### **System Management**
- `GET /api/health` - Health monitoring
- `GET /api/metrics` - System metrics (admin)
- `POST /api/backup/create` - Create backup (admin)
- `GET /api/backup/list` - List backups (admin)

---

## 🗄️ Database Schema

### **Security Layer**
- `vofc_users` - User authentication
- `user_sessions` - Session management
- `user_permissions` - Role-based permissions

### **Staging Layer**
- `source_documents` - Document ingestion
- `ingestion_jobs` - Processing jobs
- `staging_vofc_records` - Extracted content
- `validation_log` - Validation tracking

### **Production Layer**
- `vulnerabilities` - Published vulnerabilities
- `options_for_consideration` - Published OFCs
- `vulnerability_ofc_links` - Content relationships
- `sectors` / `subsectors` - Organization structure

### **Backup System**
- `backup_metadata` - Backup tracking
- `backup_verification` - Integrity checks
- `backup_schedule` - Automated scheduling

---

## 🔧 Configuration

### **Environment Variables**
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Optional Security
JWT_SECRET=your_64_character_secret
BCRYPT_ROUNDS=12
BACKUP_ENCRYPTION_KEY=your_32_character_key
BACKUP_RETENTION_DAYS=30
```

### **Security Configuration**
- **Password Requirements**: 8+ chars, mixed case, numbers, symbols
- **Session Timeout**: 24 hours (configurable)
- **Rate Limiting**: 5 login attempts per 15 minutes
- **Backup Encryption**: AES-256-GCM
- **Database Security**: Row Level Security enabled

---

## 📈 Monitoring

### **Health Checks**
- **Database Connectivity**: Connection status
- **Authentication Service**: Token validation
- **Backup System**: Encryption and integrity
- **Session Management**: Token expiration
- **File System**: Backup directory access

### **Metrics**
- **Request Count**: Total API requests
- **Error Rate**: Failed request percentage
- **Authentication Failures**: Failed login attempts
- **Backup Operations**: Success/failure rates
- **System Uptime**: Application availability

### **Alerts**
- **High Error Rate**: >10% error rate
- **Database Down**: Connection failures
- **Backup Failures**: Backup operation failures
- **Suspicious Activity**: Unusual access patterns

---

## 🛠️ Development

### **Code Structure**
```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── lib/               # Utility libraries
├── lib/                   # Core libraries
│   ├── auth-server.js     # Server-side authentication
│   ├── security.js        # Security utilities
│   ├── database-backup.js # Backup system
│   └── monitoring.js      # Health monitoring
├── sql/                   # Database schemas
└── docs/                  # Documentation
```

### **Security Components**
- **AuthService**: Server-side authentication
- **SecurityUtils**: Input sanitization and validation
- **DatabaseBackupService**: Encrypted backup management
- **MonitoringService**: Health checks and metrics
- **SafeHTML**: XSS-safe HTML rendering

---

## 🔍 Troubleshooting

### **Common Issues**

#### **Authentication Problems**
- Check JWT_SECRET configuration
- Verify database connection
- Test session validation

#### **Database Issues**
- Verify Supabase credentials
- Check RLS policies
- Test connection health

#### **Backup Problems**
- Check BACKUP_ENCRYPTION_KEY
- Verify backup directory permissions
- Test backup creation

### **Debug Commands**
```bash
# Check environment
env | grep -E "(SUPABASE|JWT|BACKUP)"

# Test database connection
curl https://your-domain.com/api/health

# Verify authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

---

## 📞 Support

### **Documentation**
- **API Reference**: See [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Database Schema**: See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- **Security Details**: See [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md)
- **Deployment Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### **Getting Help**
- **Technical Issues**: Check troubleshooting section
- **Security Questions**: Review security documentation
- **Deployment Help**: Follow deployment guide
- **API Usage**: Reference API documentation

---

## 🎯 Key Features

### **Security First**
- Zero localStorage dependencies
- Server-side authentication
- Encrypted data storage
- XSS and injection protection

### **Enterprise Ready**
- Role-based access control
- Comprehensive audit logging
- Automated backup system
- Health monitoring

### **Scalable Architecture**
- Three-tier design
- Database optimization
- Performance monitoring
- Container support

### **Production Ready**
- Docker deployment
- Cloud platform support
- Monitoring and alerting
- Security compliance

This documentation provides everything needed to understand, deploy, and maintain the VOFC Engine with enterprise-grade security and reliability.

