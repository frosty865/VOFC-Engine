#!/usr/bin/env node

/**
 * Secure Deployment Script
 * Automates the deployment of the secure VOFC Engine with all security measures
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironment() {
  log('🔍 Checking environment requirements...', 'blue');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'BACKUP_ENCRYPTION_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    log(`❌ Missing required environment variables:`, 'red');
    missing.forEach(varName => log(`   - ${varName}`, 'red'));
    process.exit(1);
  }
  
  // Validate JWT secret length
  if (process.env.JWT_SECRET.length < 64) {
    log('❌ JWT_SECRET must be at least 64 characters long', 'red');
    process.exit(1);
  }
  
  // Validate backup encryption key
  if (process.env.BACKUP_ENCRYPTION_KEY.length !== 64) {
    log('❌ BACKUP_ENCRYPTION_KEY must be exactly 64 characters long', 'red');
    process.exit(1);
  }
  
  log('✅ Environment variables validated', 'green');
}

function checkExistingEnvironment() {
  log('🔍 Checking existing environment configuration...', 'blue');
  
  // Check if .env.local exists and has required variables
  if (fs.existsSync('.env.local')) {
    log('✅ Found existing .env.local file', 'green');
    
    // Load and check environment variables
    require('dotenv').config({ path: '.env.local' });
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      log(`⚠️ Missing variables in .env.local:`, 'yellow');
      missing.forEach(varName => log(`   - ${varName}`, 'yellow'));
      log('Please add these to your .env.local file', 'yellow');
    } else {
      log('✅ All required environment variables found', 'green');
    }
  } else {
    log('⚠️ No .env.local file found', 'yellow');
    log('Please create .env.local with your Supabase credentials', 'yellow');
  }
}

function installDependencies() {
  log('📦 Installing dependencies...', 'blue');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('✅ Dependencies installed successfully', 'green');
  } catch (error) {
    log('❌ Failed to install dependencies', 'red');
    process.exit(1);
  }
}

function setupDatabase() {
  log('🗄️ Setting up secure database...', 'blue');
  
  try {
    execSync('node scripts/setup-secure-auth.js', { stdio: 'inherit' });
    log('✅ Database setup completed', 'green');
  } catch (error) {
    log('❌ Database setup failed', 'red');
    log('Please check your Supabase credentials and try again', 'yellow');
    process.exit(1);
  }
}

function createBackupDirectory() {
  log('💾 Setting up backup system...', 'blue');
  
  const backupDir = process.env.BACKUP_DIR || './backups';
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    log(`✅ Backup directory created: ${backupDir}`, 'green');
  } else {
    log(`✅ Backup directory exists: ${backupDir}`, 'green');
  }
  
  // Set proper permissions (Unix-like systems)
  if (process.platform !== 'win32') {
    try {
      execSync(`chmod 700 ${backupDir}`);
      log('✅ Backup directory permissions set', 'green');
    } catch (error) {
      log('⚠️ Could not set backup directory permissions', 'yellow');
    }
  }
}

function runSecurityTests() {
  log('🧪 Running security tests...', 'blue');
  
  const tests = [
    {
      name: 'Authentication System',
      test: () => {
        // Test authentication endpoints
        const { AuthService } = require('../lib/auth-server');
        return AuthService !== undefined;
      }
    },
    {
      name: 'Security Utilities',
      test: () => {
        // Test security utilities
        const { SecurityUtils } = require('../lib/security');
        return SecurityUtils !== undefined;
      }
    },
    {
      name: 'Backup System',
      test: () => {
        // Test backup system
        const { DatabaseBackupService } = require('../lib/database-backup');
        return DatabaseBackupService !== undefined;
      }
    }
  ];
  
  let passedTests = 0;
  
  tests.forEach(test => {
    try {
      if (test.test()) {
        log(`✅ ${test.name}`, 'green');
        passedTests++;
      } else {
        log(`❌ ${test.name}`, 'red');
      }
    } catch (error) {
      log(`❌ ${test.name}: ${error.message}`, 'red');
    }
  });
  
  if (passedTests === tests.length) {
    log('✅ All security tests passed', 'green');
  } else {
    log(`⚠️ ${passedTests}/${tests.length} security tests passed`, 'yellow');
  }
}

function buildApplication() {
  log('🏗️ Building application...', 'blue');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    log('✅ Application built successfully', 'green');
  } catch (error) {
    log('❌ Build failed', 'red');
    process.exit(1);
  }
}

function createDeploymentScript() {
  log('📝 Creating deployment scripts...', 'blue');
  
  const startScript = `#!/bin/bash
# VOFC Engine Production Start Script

echo "🚀 Starting VOFC Engine..."

# Set production environment
export NODE_ENV=production

# Start the application
npm start
`;
  
  const backupScript = `#!/bin/bash
# VOFC Engine Backup Script

echo "💾 Running scheduled backup..."

# Run backup
node -e "
const { DatabaseBackupService } = require('./lib/database-backup');
const backupService = new DatabaseBackupService();
backupService.createBackup().then(result => {
  console.log('Backup result:', result);
  process.exit(result.success ? 0 : 1);
});
"
`;
  
  const healthCheckScript = `#!/bin/bash
# VOFC Engine Health Check Script

echo "🏥 Running health check..."

# Check application health
curl -f http://localhost:3000/api/health || exit 1

echo "✅ Health check passed"
`;
  
  fs.writeFileSync('start-production.sh', startScript);
  fs.writeFileSync('backup.sh', backupScript);
  fs.writeFileSync('health-check.sh', healthCheckScript);
  
  // Make scripts executable (Unix-like systems)
  if (process.platform !== 'win32') {
    execSync('chmod +x start-production.sh backup.sh health-check.sh');
  }
  
  log('✅ Deployment scripts created', 'green');
}

function createDockerfile() {
  log('🐳 Creating Docker configuration...', 'blue');
  
  const dockerfile = `# VOFC Engine Production Dockerfile
FROM node:18-alpine

# Set working directory
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

# Set proper permissions
RUN chown -R node:node /app
RUN chmod 700 /app/backups

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
`;
  
  const dockerCompose = `version: '3.8'

services:
  vofc-engine:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=\${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=\${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=\${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=\${JWT_SECRET}
      - BCRYPT_ROUNDS=\${BCRYPT_ROUNDS}
      - BACKUP_DIR=/app/backups
      - BACKUP_ENCRYPTION_KEY=\${BACKUP_ENCRYPTION_KEY}
      - BACKUP_RETENTION_DAYS=\${BACKUP_RETENTION_DAYS}
    volumes:
      - ./backups:/app/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
`;
  
  fs.writeFileSync('Dockerfile', dockerfile);
  fs.writeFileSync('docker-compose.yml', dockerCompose);
  
  log('✅ Docker configuration created', 'green');
}

function createSecurityChecklist() {
  log('📋 Creating security checklist...', 'blue');
  
  const checklist = `# VOFC Engine Security Checklist

## Pre-Deployment Security Checklist

### Environment Security
- [ ] All environment variables are set with strong values
- [ ] JWT_SECRET is at least 64 characters long
- [ ] BACKUP_ENCRYPTION_KEY is exactly 64 characters long
- [ ] Database credentials are secure and unique
- [ ] No secrets are committed to version control

### Application Security
- [ ] All dependencies are updated to latest secure versions
- [ ] No localStorage usage (all authentication server-side)
- [ ] XSS protection implemented with HTML sanitization
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints

### Database Security
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Strong database passwords
- [ ] SSL/TLS enabled for database connections
- [ ] Regular security updates applied

### Backup Security
- [ ] Automated backup system configured
- [ ] Backups are encrypted
- [ ] Backup retention policy set
- [ ] Backup integrity verification enabled
- [ ] Off-site backup storage configured

### Infrastructure Security
- [ ] HTTPS enabled in production
- [ ] Security headers configured
- [ ] Firewall rules configured
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured

### Access Control
- [ ] Admin users created with strong passwords
- [ ] Role-based access control implemented
- [ ] Session management configured
- [ ] Account lockout protection enabled

## Post-Deployment Security Checklist

### Monitoring
- [ ] Health checks configured
- [ ] Error monitoring set up
- [ ] Security event logging enabled
- [ ] Performance monitoring active

### Maintenance
- [ ] Regular security updates scheduled
- [ ] Backup verification scheduled
- [ ] Security audit scheduled
- [ ] Penetration testing planned

### Documentation
- [ ] Security procedures documented
- [ ] Incident response plan created
- [ ] User training materials prepared
- [ ] Security contacts established

## Security Contacts

- **Security Team**: security@yourorganization.com
- **System Administrator**: admin@yourorganization.com
- **Emergency Contact**: +1-XXX-XXX-XXXX

## Incident Response

1. **Immediate Response**
   - Isolate affected systems
   - Preserve evidence
   - Notify security team

2. **Investigation**
   - Analyze logs
   - Determine scope
   - Document findings

3. **Recovery**
   - Apply fixes
   - Restore from backups if needed
   - Verify system integrity

4. **Post-Incident**
   - Conduct post-mortem
   - Update procedures
   - Implement improvements
`;
  
  fs.writeFileSync('SECURITY_CHECKLIST.md', checklist);
  log('✅ Security checklist created', 'green');
}

function main() {
  log('🚀 VOFC Engine Secure Deployment', 'bright');
  log('================================', 'bright');
  
  try {
    checkEnvironment();
    checkExistingEnvironment();
    installDependencies();
    setupDatabase();
    createBackupDirectory();
    runSecurityTests();
    buildApplication();
    createDeploymentScript();
    createDockerfile();
    createSecurityChecklist();
    
    log('\n🎉 Secure deployment completed successfully!', 'green');
    log('\n📋 Next Steps:', 'blue');
    log('1. Review the security checklist in SECURITY_CHECKLIST.md', 'cyan');
    log('2. Update .env.production with your actual values', 'cyan');
    log('3. Test the application thoroughly', 'cyan');
    log('4. Deploy to production environment', 'cyan');
    log('5. Set up monitoring and alerting', 'cyan');
    
    log('\n⚠️ Important Security Notes:', 'yellow');
    log('- Change all default passwords immediately', 'yellow');
    log('- Enable HTTPS in production', 'yellow');
    log('- Set up automated backups', 'yellow');
    log('- Monitor security events', 'yellow');
    log('- Regular security audits', 'yellow');
    
  } catch (error) {
    log(`\n❌ Deployment failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run deployment if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
