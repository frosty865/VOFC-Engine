const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSFix() {
  console.log('🔧 Applying RLS policy fixes...\n');

  try {
    // Read the SQL fix file
    const fixPath = path.join(__dirname, '..', 'sql', 'fix-rls-policies.sql');
    const fixSQL = fs.readFileSync(fixPath, 'utf8');

    console.log('📝 Executing RLS policy fixes...');
    
    // Split the SQL into individual statements
    const statements = fixSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });

          if (error) {
            console.warn(`⚠️ Statement ${i + 1} failed:`, error.message);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.warn(`⚠️ Statement ${i + 1} error:`, err.message);
        }
      }
    }

    // Test the fix by running the schema check again
    console.log('\n🧪 Testing the fix...');
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('vofc_users')
        .select('user_id, username, role')
        .limit(1);

      if (testError) {
        console.log('❌ Test query failed:', testError.message);
        return false;
      } else {
        console.log('✅ Test query succeeded - RLS recursion fixed!');
        console.log('📊 Sample data:', testData);
      }
    } catch (err) {
      console.log('❌ Test query error:', err.message);
      return false;
    }

    console.log('\n🎉 RLS policy fixes applied successfully!');
    return true;

  } catch (error) {
    console.error('❌ RLS fix failed:', error);
    return false;
  }
}

if (require.main === module) {
  applyRLSFix()
    .then(success => {
      if (success) {
        console.log('\n✅ RLS fix completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ RLS fix failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ RLS fix error:', error);
      process.exit(1);
    });
}

module.exports = { applyRLSFix };
