#!/usr/bin/env node

/**
 * Fix Authentication System
 * This script helps identify and fix authentication system conflicts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthSystem() {
  console.log('🔐 Testing Authentication System...\n');
  
  try {
    // Test Supabase Auth login
    console.log('🧪 Testing Supabase Auth login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'spsa@vofc.gov',
      password: 'Admin123!'
    });
    
    if (authError) {
      console.log('❌ Supabase Auth login failed:', authError.message);
    } else {
      console.log('✅ Supabase Auth login successful');
      console.log('   User ID:', authData.user.id);
      console.log('   Email:', authData.user.email);
    }
    
    // Test custom JWT verification
    console.log('\n🧪 Testing custom JWT verification...');
    try {
      const response = await fetch('https://vofc-viewer-e71abvtzl-matthew-frosts-projects-2f4ab76f.vercel.app/api/auth/verify', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Custom JWT verification successful:', result);
      } else {
        console.log('❌ Custom JWT verification failed:', response.status, response.statusText);
      }
    } catch (jwtError) {
      console.log('❌ Custom JWT verification error:', jwtError.message);
    }
    
    console.log('\n📋 Authentication System Analysis:');
    console.log('1. The application uses Supabase Auth for login');
    console.log('2. But the /api/auth/verify endpoint uses custom JWT');
    console.log('3. This mismatch causes 401 Unauthorized errors');
    console.log('\n💡 Solutions:');
    console.log('A. Update /api/auth/verify to use Supabase Auth');
    console.log('B. Or update login to use custom JWT system');
    console.log('C. Or create a hybrid system that works with both');
    
  } catch (error) {
    console.error('❌ Error testing auth system:', error.message);
  }
}

// Run the test
testAuthSystem();
