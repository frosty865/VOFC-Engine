const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function identifySchemaUpdates() {
  console.log('🔍 IDENTIFYING SCHEMA UPDATES NEEDED...\n');

  try {
    // Get current schema structure
    const tablesToCheck = [
      'vofc_users',
      'vulnerabilities', 
      'options_for_consideration',
      'assessment_questions',
      'sources',
      'sectors',
      'subsectors'
    ];

    const currentSchema = {};

    for (const tableName of tablesToCheck) {
      try {
        const { data: sampleData, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error && sampleData && sampleData.length > 0) {
          currentSchema[tableName] = Object.keys(sampleData[0]);
        }
      } catch (err) {
        console.log(`❌ Could not analyze ${tableName}: ${err.message}`);
      }
    }

    console.log('📊 CURRENT SCHEMA STRUCTURE:');
    Object.entries(currentSchema).forEach(([table, columns]) => {
      console.log(`\n📋 ${table}:`);
      columns.forEach(col => console.log(`   • ${col}`));
    });

    // Identify key changes needed
    console.log('\n🎯 IDENTIFIED SCHEMA CHANGES:');
    
    console.log('\n📋 TABLE NAME CHANGES:');
    console.log('   • "ofcs" → "options_for_consideration" (already correct)');
    console.log('   • "questions" → "assessment_questions" (for assessment questions)');
    
    console.log('\n📋 COLUMN NAME CHANGES:');
    console.log('   • vulnerabilities:');
    console.log('     - "vulnerability_name" → "vulnerability"');
    console.log('     - "vulnerability_id" → "id"');
    console.log('   • options_for_consideration:');
    console.log('     - "ofc_id" → "id"');
    console.log('     - "ofc_text" → "option_text"');
    console.log('   • sources:');
    console.log('     - "id" → "reference number" (for primary key)');
    console.log('     - "title" → "source"');
    console.log('   • sectors:');
    console.log('     - "sector_id" → "id"');
    console.log('     - "sector_name" → "sector_name" (unchanged)');
    console.log('   • subsectors:');
    console.log('     - "subsector_id" → "id"');
    console.log('     - "subsector_name" → "name"');

    console.log('\n📋 FILES THAT NEED UPDATING:');
    
    // Check specific files that likely need updates
    const filesToCheck = [
      'vofc-viewer/app/api/submissions/[id]/approve/route.js',
      'vofc-viewer/app/api/sources/assign-citation/route.js',
      'vofc-viewer/app/admin/ofcs/page.jsx',
      'vofc-viewer/app/api/admin/ofcs/route.js',
      'vofc-viewer/app/lib/fetchVOFC.js',
      'vofc-viewer/app/components/OFCCard.jsx',
      'vofc-viewer/app/vulnerabilities/page.jsx',
      'vofc-viewer/app/submit/page.jsx'
    ];

    filesToCheck.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} (not found)`);
      }
    });

    console.log('\n🔧 RECOMMENDED UPDATE STRATEGY:');
    console.log('   1. Update API endpoints first');
    console.log('   2. Update frontend components');
    console.log('   3. Update utility functions');
    console.log('   4. Update scripts');
    console.log('   5. Test all functionality');

    console.log('\n📋 SPECIFIC CHANGES NEEDED:');
    
    // Generate specific update recommendations
    console.log('\n🔧 API ENDPOINTS TO UPDATE:');
    console.log('   • /api/submissions/[id]/approve/route.js');
    console.log('     - Update table references');
    console.log('     - Update column references');
    console.log('   • /api/admin/ofcs/route.js');
    console.log('     - Update table name: ofcs → options_for_consideration');
    console.log('     - Update column names');
    console.log('   • /api/sources/assign-citation/route.js');
    console.log('     - Update column references');

    console.log('\n🔧 FRONTEND COMPONENTS TO UPDATE:');
    console.log('   • app/admin/ofcs/page.jsx');
    console.log('     - Update table references');
    console.log('     - Update field mappings');
    console.log('   • app/components/OFCCard.jsx');
    console.log('     - Update field references');
    console.log('   • app/vulnerabilities/page.jsx');
    console.log('     - Update table and column references');

    console.log('\n🔧 UTILITY FUNCTIONS TO UPDATE:');
    console.log('   • app/lib/fetchVOFC.js');
    console.log('     - Update all table and column references');

  } catch (error) {
    console.error('❌ Error identifying schema updates:', error);
  }
}

if (require.main === module) {
  identifySchemaUpdates()
    .then(() => {
      console.log('\n✅ Schema update identification completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}

