require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminRole() {
  try {
    console.log('🔧 Fixing admin user role...\n');
    
    // Find the admin user by email
    const adminEmail = 'admin@vofc.gov';
    console.log(`Looking for user: ${adminEmail}`);
    
    // Get user from auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      process.exit(1);
    }
    
    const adminUser = users.find(u => u.email?.toLowerCase() === adminEmail.toLowerCase());
    if (!adminUser) {
      console.error(`❌ User ${adminEmail} not found in auth.users`);
      process.exit(1);
    }
    
    console.log(`✓ Found user: ${adminUser.id} (${adminUser.email})\n`);
    
    // Check current profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', adminUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      process.exit(1);
    }
    
    console.log('Current profile:', {
      role: profile?.role,
      user_id: profile?.user_id,
      exists: !!profile
    });
    
    // Update profile to admin (is_admin column doesn't exist, so only update role)
    const updateData = {
      role: 'admin',
      updated_at: new Date().toISOString()
    };
    
    if (profile) {
      // Update existing profile
      const { data: updated, error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', adminUser.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        process.exit(1);
      }
      
      console.log('\n✅ Profile updated successfully!');
      console.log('Updated profile:', {
        role: updated.role,
        user_id: updated.user_id
      });
    } else {
      // Create profile if it doesn't exist
      const { data: created, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: adminUser.id,
          username: adminEmail,
          role: 'admin',
          is_admin: true,
          first_name: 'Admin',
          last_name: 'User',
          organization: 'CISA',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating profile:', createError);
        process.exit(1);
      }
      
      console.log('\n✅ Profile created successfully!');
      console.log('Created profile:', {
        role: created.role,
        user_id: created.user_id
      });
    }
    
    // Also update user_metadata in auth for consistency
    const { data: updatedAuth, error: authError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      {
        user_metadata: {
          ...adminUser.user_metadata,
          role: 'admin',
          is_admin: true
        }
      }
    );
    
    if (authError) {
      console.warn('⚠️  Warning: Could not update auth user_metadata:', authError.message);
    } else {
      console.log('\n✅ Auth user_metadata updated successfully!');
    }
    
    console.log('\n✅ Admin role fix complete!');
    console.log('The admin user should now have role="admin"');
    console.log('Note: is_admin column does not exist in user_profiles table');
    console.log('The API will derive admin status from role="admin" or ADMIN_EMAILS allowlist');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAdminRole();

