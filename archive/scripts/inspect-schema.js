#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchema() {
  console.log('🔍 Inspecting Supabase database schema...\n');
  
  try {
    // Check specific tables that might exist
    console.log('📋 Checking for common VOFC tables:');
    
    // Check specific tables that might exist
    const tablesToCheck = [
      'questions',
      'vulnerabilities', 
      'ofcs',
      'sectors',
      'vofc_users',
      'staging_vofc_records',
      'readiness_resilience_assessment',
      'control_objective',
      'ofc_option'
    ];
    
    console.log('\n🔍 Checking specific tables:');
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { head: true, count: 'exact' });
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`❌ ${tableName}: Table does not exist`);
          } else {
            console.log(`⚠️  ${tableName}: Error - ${error.message}`);
          }
        } else {
          console.log(`✅ ${tableName}: Exists (${data?.length || 0} records)`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }
    
    // If we have a working table, let's see its structure
    console.log('\n📊 Sample data from available tables:');
    
    // Check vofc_users (we know this exists)
    const { data: users, error: usersError } = await supabase
      .from('vofc_users')
      .select('*')
      .limit(3);
    
    if (!usersError && users.length > 0) {
      console.log('\n👤 vofc_users sample:');
      console.log(JSON.stringify(users[0], null, 2));
    }
    
    // Check if there are any other tables with data
    for (const tableName of ['readiness_resilience_assessment', 'control_objective', 'ofc_option']) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data.length > 0) {
          console.log(`\n📄 ${tableName} sample:`);
          console.log(JSON.stringify(data[0], null, 2));
        }
      } catch (err) {
        // Table doesn't exist or other error
      }
    }
    
  } catch (err) {
    console.error('❌ Error inspecting schema:', err.message);
  }
}

inspectSchema().catch(console.error);
