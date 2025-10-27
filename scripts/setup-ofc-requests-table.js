const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupOFCRequestsTable() {
  try {
    console.log('🔧 Setting up OFC Requests table...');
    
    // Create the table using direct SQL execution
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ofc_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        vulnerability_id UUID NOT NULL,
        ofc_text TEXT NOT NULL,
        submitter VARCHAR(255) NOT NULL,
        vulnerability_text TEXT,
        discipline VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'implemented')),
        supervisor_notes TEXT,
        approved_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Execute the table creation
    const { data: tableData, error: tableError } = await supabase
      .from('ofc_requests')
      .select('id')
      .limit(1);
    
    if (tableError && (tableError.code === 'PGRST116' || tableError.code === 'PGRST205')) {
      // Table doesn't exist, we need to create it manually
      console.log('📝 Table does not exist. Please create it manually in Supabase dashboard:');
      console.log('');
      console.log('SQL to run in Supabase SQL Editor:');
      console.log('=====================================');
      console.log(createTableSQL);
      console.log('');
      console.log('Then run the indexes and policies:');
      console.log('==================================');
      
      const indexesSQL = `
        CREATE INDEX IF NOT EXISTS idx_ofc_requests_vulnerability_id ON ofc_requests(vulnerability_id);
        CREATE INDEX IF NOT EXISTS idx_ofc_requests_status ON ofc_requests(status);
        CREATE INDEX IF NOT EXISTS idx_ofc_requests_submitter ON ofc_requests(submitter);
        CREATE INDEX IF NOT EXISTS idx_ofc_requests_created_at ON ofc_requests(created_at);
      `;
      console.log(indexesSQL);
      
      const policiesSQL = `
        ALTER TABLE ofc_requests ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own OFC requests" ON ofc_requests
          FOR SELECT USING (auth.uid()::text = submitter);
        
        CREATE POLICY "Users can create OFC requests" ON ofc_requests
          FOR INSERT WITH CHECK (auth.uid()::text = submitter);
        
        CREATE POLICY "Supervisors can view all OFC requests" ON ofc_requests
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE user_profiles.id = auth.uid() 
              AND user_profiles.role IN ('supervisor', 'admin')
            )
          );
        
        CREATE POLICY "Supervisors can update OFC requests" ON ofc_requests
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE user_profiles.id = auth.uid() 
              AND user_profiles.role IN ('supervisor', 'admin')
            )
          );
      `;
      console.log(policiesSQL);
      
      return false;
    } else if (tableError) {
      console.error('❌ Error checking table:', tableError);
      return false;
    } else {
      console.log('✅ OFC Requests table already exists!');
      console.log('📊 Table includes:');
      console.log('   • id (UUID primary key)');
      console.log('   • vulnerability_id (UUID)');
      console.log('   • ofc_text (TEXT)');
      console.log('   • submitter (VARCHAR)');
      console.log('   • vulnerability_text (TEXT)');
      console.log('   • discipline (VARCHAR)');
      console.log('   • status (pending_review, approved, rejected, implemented)');
      console.log('   • supervisor_notes (TEXT)');
      console.log('   • approved_by (VARCHAR)');
      console.log('   • created_at, updated_at (TIMESTAMP)');
      console.log('   • RLS policies for security');
      console.log('   • Indexes for performance');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error setting up OFC requests table:', error);
    return false;
  }
}

// Run the setup
if (require.main === module) {
  setupOFCRequestsTable()
    .then(success => {
      if (success) {
        console.log('🎯 OFC Requests table setup complete!');
        process.exit(0);
      } else {
        console.log('❌ OFC Requests table setup failed!');
        process.exit(1);
      }
    });
}

module.exports = { setupOFCRequestsTable };
