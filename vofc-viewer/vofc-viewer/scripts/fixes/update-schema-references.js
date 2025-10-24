const fs = require('fs');
const path = require('path');

// Schema mapping for updates
const schemaMappings = {
  // Table name changes
  'ofcs': 'options_for_consideration',
  'questions': 'assessment_questions',
  
  // Column name changes
  'vulnerability_id': 'id',
  'vulnerability_name': 'vulnerability',
  'ofc_id': 'id',
  'ofc_text': 'option_text',
  'question_id': 'id',
  'question_text': 'question_text', // Keep as is
  'sector_id': 'id', // For sectors table
  'subsector_id': 'id', // For subsectors table
  'subsector_name': 'name',
  'sector_name': 'sector_name', // Keep as is
  'source_doc': 'source',
  'source_document': 'source',
  'technology_class': 'discipline',
  'effort_level': 'effort_level', // Keep as is
  'effectiveness': 'effectiveness', // Keep as is
  'severity_level': 'severity_level', // Keep as is
  'confidence_score': 'confidence_score' // Keep as is
};

// Files to check and update
const filesToCheck = [
  'app/api/submissions/[id]/approve/route.js',
  'app/api/sources/assign-citation/route.js',
  'app/admin/ofcs/page.jsx',
  'app/api/admin/ofcs/route.js',
  'app/lib/fetchVOFC.js',
  'app/components/OFCCard.jsx',
  'app/vulnerabilities/page.jsx',
  'app/submit/page.jsx',
  'app/components/VulnerabilityCard.jsx',
  'app/components/QuestionCard.jsx'
];

function updateFileReferences(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Apply schema mappings
  Object.entries(schemaMappings).forEach(([oldName, newName]) => {
    if (oldName !== newName && content.includes(oldName)) {
      // Use word boundaries to avoid partial replacements
      const regex = new RegExp(`\\b${oldName}\\b`, 'g');
      const newContent = content.replace(regex, newName);
      if (newContent !== content) {
        content = newContent;
        updated = true;
        console.log(`   ✅ Updated ${oldName} → ${newName}`);
      }
    }
  });

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  } else {
    console.log(`✅ No changes needed: ${filePath}`);
    return false;
  }
}

function main() {
  console.log('🔧 UPDATING SCHEMA REFERENCES...\n');

  let totalUpdated = 0;

  filesToCheck.forEach(filePath => {
    console.log(`\n📋 Checking: ${filePath}`);
    if (updateFileReferences(filePath)) {
      totalUpdated++;
    }
  });

  console.log(`\n🎉 SCHEMA UPDATE COMPLETE!`);
  console.log(`📊 Updated ${totalUpdated} files`);
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('   1. Test all API endpoints');
  console.log('   2. Test frontend components');
  console.log('   3. Verify data integrity');
  console.log('   4. Update any remaining scripts');
}

if (require.main === module) {
  main();
}
