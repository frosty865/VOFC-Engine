const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAuthIssue() {
  console.log('🔍 Debugging authentication issue...\n');

  try {
    // Test the authentication function
    console.log('📊 Testing authentication...');
    const { data: authResult, error: authError } = await supabase
      .rpc('authenticate_user', {
        p_username: 'admin',
        p_password: 'AdminSecure2024!'
      });

    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      return;
    }

    console.log('✅ Authentication successful');
    const user = authResult[0];
    console.log('User:', user);

    // Test if the user has admin role
    const hasAdminAccess = ['admin', 'spsa', 'analyst'].includes(user.role);
    console.log('Has admin access:', hasAdminAccess);

    if (!hasAdminAccess) {
      console.log('❌ User does not have admin access');
      console.log('User role:', user.role);
      console.log('Expected roles: admin, spsa, analyst');
      return;
    }

    console.log('✅ User has admin access');

    // Test creating a session token
    console.log('\n📊 Testing session token creation...');
    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    
    const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username, 
        role: user.role 
      }, 
      jwtSecret, 
      { expiresIn: '24h' }
    );

    console.log('✅ JWT token created');
    console.log('Token length:', token.length);

    // Test token verification
    console.log('\n📊 Testing token verification...');
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log('✅ Token verification successful');
      console.log('Decoded token:', decoded);
    } catch (verifyError) {
      console.log('❌ Token verification failed:', verifyError.message);
    }

    console.log('\n🎉 Authentication debugging completed!');
    console.log('\n📋 Summary:');
    console.log('- Authentication is working correctly');
    console.log('- User has admin role');
    console.log('- JWT token creation works');
    console.log('- The issue might be in the frontend authentication flow');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

if (require.main === module) {
  debugAuthIssue()
    .then(() => {
      console.log('\n✅ Auth debugging completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Auth debugging error:', error);
      process.exit(1);
    });
}

module.exports = { debugAuthIssue };

