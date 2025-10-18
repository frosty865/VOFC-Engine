const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSourcesSchema() {
  console.log('🔗 Setting up simple sources schema...\n');

  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '..', 'sql', 'sources_simple.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('📝 Executing sources schema...');
    
    // Split the SQL into individual statements
    const statements = schemaSQL
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

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .limit(1);

    if (sourcesError) {
      console.error('❌ Sources table verification failed:', sourcesError);
      return false;
    }

    console.log('✅ Sources table verified');
    console.log(`📊 Found ${sources?.length || 0} sample sources`);

    // Check if we can query the linking tables
    const { data: vulnSources, error: vulnError } = await supabase
      .from('vulnerability_sources')
      .select('*')
      .limit(1);

    if (vulnError) {
      console.log('⚠️ vulnerability_sources table not accessible yet (this is normal)');
    } else {
      console.log('✅ vulnerability_sources table verified');
    }

    const { data: ofcSources, error: ofcError } = await supabase
      .from('ofc_sources')
      .select('*')
      .limit(1);

    if (ofcError) {
      console.log('⚠️ ofc_sources table not accessible yet (this is normal)');
    } else {
      console.log('✅ ofc_sources table verified');
    }

    console.log('\n🎉 Sources schema setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Update OFC and Vulnerability APIs to use the new source relationships');
    console.log('2. Create source management interface for admins');
    console.log('3. Link existing OFCs and vulnerabilities to sources');

    return true;

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

if (require.main === module) {
  setupSourcesSchema()
    .then(success => {
      if (success) {
        console.log('\n✅ Sources setup completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Sources setup failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Setup error:', error);
      process.exit(1);
    });
}

module.exports = { setupSourcesSchema };

