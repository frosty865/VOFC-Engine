#!/usr/bin/env node

/**
 * Script to remove dependencies before dropping user_profiles table
 * This script identifies and removes foreign key constraints and other dependencies
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeTableDependencies() {
  console.log('🔍 Identifying dependencies for user_profiles table...\n');

  try {
    // 1. Check for foreign key constraints
    console.log('📋 Checking for foreign key constraints...');
    
    const fkQuery = `
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (ccu.table_name = 'user_profiles' OR tc.table_name = 'user_profiles');
    `;

    const { data: fkData, error: fkError } = await supabase.rpc('exec', { sql: fkQuery });
    
    if (fkError) {
      console.log('⚠️  Could not check foreign keys via RPC, trying alternative approach...');
    } else if (fkData && fkData.length > 0) {
      console.log('🔗 Found foreign key constraints:');
      fkData.forEach(fk => {
        console.log(`   - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('✅ No foreign key constraints found');
    }

    // 2. Check for views that depend on user_profiles
    console.log('\n📋 Checking for views...');
    
    const viewQuery = `
      SELECT 
        schemaname,
        viewname,
        definition
      FROM pg_views 
      WHERE definition ILIKE '%user_profiles%';
    `;

    const { data: viewData, error: viewError } = await supabase.rpc('exec', { sql: viewQuery });
    
    if (viewError) {
      console.log('⚠️  Could not check views via RPC');
    } else if (viewData && viewData.length > 0) {
      console.log('👁️  Found views that depend on user_profiles:');
      viewData.forEach(view => {
        console.log(`   - ${view.schemaname}.${view.viewname}`);
      });
    } else {
      console.log('✅ No views found that depend on user_profiles');
    }

    // 3. Check for functions that depend on user_profiles
    console.log('\n📋 Checking for functions...');
    
    const functionQuery = `
      SELECT 
        n.nspname as schema_name,
        p.proname as function_name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE pg_get_functiondef(p.oid) ILIKE '%user_profiles%';
    `;

    const { data: funcData, error: funcError } = await supabase.rpc('exec', { sql: functionQuery });
    
    if (funcError) {
      console.log('⚠️  Could not check functions via RPC');
    } else if (funcData && funcData.length > 0) {
      console.log('🔧 Found functions that depend on user_profiles:');
      funcData.forEach(func => {
        console.log(`   - ${func.schema_name}.${func.function_name}`);
      });
    } else {
      console.log('✅ No functions found that depend on user_profiles');
    }

    // 4. Check for RLS policies
    console.log('\n📋 Checking for RLS policies...');
    
    const policyQuery = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE tablename = 'user_profiles';
    `;

    const { data: policyData, error: policyError } = await supabase.rpc('exec', { sql: policyQuery });
    
    if (policyError) {
      console.log('⚠️  Could not check RLS policies via RPC');
    } else if (policyData && policyData.length > 0) {
      console.log('🔒 Found RLS policies on user_profiles:');
      policyData.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('✅ No RLS policies found on user_profiles');
    }

    // 5. Provide manual cleanup steps
    console.log('\n📝 Manual cleanup steps:');
    console.log('1. Go to your Supabase SQL Editor');
    console.log('2. Run these commands in order:');
    console.log('');
    console.log('-- Step 1: Drop RLS policies (if any)');
    console.log('DROP POLICY IF EXISTS "user_profiles_policy_name" ON user_profiles;');
    console.log('');
    console.log('-- Step 2: Drop foreign key constraints (if any)');
    console.log('ALTER TABLE other_table DROP CONSTRAINT IF EXISTS fk_constraint_name;');
    console.log('');
    console.log('-- Step 3: Drop views (if any)');
    console.log('DROP VIEW IF EXISTS view_name;');
    console.log('');
    console.log('-- Step 4: Drop functions (if any)');
    console.log('DROP FUNCTION IF EXISTS function_name();');
    console.log('');
    console.log('-- Step 5: Finally drop the table');
    console.log('DROP TABLE IF EXISTS user_profiles CASCADE;');
    console.log('');
    console.log('⚠️  Note: Replace the placeholder names with actual constraint/view/function names from the output above.');

  } catch (error) {
    console.error('❌ Error checking dependencies:', error);
    process.exit(1);
  }
}

// Run dependency check
if (require.main === module) {
  removeTableDependencies()
    .then(() => {
      console.log('\n✅ Dependency check completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Dependency check error:', error);
      process.exit(1);
    });
}

module.exports = { removeTableDependencies };
