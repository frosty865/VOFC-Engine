#!/usr/bin/env node

/**
 * Automated Vercel Environment Variables Setup
 * This script helps set up all environment variables for Vercel deployment
 */

const { execSync } = require('child_process');
const readline = require('readline');

console.log('🔧 Setting up Vercel environment variables...\n');

// Environment variables from your Supabase project
const envVars = {
  'NEXT_PUBLIC_SUPABASE_URL': 'https://wivohgbuuwxoyfyzntsd.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJlUzI1NilsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpdm9oZ2J1dXd4b3lmeXpudHNkliwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2OTQyNDksImV4cCI6MjA3NTI3MDI0OX0.Vb7uUOkQ34bKSdufED8VXYPHTTJvZqQhgMKcJgTKSIg',
  'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJlUzI1NilsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZil6Indpdm9oZ2J1dXd4b3lmeXpudHNkliwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY5NDI0OSwiZXhwljoyMDc1MjcwMjQ5fQ.uVMA5t2eMCDbmj-jv6F-pzDEopHvFv-4CzpnJLowWEo',
  'JWT_SECRET': 'vofc-engine-jwt-secret-2024-secure-key-change-in-production',
  'ADMIN_PASSWORD': 'AdminSecure2024!',
  'BACKUP_ENCRYPTION_KEY': 'vofc-backup-encryption-key-2024-secure',
  'DATABASE_PASSWORD': 'PatriciaF123!!!',
  'PROJECT_ID': 'wivohgbuuwxoyfyzntsd'
};

console.log('📋 Environment variables to set:');
console.log('================================\n');

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n🚀 Manual Setup Instructions:');
console.log('==============================\n');
console.log('Since the CLI requires interactive input, please:');
console.log('1. Go to your Vercel dashboard: https://vercel.com/dashboard');
console.log('2. Select your VOFC Engine project');
console.log('3. Go to Settings > Environment Variables');
console.log('4. Add each variable above');
console.log('5. Make sure to set them for Production, Preview, and Development');

console.log('\n🔧 Vercel CLI Commands (run these manually):');
console.log('============================================\n');

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`vercel env add ${key} production`);
  console.log(`# When prompted, enter: ${value}`);
  console.log('');
});

console.log('\n📝 Alternative: Use Vercel Dashboard');
console.log('====================================\n');
console.log('1. Go to https://vercel.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to Settings > Environment Variables');
console.log('4. Click "Add New" for each variable');
console.log('5. Copy and paste the values from above');

console.log('\n🎉 After setting environment variables:');
console.log('=====================================\n');
console.log('1. Run: vercel --prod');
console.log('2. Test your deployment');
console.log('3. Run database setup script');
console.log('4. Verify analytics are working');

module.exports = { envVars };
