const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSourcesSchema() {
  console.log('🔗 Setting up sources schema...\n');

  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '..', 'sql', 'sources_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('📝 Executing sources schema...');
    
    // Execute the schema
    const { error } = await supabase.rpc('exec_sql', {
      sql: schemaSQL
    });

    if (error) {
      console.error('❌ Schema execution failed:', error);
      return false;
    }

    console.log('✅ Sources schema created successfully!');

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

