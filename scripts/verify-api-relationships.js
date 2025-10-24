#!/usr/bin/env node

/**
 * API Route Relationship Verification Script
 * 
 * This script verifies that all API routes use the relationships defined in db/relationships.json
 * and ensures proper foreign key usage and data integrity.
 */

const fs = require('fs');
const path = require('path');

// Load the database relationships
const relationshipsPath = path.join(__dirname, '..', 'db', 'relationships.json');
const relationships = JSON.parse(fs.readFileSync(relationshipsPath, 'utf8'));

// API route patterns to verify
const apiRoutes = {
  // Document Processing Routes
  '/api/documents/process': {
    file: 'app/api/documents/process/route.js',
    expectedTables: ['document_processing_enhanced', 'batch_jobs', 'processing_logs'],
    expectedRelationships: ['filename', 'batch_id']
  },
  '/api/documents/process-batch-enhanced': {
    file: 'app/api/documents/process-batch-enhanced/route.js',
    expectedTables: ['batch_jobs', 'document_processing_enhanced', 'processing_logs'],
    expectedRelationships: ['batch_id', 'filename']
  },
  '/api/documents/validate-security': {
    file: 'app/api/documents/validate-security/route.js',
    expectedTables: ['security_validations', 'document_processing_enhanced'],
    expectedRelationships: ['filename']
  },
  '/api/documents/status-all': {
    file: 'app/api/documents/status-all/route.js',
    expectedTables: ['document_processing_enhanced', 'batch_jobs'],
    expectedRelationships: ['batch_id']
  },

  // Learning System Routes
  '/api/learning/enhanced': {
    file: 'app/api/learning/enhanced/route.js',
    expectedTables: ['learning_events_enhanced', 'document_processing_enhanced'],
    expectedRelationships: ['document_id', 'filename']
  },
  '/api/learning/confidence-scoring': {
    file: 'app/api/learning/confidence-scoring/route.js',
    expectedTables: ['confidence_analyses', 'document_processing_enhanced'],
    expectedRelationships: ['document_id']
  },
  '/api/learning/heuristic-patterns': {
    file: 'app/api/learning/heuristic-patterns/route.js',
    expectedTables: ['heuristic_patterns'],
    expectedRelationships: []
  },
  '/api/learning/feedback': {
    file: 'app/api/learning/feedback/route.js',
    expectedTables: ['learning_feedback', 'document_processing_enhanced', 'auth.users'],
    expectedRelationships: ['document_id', 'user_id']
  },

  // Security & Compliance Routes
  '/api/security/comprehensive-validation': {
    file: 'app/api/security/comprehensive-validation/route.js',
    expectedTables: ['security_validations', 'agencies'],
    expectedRelationships: ['filename', 'agency_id']
  },
  '/api/security/monitoring': {
    file: 'app/api/security/monitoring/route.js',
    expectedTables: ['security_audit_trail', 'security_validations', 'agencies'],
    expectedRelationships: ['user_id', 'agency_id']
  },

  // Submission Routes
  '/api/submissions': {
    file: 'app/api/submissions/route.js',
    expectedTables: ['submissions', 'submission_vulnerabilities', 'submission_options_for_consideration', 'submission_sources'],
    expectedRelationships: ['submission_id']
  },
  '/api/submissions/[id]/approve': {
    file: 'app/api/submissions/[id]/approve/route.js',
    expectedTables: ['submissions', 'vulnerabilities', 'options_for_consideration', 'sources'],
    expectedRelationships: ['submission_id']
  },
  '/api/submissions/[id]/reject': {
    file: 'app/api/submissions/[id]/reject/route.js',
    expectedTables: ['submissions'],
    expectedRelationships: ['submission_id']
  },
  '/api/submissions/[id]/delete': {
    file: 'app/api/submissions/[id]/delete/route.js',
    expectedTables: ['submissions'],
    expectedRelationships: ['submission_id']
  },

  // Admin Routes
  '/api/admin/users': {
    file: 'app/api/admin/users/route.js',
    expectedTables: ['auth.users', 'user_agency_relationships', 'agencies', 'user_roles'],
    expectedRelationships: ['user_id', 'agency_id', 'role_id']
  },
  '/api/admin/ofcs': {
    file: 'app/api/admin/ofcs/route.js',
    expectedTables: ['options_for_consideration', 'ofc_sources', 'sources'],
    expectedRelationships: ['ofc_id', 'source_id']
  },
  '/api/admin/vulnerabilities': {
    file: 'app/api/admin/vulnerabilities/route.js',
    expectedTables: ['vulnerabilities', 'vulnerability_ofc_links', 'options_for_consideration'],
    expectedRelationships: ['vulnerability_id', 'ofc_id']
  },

  // Authentication Routes
  '/api/auth/login': {
    file: 'app/api/auth/login/route.js',
    expectedTables: ['auth.users', 'user_agency_relationships'],
    expectedRelationships: ['user_id']
  },
  '/api/auth/register': {
    file: 'app/api/auth/register/route.js',
    expectedTables: ['auth.users', 'user_agency_relationships', 'agencies'],
    expectedRelationships: ['user_id', 'agency_id']
  },
  '/api/auth/verify': {
    file: 'app/api/auth/verify/route.js',
    expectedTables: ['auth.users', 'user_agency_relationships'],
    expectedRelationships: ['user_id']
  }
};

// Verification results
const verificationResults = {
  totalRoutes: 0,
  verifiedRoutes: 0,
  issues: [],
  warnings: [],
  recommendations: []
};

console.log('🔍 Starting API Route Relationship Verification...\n');

// Verify each API route
for (const [route, config] of Object.entries(apiRoutes)) {
  verificationResults.totalRoutes++;
  
  console.log(`📋 Verifying route: ${route}`);
  console.log(`   File: ${config.file}`);
  console.log(`   Expected tables: ${config.expectedTables.join(', ')}`);
  console.log(`   Expected relationships: ${config.expectedRelationships.join(', ')}`);

  // Check if the route file exists
  const filePath = path.join(__dirname, '..', config.file);
  if (!fs.existsSync(filePath)) {
    verificationResults.issues.push({
      route,
      issue: 'File not found',
      file: config.file,
      severity: 'error'
    });
    console.log(`   ❌ File not found: ${config.file}`);
    continue;
  }

  // Read the route file content
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Verify table usage
  const tableUsage = {};
  for (const table of config.expectedTables) {
    const tableRegex = new RegExp(`from\\s+['"]${table}['"]|to\\s+['"]${table}['"]`, 'gi');
    const matches = fileContent.match(tableRegex);
    tableUsage[table] = matches ? matches.length : 0;
  }

  // Check for missing table usage
  const missingTables = config.expectedTables.filter(table => !tableUsage[table]);
  if (missingTables.length > 0) {
    verificationResults.issues.push({
      route,
      issue: 'Missing table usage',
      missingTables,
      severity: 'error'
    });
    console.log(`   ❌ Missing table usage: ${missingTables.join(', ')}`);
  }

  // Verify relationship usage
  const relationshipUsage = {};
  for (const relationship of config.expectedRelationships) {
    const relationshipRegex = new RegExp(relationship, 'gi');
    const matches = fileContent.match(relationshipRegex);
    relationshipUsage[relationship] = matches ? matches.length : 0;
  }

  // Check for missing relationship usage
  const missingRelationships = config.expectedRelationships.filter(rel => !relationshipUsage[rel]);
  if (missingRelationships.length > 0) {
    verificationResults.warnings.push({
      route,
      issue: 'Missing relationship usage',
      missingRelationships,
      severity: 'warning'
    });
    console.log(`   ⚠️  Missing relationship usage: ${missingRelationships.join(', ')}`);
  }

  // Check for proper foreign key usage
  const foreignKeyPatterns = [
    /\.insert\s*\(\s*\{[^}]*\w+_id\s*:/g,
    /\.update\s*\(\s*\{[^}]*\w+_id\s*:/g,
    /\.eq\s*\(\s*['"]\w+_id['"]/g,
    /\.select\s*\(\s*['"]\*['"]\s*\)/g
  ];

  const hasForeignKeyUsage = foreignKeyPatterns.some(pattern => pattern.test(fileContent));
  if (!hasForeignKeyUsage && config.expectedRelationships.length > 0) {
    verificationResults.warnings.push({
      route,
      issue: 'No foreign key usage detected',
      severity: 'warning'
    });
    console.log(`   ⚠️  No foreign key usage detected`);
  }

  // Check for proper error handling
  const errorHandlingPatterns = [
    /if\s*\(\s*error\s*\)/g,
    /catch\s*\(\s*error\s*\)/g,
    /throw\s+new\s+Error/g,
    /console\.error/g
  ];

  const hasErrorHandling = errorHandlingPatterns.some(pattern => pattern.test(fileContent));
  if (!hasErrorHandling) {
    verificationResults.warnings.push({
      route,
      issue: 'No error handling detected',
      severity: 'warning'
    });
    console.log(`   ⚠️  No error handling detected`);
  }

  // Check for proper RLS usage
  const rlsPatterns = [
    /auth\.uid\(\)/g,
    /auth\.role\(\)/g,
    /user_agency_relationships/g,
    /security_clearance_level/g
  ];

  const hasRLSUsage = rlsPatterns.some(pattern => pattern.test(fileContent));
  if (!hasRLSUsage && route.includes('/admin/') || route.includes('/security/')) {
    verificationResults.warnings.push({
      route,
      issue: 'No RLS usage detected for admin/security route',
      severity: 'warning'
    });
    console.log(`   ⚠️  No RLS usage detected for admin/security route`);
  }

  // Check for proper logging
  const loggingPatterns = [
    /console\.log/g,
    /console\.error/g,
    /console\.warn/g
  ];

  const hasLogging = loggingPatterns.some(pattern => pattern.test(fileContent));
  if (!hasLogging) {
    verificationResults.warnings.push({
      route,
      issue: 'No logging detected',
      severity: 'info'
    });
    console.log(`   ℹ️  No logging detected`);
  }

  // If no issues found, mark as verified
  if (missingTables.length === 0 && missingRelationships.length === 0) {
    verificationResults.verifiedRoutes++;
    console.log(`   ✅ Route verified successfully`);
  }

  console.log('');
}

// Generate verification report
console.log('📊 VERIFICATION REPORT');
console.log('====================');
console.log(`Total routes: ${verificationResults.totalRoutes}`);
console.log(`Verified routes: ${verificationResults.verifiedRoutes}`);
console.log(`Issues found: ${verificationResults.issues.length}`);
console.log(`Warnings: ${verificationResults.warnings.length}`);

if (verificationResults.issues.length > 0) {
  console.log('\n❌ ISSUES FOUND:');
  verificationResults.issues.forEach(issue => {
    console.log(`   ${issue.route}: ${issue.issue}`);
    if (issue.missingTables) {
      console.log(`     Missing tables: ${issue.missingTables.join(', ')}`);
    }
    if (issue.missingRelationships) {
      console.log(`     Missing relationships: ${issue.missingRelationships.join(', ')}`);
    }
  });
}

if (verificationResults.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  verificationResults.warnings.forEach(warning => {
    console.log(`   ${warning.route}: ${warning.issue}`);
  });
}

// Generate recommendations
console.log('\n💡 RECOMMENDATIONS:');

// Check for missing relationship patterns
const allExpectedRelationships = new Set();
Object.values(apiRoutes).forEach(route => {
  route.expectedRelationships.forEach(rel => allExpectedRelationships.add(rel));
});

const definedRelationships = relationships.database_relationships.relationship_patterns;
const missingRelationshipDefinitions = Array.from(allExpectedRelationships).filter(rel => 
  !Object.values(definedRelationships).some(pattern => 
    Object.values(pattern).includes(rel)
  )
);

if (missingRelationshipDefinitions.length > 0) {
  console.log(`   • Add missing relationship definitions: ${missingRelationshipDefinitions.join(', ')}`);
}

// Check for unused relationships
const usedRelationships = new Set();
Object.values(apiRoutes).forEach(route => {
  route.expectedRelationships.forEach(rel => usedRelationships.add(rel));
});

const definedRelationshipKeys = Object.keys(definedRelationships);
const unusedRelationships = definedRelationshipKeys.filter(key => 
  !usedRelationships.has(key)
);

if (unusedRelationships.length > 0) {
  console.log(`   • Consider using defined relationships: ${unusedRelationships.join(', ')}`);
}

// Check for consistency
const inconsistentRoutes = [];
Object.entries(apiRoutes).forEach(([route, config]) => {
  const hasAllTables = config.expectedTables.every(table => 
    Object.keys(relationships.database_relationships.enhanced_processing_tables).includes(table) ||
    Object.keys(relationships.database_relationships.core_tables).includes(table) ||
    Object.keys(relationships.database_relationships.submission_tables).includes(table) ||
    Object.keys(relationships.database_relationships.security_tables).includes(table)
  );
  
  if (!hasAllTables) {
    inconsistentRoutes.push(route);
  }
});

if (inconsistentRoutes.length > 0) {
  console.log(`   • Review inconsistent routes: ${inconsistentRoutes.join(', ')}`);
}

// Final status
const successRate = (verificationResults.verifiedRoutes / verificationResults.totalRoutes) * 100;
console.log(`\n🎯 VERIFICATION COMPLETE`);
console.log(`Success rate: ${successRate.toFixed(1)}%`);

if (successRate === 100) {
  console.log('🎉 All API routes are properly using defined relationships!');
} else if (successRate >= 80) {
  console.log('✅ Most API routes are properly configured with minor issues to address.');
} else {
  console.log('⚠️  Several API routes need attention to properly use defined relationships.');
}

// Save verification results
const resultsPath = path.join(__dirname, '..', 'db', 'verification-results.json');
fs.writeFileSync(resultsPath, JSON.stringify(verificationResults, null, 2));
console.log(`\n📄 Verification results saved to: ${resultsPath}`);

process.exit(successRate === 100 ? 0 : 1);
