const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupOFCProposalsTable() {
  try {
    console.log('🔧 Setting up OFC Proposals table...');
    
    // Check if table exists
    const { data: tableData, error: tableError } = await supabase
      .from('ofc_proposals')
      .select('id')
      .limit(1);
    
    if (tableError && (tableError.code === 'PGRST116' || tableError.code === 'PGRST205')) {
      // Table doesn't exist, we need to create it manually
      console.log('📝 Table does not exist. Please create it manually in Supabase dashboard:');
      console.log('');
      console.log('SQL to run in Supabase SQL Editor:');
      console.log('=====================================');
      
      const sqlPath = path.join(__dirname, '..', 'sql', 'create-ofc-proposals-table.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(sql);
      
      return false;
    } else if (tableError) {
      console.error('❌ Error checking table:', tableError);
      return false;
    } else {
      console.log('✅ OFC Proposals table already exists!');
      console.log('📊 Table includes:');
      console.log('   • id (UUID primary key)');
      console.log('   • vulnerability_id (UUID)');
      console.log('   • text (TEXT)');
      console.log('   • source (VARCHAR)');
      console.log('   • confidence (DECIMAL)');
      console.log('   • tone_match (BOOLEAN)');
      console.log('   • verified_source (BOOLEAN)');
      console.log('   • requires_review (BOOLEAN)');
      console.log('   • model_version (VARCHAR)');
      console.log('   • created_at, updated_at (TIMESTAMP)');
      console.log('   • RLS policies for security');
      console.log('   • Indexes for performance');
      console.log('   • get_vulns_missing_ofcs() RPC function');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error setting up OFC proposals table:', error);
    return false;
  }
}

// Run the setup
if (require.main === module) {
  setupOFCProposalsTable()
    .then(success => {
      if (success) {
        console.log('🎯 OFC Proposals table setup complete!');
        process.exit(0);
      } else {
        console.log('❌ OFC Proposals table setup failed!');
        process.exit(1);
      }
    });
}

module.exports = { setupOFCProposalsTable };
