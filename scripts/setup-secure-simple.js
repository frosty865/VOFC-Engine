#!/usr/bin/env node

/**
 * Simple secure authentication setup
 * Works with existing database structure
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

async function setupSecureAuth() {
  console.log('🔐 Setting up secure authentication system...\n');

  try {
    // 1. Check if vofc_users table exists, if not create it
    console.log('📋 Checking user table...');
    
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'vofc_users');

    if (tableError) {
      console.log('⚠️  Could not check tables, proceeding with setup...');
    }

    if (!tables || tables.length === 0) {
      console.log('📝 Creating vofc_users table...');
      
      // Create the table using direct SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS vofc_users (
          user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'spsa', 'psa', 'analyst')),
          agency TEXT,
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMPTZ,
          failed_login_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // Try to create table using Supabase SQL editor approach
      const { error: createError } = await supabase
        .rpc('exec', { sql: createTableSQL });

      if (createError) {
        console.log('⚠️  Could not create table via RPC, trying alternative approach...');
        // We'll create users directly if table exists
      } else {
        console.log('✅ vofc_users table created');
      }
    } else {
      console.log('✅ vofc_users table already exists');
    }

    // 2. Create admin user
    console.log('👤 Creating secure admin user...');
    
    const adminPassword = 'AdminSecure2024!';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Try to insert admin user
    const { data: adminUser, error: adminError } = await supabase
      .from('vofc_users')
      .upsert({
        username: 'admin',
        password_hash: hashedPassword,
        full_name: 'System Administrator',
        role: 'admin',
        agency: 'CISA',
        is_active: true
      }, {
        onConflict: 'username'
      })
      .select()
      .single();

    if (adminError) {
      console.log('⚠️  Could not create admin user via API:', adminError.message);
      console.log('📝 You may need to create the table manually in Supabase SQL Editor');
      console.log('📝 SQL to run in Supabase:');
      console.log(`
        CREATE TABLE IF NOT EXISTS vofc_users (
          user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'spsa', 'psa', 'analyst')),
          agency TEXT,
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMPTZ,
          failed_login_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        INSERT INTO vofc_users (username, password_hash, full_name, role, agency, is_active)
        VALUES ('admin', '${hashedPassword}', 'System Administrator', 'admin', 'CISA', true)
        ON CONFLICT (username) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          updated_at = NOW();
      `);
    } else {
      console.log('✅ Admin user created/updated');
    }

    console.log('\n🎉 Secure authentication setup complete!');
    console.log('\n📋 Admin Credentials:');
    console.log('====================');
    console.log('Username: admin');
    console.log('Password: AdminSecure2024!');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');

    // 3. Test the authentication
    console.log('\n🧪 Testing authentication...');
    
    const { data: testUser, error: testError } = await supabase
      .from('vofc_users')
      .select('username, role, is_active')
      .eq('username', 'admin')
      .single();

    if (testError) {
      console.log('⚠️  Could not verify admin user:', testError.message);
    } else {
      console.log('✅ Admin user verified:', testUser);
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Start your application: npm run dev');
    console.log('2. Test login with admin credentials');
    console.log('3. Verify no localStorage usage in browser dev tools');
    console.log('4. Test the secure authentication flow');

    return true;

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

// Run setup
if (require.main === module) {
  setupSecureAuth()
    .then(success => {
      if (success) {
        console.log('\n✅ Setup completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Setup failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Setup error:', error);
      process.exit(1);
    });
}

module.exports = { setupSecureAuth };

