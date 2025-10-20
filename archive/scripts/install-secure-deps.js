#!/usr/bin/env node

/**
 * Install Secure Dependencies
 * Installs the new security dependencies without affecting existing environment
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function installSecurityDependencies() {
  log('📦 Installing security dependencies...', 'blue');
  
  const securityDeps = [
    'isomorphic-dompurify@^2.8.0',
    'jsonwebtoken@^9.0.2'
  ];
  
  try {
    // Install new security dependencies
    execSync(`npm install ${securityDeps.join(' ')}`, { stdio: 'inherit' });
    log('✅ Security dependencies installed successfully', 'green');
  } catch (error) {
    log('❌ Failed to install security dependencies', 'red');
    log('Please run: npm install isomorphic-dompurify jsonwebtoken', 'yellow');
    process.exit(1);
  }
}

function checkExistingEnvironment() {
  log('🔍 Checking your existing environment...', 'blue');
  
  if (fs.existsSync('.env.local')) {
    log('✅ Found your .env.local file', 'green');
    
    // Load environment to check for required variables
    require('dotenv').config({ path: '.env.local' });
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      log(`⚠️ You may need to add these to your .env.local:`, 'yellow');
      missing.forEach(varName => log(`   - ${varName}`, 'yellow'));
    } else {
      log('✅ All required environment variables found', 'green');
    }
    
    // Check for optional security variables
    const optionalVars = ['JWT_SECRET', 'BCRYPT_ROUNDS', 'BACKUP_ENCRYPTION_KEY'];
    const missingOptional = optionalVars.filter(varName => !process.env[varName]);
    
    if (missingOptional.length > 0) {
      log('💡 Optional security variables you can add to .env.local:', 'blue');
      log('   JWT_SECRET=your_64_character_secret_here', 'blue');
      log('   BCRYPT_ROUNDS=12', 'blue');
      log('   BACKUP_ENCRYPTION_KEY=your_32_character_key_here', 'blue');
    }
    
  } else {
    log('⚠️ No .env.local file found', 'yellow');
    log('Please ensure your environment variables are configured', 'yellow');
  }
}

function createSecuritySetupGuide() {
  log('📝 Creating security setup guide...', 'blue');
  
  const guide = `# Security Setup Guide

## Next Steps for Secure Implementation

### 1. Database Setup
Run the secure authentication setup:
\`\`\`bash
node scripts/setup-secure-auth.js
\`\`\`

### 2. Test the Application
Start your development server:
\`\`\`bash
npm run dev
\`\`\`

### 3. Security Features Now Available

#### Authentication
- ✅ Server-side JWT authentication
- ✅ No localStorage dependencies
- ✅ Secure HTTP-only cookies
- ✅ Account lockout protection

#### Data Protection
- ✅ XSS prevention with HTML sanitization
- ✅ Input validation and sanitization
- ✅ Secure password hashing (bcrypt)

#### Database Security
- ✅ Row Level Security (RLS) policies
- ✅ Encrypted password storage
- ✅ Secure session management

#### Backup System
- ✅ Automated encrypted backups
- ✅ Backup integrity verification
- ✅ Retention policies

### 4. API Endpoints

#### Authentication
- \`POST /api/auth/login\` - Secure login
- \`GET /api/auth/verify\` - Token verification
- \`POST /api/auth/logout\` - Secure logout

#### Monitoring
- \`GET /api/health\` - Health check
- \`GET /api/metrics\` - System metrics (admin only)

#### Backup (Admin Only)
- \`POST /api/backup/create\` - Create backup
- \`GET /api/backup/list\` - List backups

### 5. Security Components

#### SafeHTML Component
Use \`<SafeHTML content={htmlContent} />\` instead of \`dangerouslySetInnerHTML\`

#### Authentication
Use \`AuthClient.getCurrentUser()\` instead of localStorage

### 6. Testing Security

#### Test Authentication
1. Try logging in with invalid credentials
2. Check rate limiting (5 attempts per 15 minutes)
3. Verify session persistence

#### Test XSS Protection
1. Submit content with HTML/JavaScript
2. Verify it's sanitized in display

#### Test Backup System
1. Create a backup (admin only)
2. Verify encryption
3. Test restore process

## Security Checklist

- [ ] Change default admin password
- [ ] Test all authentication flows
- [ ] Verify XSS protection
- [ ] Test backup system
- [ ] Check monitoring endpoints
- [ ] Review security logs

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check JWT_SECRET in .env.local
   - Verify database connection
   - Check browser cookies

2. **XSS protection not working**
   - Ensure SafeHTML component is used
   - Check DOMPurify installation

3. **Backup system not working**
   - Check BACKUP_ENCRYPTION_KEY
   - Verify backup directory permissions
   - Check database connection

### Support
- Check console logs for errors
- Review security documentation
- Test individual components
`;

  fs.writeFileSync('SECURITY_SETUP_GUIDE.md', guide);
  log('✅ Security setup guide created', 'green');
}

function main() {
  log('🔐 VOFC Engine Security Dependencies Installation', 'bright');
  log('================================================', 'bright');
  
  try {
    checkExistingEnvironment();
    installSecurityDependencies();
    createSecuritySetupGuide();
    
    log('\n🎉 Security dependencies installed successfully!', 'green');
    log('\n📋 Next Steps:', 'blue');
    log('1. Review SECURITY_SETUP_GUIDE.md', 'blue');
    log('2. Run: node scripts/setup-secure-auth.js', 'blue');
    log('3. Test your application', 'blue');
    log('4. Verify security features', 'blue');
    
  } catch (error) {
    log(`\n❌ Installation failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };

