#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const { data: settings, error: settingsError } = await supabase
      .from('pg_settings')
      .select('name', { head: true, count: 'exact' })
      .limit(1);
    
    if (settingsError) {
      console.error('❌ Basic connection failed:', settingsError);
      return false;
    }
    console.log('✅ Basic connection successful');
    
    // Test vofc_users table
    console.log('\n2. Testing vofc_users table...');
    const { data: users, error: usersError } = await supabase
      .from('vofc_users')
      .select('username, role, full_name')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Users table query failed:', usersError);
      return false;
    }
    console.log('✅ Users table accessible');
    console.log(`📊 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - ${user.full_name}`);
    });
    
    // Test if we can fetch questions (the main functionality)
    console.log('\n3. Testing questions table...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('question_id, question_text')
      .limit(3);
    
    if (questionsError) {
      console.log('⚠️  Questions table not found or empty:', questionsError.message);
      console.log('   This is expected if the database schema is not fully set up yet.');
    } else {
      console.log('✅ Questions table accessible');
      console.log(`📊 Found ${questions.length} questions`);
    }
    
    console.log('\n🎉 Database connection test completed successfully!');
    return true;
    
  } catch (err) {
    console.error('❌ Database test failed:', err.message);
    return false;
  }
}

testDatabaseConnection().catch(console.error);






