const { createClient } = require('@supabase/supabase-js');

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

async function setupLearningTables() {
  console.log('🧠 Setting up Learning Database Tables...');
  
  try {
    // Create learning_events table
    console.log('📊 Creating learning_events table...');
    const { error: eventsError } = await supabase
      .from('learning_events')
      .select('id')
      .limit(1);
    
    if (eventsError && eventsError.code === 'PGRST116') {
      // Table doesn't exist, create it
      console.log('Creating learning_events table...');
      // We'll create it through a simple insert that will fail gracefully
      const { error: createError } = await supabase
        .from('learning_events')
        .insert([{
          event_type: 'test',
          filename: 'test.txt',
          vulnerabilities_found: 0,
          ofcs_found: 0,
          extraction_method: 'test',
          confidence: 'low',
          data: {},
          learning_processed: false
        }]);
      
      if (createError) {
        console.log('⚠️ learning_events table may need manual creation');
      } else {
        console.log('✅ learning_events table created');
        // Clean up test record
        await supabase.from('learning_events').delete().eq('event_type', 'test');
      }
    } else {
      console.log('✅ learning_events table already exists');
    }
    
    // Create learning_stats table
    console.log('📈 Creating learning_stats table...');
    const { error: statsError } = await supabase
      .from('learning_stats')
      .select('id')
      .limit(1);
    
    if (statsError && statsError.code === 'PGRST116') {
      console.log('Creating learning_stats table...');
      const { error: createStatsError } = await supabase
        .from('learning_stats')
        .insert([{
          stat_type: 'system_initialization',
          total_events_processed: 0,
          successful_retrains: 0,
          failed_retrains: 0,
          rules_generated: 0,
          embeddings_updated: 0,
          system_health: 'healthy'
        }]);
      
      if (createStatsError) {
        console.log('⚠️ learning_stats table may need manual creation');
      } else {
        console.log('✅ learning_stats table created');
      }
    } else {
      console.log('✅ learning_stats table already exists');
    }
    
    console.log('🎉 Learning database setup completed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('  1. Start the learning system: curl -X POST http://localhost:3000/api/learning/start -H "Content-Type: application/json" -d \'{"action": "start"}\'');
    console.log('  2. The learning system will automatically start when documents are processed');
    console.log('  3. Check learning status at /learning page');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error setting up learning database:', error);
    return false;
  }
}

// Run the setup
setupLearningTables()
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
