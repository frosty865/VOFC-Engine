# VOFC Engine Deployment Guide

## 🚀 Production Deployment

This guide covers the complete deployment process for the VOFC Engine with enterprise-grade security and monitoring.

---

## 📋 Prerequisites

### **System Requirements**
- **Node.js**: 18.x or higher
- **PostgreSQL**: 13.x or higher (Supabase)
- **Memory**: Minimum 2GB RAM
- **Storage**: 10GB+ available space
- **Network**: HTTPS capability

### **Environment Setup**
- **Domain**: Production domain with SSL
- **Database**: Supabase project configured
- **Backup Storage**: Secure backup location
- **Monitoring**: Health check endpoints

---

## 🔧 Installation Process

### **Step 1: Clone and Setup**
```bash
# Clone the repository
git clone <repository-url>
cd vofc-engine

# Install dependencies
npm install

# Install security dependencies
node scripts/install-secure-deps.js
```

### **Step 2: Environment Configuration**
```bash
# Your existing .env.local should contain:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Optional security enhancements:
JWT_SECRET=your_64_character_secret_here
BCRYPT_ROUNDS=12
BACKUP_ENCRYPTION_KEY=your_32_character_key_here
BACKUP_RETENTION_DAYS=30
```

### **Step 3: Database Setup**
```bash
# Initialize secure authentication system
node scripts/setup-secure-auth.js
```

This creates:
- ✅ Secure user tables with RLS
- ✅ Authentication functions
- ✅ Admin user with secure password
- ✅ Backup system schema
- ✅ Performance indexes

### **Step 4: Build Application**
```bash
# Build for production
npm run build

# Test the build
npm start
```

---

## 🐳 Docker Deployment

### **Dockerfile Configuration**
```dockerfile
# VOFC Engine Production Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Create backup directory
RUN mkdir -p /app/backups
RUN chown -R node:node /app
RUN chmod 700 /app/backups

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

### **Docker Compose**
```yaml
version: '3.8'

services:
  vofc-engine:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - BCRYPT_ROUNDS=${BCRYPT_ROUNDS}
      - BACKUP_DIR=/app/backups
      - BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY}
      - BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS}
    volumes:
      - ./backups:/app/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### **Deploy with Docker**
```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f vofc-engine

# Stop services
docker-compose down
```

---

## ☁️ Cloud Deployment

### **Vercel Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
```

### **AWS Deployment**
```bash
# Using AWS CLI
aws ecs create-service \
  --cluster vofc-cluster \
  --service-name vofc-engine \
  --task-definition vofc-task \
  --desired-count 1
```

### **Google Cloud Deployment**
```bash
# Using gcloud CLI
gcloud run deploy vofc-engine \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 🔒 Security Configuration

### **SSL/TLS Setup**
```nginx
# Nginx configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **Security Headers**
```javascript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ]
  }
}
```

---

## 📊 Monitoring Setup

### **Health Check Endpoints**
```bash
# Application health
curl https://your-domain.com/api/health

# Database connectivity
curl https://your-domain.com/api/health | jq '.healthChecks.database'

# Authentication service
curl https://your-domain.com/api/health | jq '.healthChecks.authentication'
```

### **Monitoring Configuration**
```yaml
# Prometheus monitoring
- job_name: 'vofc-engine'
  static_configs:
    - targets: ['localhost:3000']
  metrics_path: '/api/metrics'
  scrape_interval: 30s
```

### **Alerting Rules**
```yaml
# Alertmanager configuration
groups:
  - name: vofc-engine
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
      
      - alert: DatabaseDown
        expr: up{job="vofc-engine"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "VOFC Engine is down"
```

---

## 💾 Backup Configuration

### **Automated Backups**
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
curl -X POST https://your-domain.com/api/backup/create \
  -H "Cookie: auth-token=your-admin-token"
EOF

chmod +x backup.sh

# Schedule daily backups
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### **Backup Verification**
```bash
# List available backups
curl https://your-domain.com/api/backup/list \
  -H "Cookie: auth-token=your-admin-token"

# Verify backup integrity
curl -X POST https://your-domain.com/api/backup/verify \
  -H "Cookie: auth-token=your-admin-token" \
  -d '{"backup_id": "uuid"}'
```

---

## 🔧 Maintenance

### **Regular Updates**
```bash
# Update dependencies
npm update

# Security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Rebuild application
npm run build
```

### **Database Maintenance**
```sql
-- Clean up expired sessions
SELECT cleanup_expired_sessions();

-- Update statistics
ANALYZE;

-- Vacuum database
VACUUM ANALYZE;
```

### **Log Management**
```bash
# Rotate logs
logrotate /etc/logrotate.d/vofc-engine

# Archive old logs
tar -czf logs-$(date +%Y%m%d).tar.gz /var/log/vofc-engine/
```

---

## 🚨 Troubleshooting

### **Common Issues**

#### **Authentication Failures**
```bash
# Check JWT secret
echo $JWT_SECRET | wc -c  # Should be 64+ characters

# Verify database connection
curl https://your-domain.com/api/health | jq '.healthChecks.database'
```

#### **Database Connection Issues**
```bash
# Test Supabase connection
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  https://your-project.supabase.co/rest/v1/

# Check environment variables
env | grep SUPABASE
```

#### **Backup System Issues**
```bash
# Check backup directory permissions
ls -la ./backups/

# Verify encryption key
echo $BACKUP_ENCRYPTION_KEY | wc -c  # Should be 64 characters
```

### **Performance Optimization**
```bash
# Monitor memory usage
free -h

# Check disk space
df -h

# Monitor CPU usage
top -p $(pgrep node)
```

---

## 📋 Deployment Checklist

### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] Database schema created
- [ ] SSL certificates installed
- [ ] Security headers configured
- [ ] Backup system tested

### **Post-Deployment**
- [ ] Health checks passing
- [ ] Authentication working
- [ ] Backup system operational
- [ ] Monitoring configured
- [ ] Security scan completed

### **Ongoing Maintenance**
- [ ] Regular security updates
- [ ] Backup verification
- [ ] Performance monitoring
- [ ] Log analysis
- [ ] Security audits

---

## 🔐 Security Post-Deployment

### **Immediate Actions**
1. **Change default passwords**
2. **Enable HTTPS enforcement**
3. **Configure firewall rules**
4. **Set up monitoring alerts**
5. **Test backup/restore procedures**

### **Security Verification**
```bash
# Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Test rate limiting
for i in {1..10}; do
  curl -X POST https://your-domain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done

# Test health endpoint
curl https://your-domain.com/api/health
```

---

## 📞 Support

### **Documentation**
- **API Documentation**: `/docs/API_DOCUMENTATION.md`
- **Database Schema**: `/docs/DATABASE_SCHEMA.md`
- **Security Architecture**: `/docs/SECURITY_ARCHITECTURE.md`

### **Monitoring**
- **Health Check**: `https://your-domain.com/api/health`
- **Metrics**: `https://your-domain.com/api/metrics` (admin only)
- **Logs**: Application and security logs

### **Emergency Contacts**
- **Technical Support**: support@organization.com
- **Security Team**: security@organization.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX

This deployment guide ensures a secure, scalable, and maintainable VOFC Engine deployment with enterprise-grade security and monitoring capabilities.

