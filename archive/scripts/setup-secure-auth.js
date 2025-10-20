#!/usr/bin/env node

/**
 * Setup script for secure authentication system
 * This script initializes the database with proper security measures
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Load environment variables (using existing .env.local)
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
    // 1. Create secure user table with proper constraints
    console.log('📋 Creating secure user schema...');
    
    const userSchemaSQL = `
      -- Drop existing tables if they exist
      DROP TABLE IF EXISTS user_sessions CASCADE;
      DROP TABLE IF EXISTS vofc_users CASCADE;
      
      -- Create secure users table
      CREATE TABLE vofc_users (
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

      -- Create secure sessions table
      CREATE TABLE user_sessions (
        session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES vofc_users(user_id) ON DELETE CASCADE,
        session_token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_accessed TIMESTAMPTZ DEFAULT NOW(),
        ip_address INET,
        user_agent TEXT
      );

      -- Create indexes for performance
      CREATE INDEX idx_vofc_users_username ON vofc_users(username);
      CREATE INDEX idx_vofc_users_active ON vofc_users(is_active);
      CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
      CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
      CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

      -- Enable RLS
      ALTER TABLE vofc_users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

      -- RLS Policies
      CREATE POLICY "users_can_read_own_data" ON vofc_users
        FOR SELECT USING (user_id = auth.uid());

      CREATE POLICY "admins_can_read_all_users" ON vofc_users
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM vofc_users admin_user
            WHERE admin_user.user_id = auth.uid()
            AND admin_user.role = 'admin'
          )
        );

      CREATE POLICY "users_can_read_own_sessions" ON user_sessions
        FOR SELECT USING (user_id = auth.uid());

      CREATE POLICY "admins_can_read_all_sessions" ON user_sessions
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM vofc_users admin_user
            WHERE admin_user.user_id = auth.uid()
            AND admin_user.role = 'admin'
          )
        );
    `;

    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: userSchemaSQL });
    if (schemaError) {
      console.error('❌ Schema creation failed:', schemaError);
      return false;
    }

    console.log('✅ Secure user schema created');

    // 2. Create admin user with secure password
    console.log('👤 Creating secure admin user...');
    
    const adminPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const { data: adminUser, error: adminError } = await supabase
      .from('vofc_users')
      .insert({
        username: 'admin',
        password_hash: hashedPassword,
        full_name: 'System Administrator',
        role: 'admin',
        agency: 'CISA',
        is_active: true
      })
      .select()
      .single();

    if (adminError) {
      console.error('❌ Admin user creation failed:', adminError);
      return false;
    }

    console.log('✅ Admin user created');
    console.log(`🔑 Admin credentials:`);
    console.log(`   Username: admin`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ⚠️  SAVE THIS PASSWORD - IT WON'T BE SHOWN AGAIN!`);

    // 3. Create additional test users
    console.log('👥 Creating test users...');
    
    const testUsers = [
      {
        username: 'spsa_user',
        password: crypto.randomBytes(12).toString('hex'),
        full_name: 'SPSA User',
        role: 'spsa',
        agency: 'CISA'
      },
      {
        username: 'psa_user',
        password: crypto.randomBytes(12).toString('hex'),
        full_name: 'PSA User',
        role: 'psa',
        agency: 'CISA'
      },
      {
        username: 'analyst_user',
        password: crypto.randomBytes(12).toString('hex'),
        full_name: 'Analyst User',
        role: 'analyst',
        agency: 'CISA'
      }
    ];

    const userCredentials = [];

    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      const { error: userError } = await supabase
        .from('vofc_users')
        .insert({
          username: user.username,
          password_hash: hashedPassword,
          full_name: user.full_name,
          role: user.role,
          agency: user.agency,
          is_active: true
        });

      if (userError) {
        console.error(`❌ Failed to create user ${user.username}:`, userError);
      } else {
        userCredentials.push({
          username: user.username,
          password: user.password,
          role: user.role
        });
        console.log(`✅ Created user: ${user.username}`);
      }
    }

    // 4. Create authentication functions
    console.log('🔧 Creating authentication functions...');
    
    const authFunctionsSQL = `
      -- Function to authenticate user
      CREATE OR REPLACE FUNCTION authenticate_user(
        p_username TEXT,
        p_password TEXT
      )
      RETURNS TABLE (
        user_id UUID,
        username TEXT,
        full_name TEXT,
        role TEXT,
        agency TEXT,
        success BOOLEAN,
        message TEXT
      ) AS $$
      DECLARE
        v_user RECORD;
        v_password_valid BOOLEAN;
        v_is_locked BOOLEAN;
      BEGIN
        -- Get user by username
        SELECT * INTO v_user 
        FROM vofc_users 
        WHERE vofc_users.username = p_username AND vofc_users.is_active = true;
        
        IF NOT FOUND THEN
          RETURN QUERY SELECT 
            NULL::UUID as user_id,
            NULL::TEXT as username,
            NULL::TEXT as full_name,
            NULL::TEXT as role,
            NULL::TEXT as agency,
            false as success,
            'User not found or inactive' as message;
          RETURN;
        END IF;
        
        -- Check if account is locked
        IF v_user.locked_until IS NOT NULL AND v_user.locked_until > NOW() THEN
          RETURN QUERY SELECT 
            NULL::UUID as user_id,
            NULL::TEXT as username,
            NULL::TEXT as full_name,
            NULL::TEXT as role,
            NULL::TEXT as agency,
            false as success,
            'Account is temporarily locked due to too many failed attempts' as message;
          RETURN;
        END IF;
        
        -- Verify password
        SELECT crypt(p_password, v_user.password_hash) = v_user.password_hash INTO v_password_valid;
        
        IF NOT v_password_valid THEN
          -- Increment failed login attempts
          UPDATE vofc_users 
          SET failed_login_attempts = failed_login_attempts + 1,
              locked_until = CASE 
                WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
                ELSE NULL
              END
          WHERE vofc_users.user_id = v_user.user_id;
          
          RETURN QUERY SELECT 
            NULL::UUID as user_id,
            NULL::TEXT as username,
            NULL::TEXT as full_name,
            NULL::TEXT as role,
            NULL::TEXT as agency,
            false as success,
            'Invalid password' as message;
          RETURN;
        END IF;
        
        -- Reset failed login attempts on successful login
        UPDATE vofc_users 
        SET failed_login_attempts = 0,
            locked_until = NULL,
            last_login = NOW()
        WHERE vofc_users.user_id = v_user.user_id;
        
        -- Return user data
        RETURN QUERY SELECT 
          v_user.user_id,
          v_user.username,
          v_user.full_name,
          v_user.role,
          v_user.agency,
          true as success,
          'Authentication successful' as message;
            
      END;
      $$ LANGUAGE plpgsql;

      -- Function to create user session
      CREATE OR REPLACE FUNCTION create_user_session(
        p_user_id UUID,
        p_session_token TEXT,
        p_expires_at TIMESTAMPTZ,
        p_ip_address INET DEFAULT NULL,
        p_user_agent TEXT DEFAULT NULL
      )
      RETURNS TABLE (
        session_id UUID,
        success BOOLEAN,
        message TEXT
      ) AS $$
      DECLARE
        v_session_id UUID;
      BEGIN
        -- Clean up expired sessions for this user
        DELETE FROM user_sessions 
        WHERE user_id = p_user_id AND expires_at < NOW();
        
        -- Create new session
        INSERT INTO user_sessions (
          user_id,
          session_token,
          expires_at,
          ip_address,
          user_agent
        ) VALUES (
          p_user_id,
          p_session_token,
          p_expires_at,
          p_ip_address,
          p_user_agent
        ) RETURNING session_id INTO v_session_id;
        
        RETURN QUERY SELECT 
          v_session_id,
          true as success,
          'Session created successfully' as message;
      END;
      $$ LANGUAGE plpgsql;

      -- Function to clean up expired sessions
      CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
      RETURNS INTEGER AS $$
      DECLARE
        v_deleted_count INTEGER;
      BEGIN
        DELETE FROM user_sessions WHERE expires_at < NOW();
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RETURN v_deleted_count;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: functionsError } = await supabase.rpc('exec_sql', { sql: authFunctionsSQL });
    if (functionsError) {
      console.error('❌ Authentication functions creation failed:', functionsError);
      return false;
    }

    console.log('✅ Authentication functions created');

    // 5. Create backup schema
    console.log('💾 Setting up backup system...');
    
    const backupSchemaSQL = `
      -- Create backup metadata table
      CREATE TABLE IF NOT EXISTS backup_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
        encryption_key_hash TEXT,
        checksum TEXT,
        retention_until TIMESTAMPTZ,
        created_by UUID REFERENCES vofc_users(user_id),
        notes TEXT
      );

      -- Enable RLS on backup table
      ALTER TABLE backup_metadata ENABLE ROW LEVEL SECURITY;

      -- Only admins can access backup data
      CREATE POLICY "admin_access_backups" ON backup_metadata
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM vofc_users 
            WHERE vofc_users.user_id = auth.uid() 
            AND vofc_users.role = 'admin'
          )
        );
    `;

    const { error: backupError } = await supabase.rpc('exec_sql', { sql: backupSchemaSQL });
    if (backupError) {
      console.error('❌ Backup schema creation failed:', backupError);
      return false;
    }

    console.log('✅ Backup system configured');

    console.log('\n🎉 Secure authentication system setup complete!');
    console.log('\n📋 Test User Credentials:');
    console.log('========================');
    userCredentials.forEach(user => {
      console.log(`${user.role.toUpperCase()}:`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Password: ${user.password}`);
      console.log('');
    });

    console.log('⚠️  IMPORTANT SECURITY NOTES:');
    console.log('1. Change all default passwords immediately');
    console.log('2. Set strong JWT_SECRET in your environment');
    console.log('3. Enable HTTPS in production');
    console.log('4. Set up automated backups');
    console.log('5. Monitor failed login attempts');

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
