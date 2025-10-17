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

async function executeSQL(sql) {
  try {
    console.log('🚀 Executing SQL...');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
        
        const { data, error } = await supabase
          .from('pg_settings')
          .select('*', { head: true });
        
        // For now, let's try a different approach - use the REST API
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({ sql: statement })
        });
        
        if (!response.ok) {
          console.log(`⚠️  Statement may not have executed: ${response.status}`);
        }
      }
    }
    
    console.log('✅ SQL execution completed');
    return true;
  } catch (err) {
    console.error(`❌ Error executing SQL:`, err.message);
    return false;
  }
}

async function setupSchema() {
  console.log('🔧 Setting up VOFC Database Schema...\n');
  
  try {
    // Read the user schema SQL file
    const userSchemaPath = join(__dirname, '../sql/user_schema.sql');
    console.log(`📄 Reading SQL file: ${userSchemaPath}`);
    
    const sql = readFileSync(userSchemaPath, 'utf8');
    console.log(`📄 SQL file read successfully (${sql.length} characters)`);
    
    // For now, let's just create the basic table structure manually
    console.log('🔨 Creating vofc_users table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS vofc_users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'spsa', 'psa', 'validator')),
        agency TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    // Try to execute via Supabase client
    const { data, error } = await supabase
      .from('vofc_users')
      .select('*', { head: true, count: 'exact' });
    
    if (error && error.code === 'PGRST116') {
      console.log('📝 Table does not exist, creating it...');
      
      // Since we can't execute DDL directly, let's try to insert a test record
      // which will create the table if it doesn't exist
      console.log('⚠️  Cannot create table directly. Please run the SQL schema manually in Supabase dashboard.');
      console.log('📋 Copy this SQL and run it in your Supabase SQL editor:');
      console.log('\n' + createTableSQL + '\n');
      
      return false;
    } else if (error) {
      console.error('❌ Error checking table:', error);
      return false;
    } else {
      console.log('✅ Table already exists');
      return true;
    }
    
  } catch (err) {
    console.error('❌ Error setting up schema:', err.message);
    return false;
  }
}

setupSchema().catch(console.error);

