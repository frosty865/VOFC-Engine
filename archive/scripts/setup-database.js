#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSQLFile(filePath) {
  try {
    console.log(`📄 Reading SQL file: ${filePath}`);
    const sql = readFileSync(filePath, 'utf8');
    
    console.log(`🚀 Executing SQL...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Error executing SQL:`, error);
      return false;
    }
    
    console.log(`✅ SQL executed successfully`);
    return true;
  } catch (err) {
    console.error(`❌ Error reading/executing file:`, err.message);
    return false;
  }
}

async function setupDatabase() {
  console.log('🔧 Setting up VOFC Database Schema...\n');
  
  const sqlFiles = [
    '../sql/user_schema.sql',
    '../sql/staging_schema.sql',
    '../sql/validation_functions.sql',
    '../sql/promote_functions.sql',
    '../sql/enable_rls.sql'
  ];
  
  let allSuccess = true;
  
  for (const file of sqlFiles) {
    const fullPath = join(__dirname, file);
    const success = await executeSQLFile(fullPath);
    allSuccess = allSuccess && success;
    console.log(''); // Add spacing
  }
  
  if (allSuccess) {
    console.log('🎉 Database schema setup complete!');
    console.log('📝 You can now run the user seeding script.');
  } else {
    console.log('❌ Some SQL files failed to execute. Check the errors above.');
  }
}

setupDatabase().catch(console.error);

