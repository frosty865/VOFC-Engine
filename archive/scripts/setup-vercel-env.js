#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * This script helps configure environment variables for Vercel deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Vercel environment variables...\n');

// Environment variables from your Supabase project
const envVars = {
  // Supabase Configuration
  'NEXT_PUBLIC_SUPABASE_URL': 'https://wivohgbuuwxoyfyzntsd.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJlUzI1NilsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpdm9oZ2J1dXd4b3lmeXpudHNkliwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2OTQyNDksImV4cCI6MjA3NTI3MDI0OX0.Vb7uUOkQ34bKSdufED8VXYPHTTJvZqQhgMKcJgTKSIg',
  'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJlUzI1NilsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZil6Indpdm9oZ2J1dXd4b3lmeXpudHNkliwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY5NDI0OSwiZXhwljoyMDc1MjcwMjQ5fQ.uVMA5t2eMCDbmj-jv6F-pzDEopHvFv-4CzpnJLowWEo',
  
  // JWT Secret (generate a secure one)
  'JWT_SECRET': 'vofc-engine-jwt-secret-2024-secure-key-change-in-production',
  
  // Admin Password for initial setup
  'ADMIN_PASSWORD': 'AdminSecure2024!',
  
  // Backup Configuration
  'BACKUP_ENCRYPTION_KEY': 'vofc-backup-encryption-key-2024-secure',
  
  // Database Configuration
  'DATABASE_PASSWORD': 'PatriciaF123!!!',
  'PROJECT_ID': 'wivohgbuuwxoyfyzntsd'
};

console.log('📋 Environment variables to set in Vercel:');
console.log('=====================================\n');

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n🔧 Vercel CLI Commands:');
console.log('======================\n');

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`vercel env add ${key}`);
});

console.log('\n📝 Manual Setup Instructions:');
console.log('============================\n');
console.log('1. Go to your Vercel dashboard');
console.log('2. Select your VOFC Engine project');
console.log('3. Go to Settings > Environment Variables');
console.log('4. Add each variable above');
console.log('5. Make sure to set them for Production, Preview, and Development');

console.log('\n🚀 Quick Setup Script:');
console.log('=====================\n');

// Create a script to set all environment variables
const setupScript = `#!/bin/bash
# Vercel Environment Variables Setup Script
# Run this after: vercel login

echo "Setting up environment variables for VOFC Engine..."

${Object.entries(envVars).map(([key, value]) => `vercel env add ${key} "${value}"`).join('\n')}

echo "✅ All environment variables set!"
echo "🚀 You can now deploy with: vercel --prod"
`;

fs.writeFileSync('setup-vercel-env.sh', setupScript);
console.log('✅ Created setup-vercel-env.sh script');

// Create .env.local for local development
const envLocalContent = Object.entries(envVars)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync('vofc-viewer/.env.local', envLocalContent);
console.log('✅ Updated .env.local for local development');

console.log('\n🎉 Environment setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Run: vercel login');
console.log('2. Run: vercel env add [VARIABLE_NAME] [VALUE] for each variable');
console.log('3. Or use the setup-vercel-env.sh script');
console.log('4. Run: vercel --prod');

console.log('\n⚠️  Security Note:');
console.log('- Change JWT_SECRET in production');
console.log('- Change ADMIN_PASSWORD after first login');
console.log('- Use strong, unique passwords');

module.exports = { envVars };
