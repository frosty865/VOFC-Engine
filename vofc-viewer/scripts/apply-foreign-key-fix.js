const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyForeignKeyFix() {
  console.log('🔧 Applying foreign key fixes...\n');

  try {
    // Read the SQL fix file
    const fixPath = path.join(__dirname, '..', 'sql', 'fix-foreign-keys.sql');
    const fixSQL = fs.readFileSync(fixPath, 'utf8');

    console.log('📝 Executing foreign key fixes...');
    
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

    // Test the relationship
    console.log('\n🧪 Testing the relationship...');
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('options_for_consideration')
        .select(`
          *,
          ofc_sources (
            *,
            sources (
              "reference number",
              source
            )
          )
        `)
        .limit(1);

      if (testError) {
        console.log('❌ Relationship test failed:', testError.message);
        return false;
      } else {
        console.log('✅ Relationship test succeeded!');
        console.log('📊 Sample data:', JSON.stringify(testData[0], null, 2));
      }
    } catch (err) {
      console.log('❌ Relationship test error:', err.message);
      return false;
    }

    console.log('\n🎉 Foreign key fixes applied successfully!');
    return true;

  } catch (error) {
    console.error('❌ Foreign key fix failed:', error);
    return false;
  }
}

if (require.main === module) {
  applyForeignKeyFix()
    .then(success => {
      if (success) {
        console.log('\n✅ Foreign key fix completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Foreign key fix failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Foreign key fix error:', error);
      process.exit(1);
    });
}

module.exports = { applyForeignKeyFix };
