require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeOptimization() {
  try {
    console.log('🚀 Starting database performance optimization...');
    
    // Read the SQL file
    const sql = fs.readFileSync('optimize_database_performance.sql', 'utf8');
    
    // Split into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      try {
        console.log(`\n${i + 1}. Executing: ${statement.substring(0, 60)}...`);
        
        // Execute the statement
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Some errors are expected (like "already exists" for indexes)
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate key')) {
            console.log(`   ⚠️  Expected: ${error.message}`);
            successCount++;
          } else {
            console.error(`   ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`   ❌ Exception: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Optimization Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log(`\n🎉 Database optimization completed successfully!`);
    } else {
      console.log(`\n⚠️  Optimization completed with ${errorCount} errors`);
    }
    
    // Test a few key queries to verify performance
    console.log(`\n🧪 Testing optimized queries...`);
    
    const testQueries = [
      { name: 'User profiles by role', query: 'SELECT COUNT(*) FROM user_profiles WHERE role = \'admin\'' },
      { name: 'Recent submissions', query: 'SELECT COUNT(*) FROM submissions WHERE created_at > NOW() - INTERVAL \'7 days\'' },
      { name: 'Active assessments', query: 'SELECT COUNT(*) FROM assessments WHERE status = \'active\'' }
    ];
    
    for (const test of testQueries) {
      try {
        const start = Date.now();
        const { data, error } = await supabase.rpc('exec_sql', { sql: test.query });
        const duration = Date.now() - start;
        
        if (error) {
          console.log(`   ❌ ${test.name}: ${error.message}`);
        } else {
          console.log(`   ✅ ${test.name}: ${duration}ms`);
        }
      } catch (err) {
        console.log(`   ❌ ${test.name}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
  }
}

executeOptimization();
