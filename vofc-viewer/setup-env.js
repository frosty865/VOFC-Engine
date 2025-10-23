#!/usr/bin/env node

/**
 * Environment Setup Script for VOFC Engine
 * 
 * This script helps you set up the required environment variables
 * for the VOFC Engine to connect to Supabase.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 VOFC Engine Environment Setup');
console.log('================================\n');

// Check if .env.local already exists
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists!');
  console.log('Please check your current environment variables:\n');
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log(envContent);
  } catch (error) {
    console.log('Could not read .env.local file');
  }
  
  console.log('\nIf you need to update the environment variables, please edit .env.local manually.');
  process.exit(0);
}

// Create .env.local template
const envTemplate = `# Supabase Configuration
# Replace these with your actual Supabase project values
# You can find these in your Supabase project dashboard under Settings > API

NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Secret for authentication (generate a secure random string)
JWT_SECRET=your-jwt-secret-here

# Optional: Admin password for initial setup
ADMIN_PASSWORD=your-admin-password-here

# Instructions:
# 1. Go to your Supabase project dashboard
# 2. Navigate to Settings > API
# 3. Copy the Project URL and API keys
# 4. Replace the placeholder values above with your actual values
# 5. Save this file and restart your development server
`;

try {
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env.local template file');
  console.log('\n📝 Next steps:');
  console.log('1. Open .env.local in your editor');
  console.log('2. Replace the placeholder values with your actual Supabase credentials');
  console.log('3. Save the file');
  console.log('4. Restart your development server (npm run dev)');
  console.log('\n🔗 Get your Supabase credentials from: https://supabase.com/dashboard');
} catch (error) {
  console.error('❌ Error creating .env.local file:', error.message);
  process.exit(1);
}
