require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function optimizeDatabase() {
  try {
    console.log('🚀 Starting database performance optimization...');
    
    // Test current performance
    console.log('\n📊 Testing current performance...');
    
    const performanceTests = [
      {
        name: 'User profiles count',
        test: async () => {
          const start = Date.now();
          const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
          return { duration: Date.now() - start, error };
        }
      },
      {
        name: 'Submissions by status',
        test: async () => {
          const start = Date.now();
          const { data, error } = await supabase.from('submissions').select('status').limit(10);
          return { duration: Date.now() - start, error };
        }
      },
      {
        name: 'Assessments with sector',
        test: async () => {
          const start = Date.now();
          const { data, error } = await supabase.from('assessments').select('sector_id').limit(10);
          return { duration: Date.now() - start, error };
        }
      }
    ];
    
    for (const test of performanceTests) {
      try {
        const result = await test.test();
        if (result.error) {
          console.log(`   ❌ ${test.name}: ${result.error.message}`);
        } else {
          console.log(`   ✅ ${test.name}: ${result.duration}ms`);
        }
      } catch (err) {
        console.log(`   ❌ ${test.name}: ${err.message}`);
      }
    }
    
    // Check current indexes
    console.log('\n🔍 Checking current database state...');
    
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id, role, is_active')
      .limit(5);
    
    if (userError) {
      console.log(`   ❌ User profiles query failed: ${userError.message}`);
    } else {
      console.log(`   ✅ User profiles accessible: ${userProfiles.length} records`);
    }
    
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('id, status, created_at')
      .limit(5);
    
    if (subError) {
      console.log(`   ❌ Submissions query failed: ${subError.message}`);
    } else {
      console.log(`   ✅ Submissions accessible: ${submissions.length} records`);
    }
    
    // Check for foreign key performance issues
    console.log('\n🔗 Testing foreign key relationships...');
    
    const { data: assessmentOfcs, error: aoError } = await supabase
      .from('assessment_ofcs')
      .select('assessment_id, ofc_id')
      .limit(5);
    
    if (aoError) {
      console.log(`   ❌ Assessment OFCs query failed: ${aoError.message}`);
    } else {
      console.log(`   ✅ Assessment OFCs accessible: ${assessmentOfcs.length} records`);
    }
    
    console.log('\n📋 Optimization Recommendations:');
    console.log('   1. Add indexes for foreign key columns (see optimize_database_performance.sql)');
    console.log('   2. Remove unused indexes to reduce maintenance overhead');
    console.log('   3. Add primary keys to tables missing them');
    console.log('   4. Run ANALYZE on frequently queried tables');
    
    console.log('\n💡 Manual Steps Required:');
    console.log('   - Execute optimize_database_performance.sql in Supabase SQL Editor');
    console.log('   - Monitor query performance after optimization');
    console.log('   - Consider adding more indexes based on actual query patterns');
    
  } catch (error) {
    console.error('❌ Optimization check failed:', error);
  }
}

optimizeDatabase();
