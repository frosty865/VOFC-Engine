require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function emptyUserTables() {
  try {
    console.log('🧹 Emptying all user tables...');
    
    // 1. Empty user_profiles
    console.log('1. Emptying user_profiles...');
    const { error: profilesError } = await supabase
      .from('user_profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (profilesError) {
      console.error('   ❌ Error emptying user_profiles:', profilesError.message);
    } else {
      console.log('   ✅ user_profiles emptied');
    }
    
    // 2. Empty user_groups
    console.log('2. Emptying user_groups...');
    const { error: groupsError } = await supabase
      .from('user_groups')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (groupsError) {
      console.error('   ❌ Error emptying user_groups:', groupsError.message);
    } else {
      console.log('   ✅ user_groups emptied');
    }
    
    // 3. Empty user_permissions
    console.log('3. Emptying user_permissions...');
    const { error: permissionsError } = await supabase
      .from('user_permissions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (permissionsError) {
      console.error('   ❌ Error emptying user_permissions:', permissionsError.message);
    } else {
      console.log('   ✅ user_permissions emptied');
    }
    
    // 4. Verify tables are empty
    console.log('4. Verifying tables are empty...');
    
    const { data: profilesCount } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact' });
    
    const { data: groupsCount } = await supabase
      .from('user_groups')
      .select('id', { count: 'exact' });
    
    const { data: permissionsCount } = await supabase
      .from('user_permissions')
      .select('id', { count: 'exact' });
    
    console.log(`   📊 user_profiles: ${profilesCount?.length || 0} records`);
    console.log(`   📊 user_groups: ${groupsCount?.length || 0} records`);
    console.log(`   📊 user_permissions: ${permissionsCount?.length || 0} records`);
    
    console.log('\n✅ All user tables emptied successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

emptyUserTables();
