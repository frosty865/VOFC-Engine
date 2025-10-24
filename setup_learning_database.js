const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupLearningDatabase() {
  console.log('🧠 Setting up Learning Database Schema...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'sql', 'create_learning_events_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing learning database schema...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error executing learning schema:', error);
      return false;
    }
    
    console.log('✅ Learning database schema created successfully');
    
    // Verify tables were created
    console.log('🔍 Verifying learning tables...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['learning_events', 'learning_stats']);
    
    if (tablesError) {
      console.warn('⚠️ Could not verify table creation:', tablesError);
    } else {
      console.log('📊 Learning tables found:', tables.map(t => t.table_name));
    }
    
    // Insert initial learning stats record
    console.log('📈 Creating initial learning stats...');
    const { error: statsError } = await supabase
      .from('learning_stats')
      .upsert({
        stat_type: 'system_initialization',
        total_events_processed: 0,
        successful_retrains: 0,
        failed_retrains: 0,
        rules_generated: 0,
        embeddings_updated: 0,
        system_health: 'healthy'
      });
    
    if (statsError) {
      console.warn('⚠️ Could not create initial learning stats:', statsError);
    } else {
      console.log('✅ Initial learning stats created');
    }
    
    console.log('🎉 Learning database setup completed successfully!');
    console.log('');
    console.log('📋 Learning System Features:');
    console.log('  ✅ learning_events table - stores document processing events');
    console.log('  ✅ learning_stats table - tracks learning system performance');
    console.log('  ✅ Automatic learning triggers every 5 documents processed');
    console.log('  ✅ Integration with continuous learning daemon');
    console.log('  ✅ Row Level Security enabled');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error setting up learning database:', error);
    return false;
  }
}

// Run the setup
setupLearningDatabase()
  .then(success => {
    if (success) {
      console.log('✅ Learning database setup completed');
      process.exit(0);
    } else {
      console.log('❌ Learning database setup failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
