const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchemaProblems() {
  console.log('🔍 Checking database schema for problems...\n');

  try {
    // Check main tables
    const tables = [
      'vofc_users',
      'user_sessions', 
      'questions',
      'vulnerabilities',
      'options_for_consideration',
      'sources',
      'sectors',
      'subsectors',
      'vulnerability_ofc_links'
    ];

    console.log('📊 Checking table existence and structure...\n');

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Exists (${data?.length || 0} sample records)`);
          
          // Show sample structure for key tables
          if (data && data.length > 0 && ['vulnerabilities', 'options_for_consideration', 'sources'].includes(table)) {
            const sample = data[0];
            console.log(`   Sample fields: ${Object.keys(sample).join(', ')}`);
            
            // Check for null source fields
            if (sample.source === null || sample.source === undefined) {
              console.log(`   ⚠️  ${table}.source is null/undefined`);
            }
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // Check for linking tables
    console.log('\n🔗 Checking linking tables...\n');
    
    const linkingTables = [
      'vulnerability_sources',
      'ofc_sources'
    ];

    for (const table of linkingTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Exists (${data?.length || 0} records)`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // Check for foreign key relationships
    console.log('\n🔗 Checking foreign key relationships...\n');
    
    // Test vulnerability_ofc_links
    try {
      const { data: links, error: linksError } = await supabase
        .from('vulnerability_ofc_links')
        .select(`
          *,
          vulnerabilities!inner(id, vulnerability),
          options_for_consideration!inner(id, option_text)
        `)
        .limit(1);

      if (linksError) {
        console.log(`❌ vulnerability_ofc_links foreign keys: ${linksError.message}`);
      } else {
        console.log(`✅ vulnerability_ofc_links foreign keys working`);
      }
    } catch (err) {
      console.log(`❌ vulnerability_ofc_links foreign keys: ${err.message}`);
    }

    // Check for RLS policies
    console.log('\n🔒 Checking RLS policies...\n');
    
    const rlsTables = ['vofc_users', 'user_sessions', 'sources'];
    
    for (const table of rlsTables) {
      try {
        // Try to query without service role to test RLS
        const { createClient: createAnonClient } = require('@supabase/supabase-js');
        const anonClient = createAnonClient(supabaseUrl, 'sb_publishable_QuEn3h16DCAw3Jt_msFIiw_qBYy2Qzl');
        
        const { data, error } = await anonClient
          .from(table)
          .select('*')
          .limit(1);

        if (error && error.message.includes('RLS')) {
          console.log(`✅ ${table}: RLS enabled (${error.message})`);
        } else if (error) {
          console.log(`⚠️  ${table}: ${error.message}`);
        } else {
          console.log(`⚠️  ${table}: RLS may not be properly configured`);
        }
      } catch (err) {
        console.log(`❌ ${table}: RLS check failed - ${err.message}`);
      }
    }

    console.log('\n🎉 Schema check completed!');

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

if (require.main === module) {
  checkSchemaProblems()
    .then(() => {
      console.log('\n✅ Schema analysis completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Schema analysis error:', error);
      process.exit(1);
    });
}

module.exports = { checkSchemaProblems };
