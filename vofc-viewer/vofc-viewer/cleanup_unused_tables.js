require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Try to create a Postgres pool if DATABASE_URL is available
let pgPool = null;
if (databaseUrl) {
  try {
    pgPool = new Pool({ connectionString: databaseUrl });
    console.log('✓ Direct Postgres connection available\n');
  } catch (err) {
    console.warn(`⚠️  Could not create Postgres pool: ${err.message}`);
  }
}

// Tables we want to KEEP (don't drop these)
const KEEP_TABLES = [
  'user_profiles',  // Main profile table
  'auth.users',     // Supabase Auth (can't drop anyway)
];

// Tables we want to DROP (unused/redundant user tables)
const UNUSED_TABLES = [
  'vofc_users',
  'user_sessions',
  'user_groups',      // If not used elsewhere
  'user_permissions', // If not used elsewhere
];

async function checkTableExists(tableName) {
  try {
    // Try to query the table - if it fails, table doesn't exist or we can't access it
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // If error is about table not existing, return false
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return false;
      }
      // Other errors might mean table exists but has issues
      console.warn(`   ⚠️  Warning checking ${tableName}:`, error.message);
      return true; // Assume exists if unsure
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function getTableRowCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return { count: null, error: error.message };
    }
    return { count: count ?? 0, error: null };
  } catch (err) {
    return { count: null, error: err.message };
  }
}

async function executeSQL(sql) {
  // Method 1: Try direct Postgres connection if available
  if (pgPool) {
    try {
      const client = await pgPool.connect();
      try {
        await client.query(sql);
        return { success: true };
      } finally {
        client.release();
      }
    } catch (err) {
      return { success: false, error: err.message, sql };
    }
  }
  
  // Method 2: Try API route (requires Next.js server running and auth token)
  try {
    // Get Supabase session token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (token) {
      const response = await fetch('http://localhost:3000/api/admin/cleanup-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sql })
      });
      
      if (response.ok) {
        return { success: true };
      }
    }
  } catch (err) {
    // API route not available, continue to fallback
  }
  
  // Method 3: Fallback - return SQL for manual execution
  return { success: false, error: 'No direct database connection available. Set DATABASE_URL or run Next.js server to enable automatic execution.', sql };
}

async function dropTable(tableName) {
  const sql = `DROP TABLE IF EXISTS public.${tableName} CASCADE;`;
  console.log(`   🗑️  Dropping ${tableName}...`);
  
  const result = await executeSQL(sql);
  
  if (result.success) {
    console.log(`   ✅ Dropped ${tableName}`);
    return { success: true };
  } else {
    console.log(`   ⚠️  Could not auto-drop ${tableName}: ${result.error}`);
    console.log(`   📝 SQL: ${sql}`);
    return { success: false, sql };
  }
}

async function cleanupUnusedTables() {
  console.log('🔍 Checking for unused user tables...\n');
  
  // Check which unused tables exist
  const existingUnused = [];
  const sqlCommands = [];
  
  for (const tableName of UNUSED_TABLES) {
    const exists = await checkTableExists(tableName);
    if (exists) {
      const { count } = await getTableRowCount(tableName);
      console.log(`   ✓ Found: ${tableName} (${count ?? '?'} rows)`);
      existingUnused.push({ name: tableName, count });
      sqlCommands.push(`DROP TABLE IF EXISTS public.${tableName} CASCADE;`);
    } else {
      console.log(`   ✗ Not found: ${tableName}`);
    }
  }
  
  if (existingUnused.length === 0) {
    console.log('\n✅ No unused tables found. Database is clean!');
    return;
  }
  
  console.log(`\n📋 Found ${existingUnused.length} unused table(s) to drop:`);
  existingUnused.forEach(t => console.log(`   - ${t.name}`));
  
  // Attempt to drop tables using direct SQL execution
  console.log('\n🗑️  Attempting to drop tables...\n');
  
  const dropResults = [];
  for (const { name } of existingUnused) {
    const result = await dropTable(name);
    dropResults.push({ name, ...result });
    // Small delay between drops
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const successful = dropResults.filter(r => r.success);
  const failed = dropResults.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`\n✅ Successfully dropped ${successful.length} table(s)`);
  }
  
  if (failed.length > 0) {
    console.log(`\n⚠️  Could not auto-drop ${failed.length} table(s). SQL commands:`);
    console.log('─────────────────────────────────────────────────────────');
    failed.forEach(({ name, sql }) => {
      console.log(`-- ${name}:`);
      console.log(sql || `DROP TABLE IF EXISTS public.${name} CASCADE;`);
    });
    console.log('─────────────────────────────────────────────────────────');
    console.log('💡 Run these in Supabase Dashboard → SQL Editor\n');
  }
}

async function verifyUserProfilesSetup() {
  console.log('🔍 Verifying user_profiles table setup...\n');
  
  try {
    // Check if user_profiles exists
    const exists = await checkTableExists('user_profiles');
    if (!exists) {
      console.log('❌ user_profiles table does not exist!');
      return;
    }
    
    const { count } = await getTableRowCount('user_profiles');
    console.log(`   ✓ user_profiles exists (${count ?? '?'} rows)`);
    
    // Check schema by trying to query key columns
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, role, first_name, last_name, organization, is_active')
      .limit(1);
    
    if (error) {
      console.log(`   ⚠️  Schema check error: ${error.message}`);
    } else {
      console.log('   ✓ Schema appears correct');
    }
    
    // Check if user_id foreign key exists (informational)
    console.log('   ℹ️  Verify foreign key: user_profiles.user_id → auth.users.id');
    console.log('      (Should be set up with ON DELETE CASCADE)\n');
    
  } catch (err) {
    console.error('❌ Error verifying user_profiles:', err);
  }
}

async function main() {
  console.log('🧹 Database Cleanup: Removing Unused User Tables\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (!pgPool) {
    console.log('ℹ️  Note: DATABASE_URL not set. Will output SQL commands for manual execution.');
    console.log('   Set DATABASE_URL in .env to enable automatic execution.\n');
  }
  
  await verifyUserProfilesSetup();
  await cleanupUnusedTables();
  
  // Close Postgres pool if it was created
  if (pgPool) {
    await pgPool.end();
  }
  
  console.log('✅ Cleanup check complete!\n');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  if (pgPool) {
    pgPool.end();
  }
  process.exit(1);
});

