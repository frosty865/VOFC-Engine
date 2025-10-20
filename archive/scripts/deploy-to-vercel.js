#!/usr/bin/env node

/**
 * Vercel Deployment Script for VOFC Engine
 * This script helps deploy the VOFC Engine to Vercel
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing VOFC Engine for Vercel deployment...\n');

// Check if we're in the right directory
const currentDir = process.cwd();
const vofcViewerPath = path.join(currentDir, 'vofc-viewer');

if (!fs.existsSync(vofcViewerPath)) {
  console.error('❌ vofc-viewer directory not found!');
  console.error('Please run this script from the VOFC Engine root directory.');
  process.exit(1);
}

console.log('✅ Found vofc-viewer directory');

// Check if package.json exists
const packageJsonPath = path.join(vofcViewerPath, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found in vofc-viewer directory!');
  process.exit(1);
}

console.log('✅ Found package.json');

// Check if .env.local exists
const envLocalPath = path.join(vofcViewerPath, '.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.warn('⚠️  .env.local not found in vofc-viewer directory!');
  console.warn('You will need to set environment variables in Vercel dashboard.');
} else {
  console.log('✅ Found .env.local');
}

// Create .vercelignore file
const vercelIgnoreContent = `# Dependencies
node_modules/

# Environment files (use Vercel dashboard instead)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory
coverage/

# Build outputs
.next/
out/
build/
dist/

# Backup files
backups/
*.backup
*.bak

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# Supabase
.supabase/
`;

fs.writeFileSync(path.join(vofcViewerPath, '.vercelignore'), vercelIgnoreContent);
console.log('✅ Created .vercelignore file');

// Create deployment instructions
const deploymentInstructions = `
# Vercel Deployment Instructions

## 1. Environment Variables
Set these in your Vercel dashboard:

### Required Variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET

### Optional Variables:
- ADMIN_PASSWORD (for initial setup)
- BACKUP_ENCRYPTION_KEY (for backups)

## 2. Deployment Steps

### Option A: Vercel CLI
\`\`\`bash
cd vofc-viewer
vercel login
vercel --prod
\`\`\`

### Option B: GitHub Integration
1. Connect your GitHub repository to Vercel
2. Set the root directory to "vofc-viewer"
3. Set build command to "npm run build"
4. Set output directory to ".next"

## 3. Post-Deployment Setup

1. Run the database setup script:
   \`\`\`bash
   node scripts/setup-secure-simple.js
   \`\`\`

2. Test the application:
   - Visit your Vercel URL
   - Login with admin credentials
   - Verify all features work

## 4. Security Checklist

- [ ] Environment variables set in Vercel
- [ ] Database setup completed
- [ ] Admin user created
- [ ] SSL certificate active
- [ ] Security headers configured
- [ ] Rate limiting active

## 5. Monitoring

- Check Vercel dashboard for deployment status
- Monitor function logs for errors
- Set up alerts for critical issues
`;

fs.writeFileSync(path.join(vofcViewerPath, 'DEPLOYMENT.md'), deploymentInstructions);
console.log('✅ Created deployment instructions');

console.log('\n🎉 Vercel deployment preparation complete!');
console.log('\n📋 Next steps:');
console.log('1. Run: cd vofc-viewer');
console.log('2. Run: vercel login');
console.log('3. Run: vercel --prod');
console.log('4. Set environment variables in Vercel dashboard');
console.log('5. Run database setup script');

console.log('\n📚 See DEPLOYMENT.md for detailed instructions');
