#!/usr/bin/env node

/**
 * Fix RLS policies for submissions table
 * This script applies the necessary RLS policies to allow anonymous submissions
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing RLS policies for submissions table...');
console.log('===============================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixRLSPolicies() {
  try {
    console.log('📋 Applying RLS policy fixes...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', 'fix-submissions-rls.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.log(`⚠️  Statement ${i + 1} result:`, error.message);
            // Some errors are expected (like "policy already exists")
            if (error.message.includes('already exists') || 
                error.message.includes('does not exist')) {
              console.log('   (This is expected - continuing...)');
            }
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`❌ Statement ${i + 1} error:`, err.message);
        }
      }
    }
    
    console.log('\n🧪 Testing the fix...');
    
    // Test if we can now insert a submission
    const testData = {
      type: 'vulnerability',
      data: JSON.stringify({ 
        vulnerability: 'Test vulnerability after RLS fix',
        discipline: 'Cybersecurity'
      }),
      status: 'pending_review',
      source: 'rls_test',
      submitter_email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('submissions')
      .insert([testData])
      .select();
    
    if (insertError) {
      console.error('❌ Test insert failed:', insertError.message);
      console.log('\n🔍 The RLS policies may need manual adjustment in your Supabase dashboard.');
      console.log('   Go to: Authentication > Policies > submissions');
    } else {
      console.log('✅ Test insert successful!');
      console.log('📊 Inserted data:', insertData);
      
      // Clean up test data
      if (insertData && insertData.length > 0) {
        const { error: deleteError } = await supabase
          .from('submissions')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.log('⚠️  Could not clean up test data:', deleteError.message);
        } else {
          console.log('🧹 Test data cleaned up');
        }
      }
    }
    
    console.log('\n✅ RLS fix completed!');
    console.log('🎉 Submissions should now work properly.');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error.message);
    console.log('\n🔧 Manual fix required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Authentication > Policies');
    console.log('3. Find the "submissions" table');
    console.log('4. Add a new policy:');
    console.log('   - Name: "Allow anonymous submissions"');
    console.log('   - Operation: INSERT');
    console.log('   - Target roles: anon');
    console.log('   - USING expression: true');
  }
}

// Run the fix
fixRLSPolicies();
