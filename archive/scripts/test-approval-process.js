const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testApprovalProcess() {
  try {
    console.log('Testing approval process...\n');
    
    // Create a test submission
    const testSubmission = {
      type: 'vulnerability',
      data: JSON.stringify({
        vulnerability: 'Test vulnerability for approval process',
        discipline: 'Physical Security',
        source: 'Test Source',
        sector_id: null,
        subsector_id: null
      }),
      status: 'pending_review',
      source: 'test_submission'
    };
    
    console.log('1. Creating test submission...');
    const { data: submission, error: createError } = await supabase
      .from('submissions')
      .insert([testSubmission])
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Error creating submission:', createError.message);
      return;
    }
    
    console.log('✅ Test submission created:', submission.id);
    
    // Test approval
    console.log('\n2. Testing approval process...');
    const response = await fetch(`http://localhost:3000/api/submissions/${submission.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'approve',
        processedBy: '00000000-0000-0000-0000-000000000000'
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Approval successful');
      console.log('Result:', result);
      
      // Check if vulnerability was added to the database
      console.log('\n3. Checking if vulnerability was added to database...');
      const { data: vulnerabilities, error: vulnError } = await supabase
        .from('vulnerabilities')
        .select('*')
        .eq('vulnerability', 'Test vulnerability for approval process')
        .limit(1);
      
      if (vulnError) {
        console.log('❌ Error checking vulnerabilities:', vulnError.message);
      } else if (vulnerabilities.length > 0) {
        console.log('✅ Vulnerability successfully added to database');
        console.log('Added vulnerability:', vulnerabilities[0]);
      } else {
        console.log('❌ Vulnerability not found in database');
      }
      
    } else {
      console.log('❌ Approval failed:', result.error);
      if (result.details) {
        console.log('Details:', result.details);
      }
    }
    
    // Clean up test submission
    console.log('\n4. Cleaning up test submission...');
    const { error: deleteError } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submission.id);
    
    if (deleteError) {
      console.log('⚠️  Error cleaning up submission:', deleteError.message);
    } else {
      console.log('✅ Test submission cleaned up');
    }
    
    // Clean up test vulnerability
    const { error: deleteVulnError } = await supabase
      .from('vulnerabilities')
      .delete()
      .eq('vulnerability', 'Test vulnerability for approval process');
    
    if (deleteVulnError) {
      console.log('⚠️  Error cleaning up vulnerability:', deleteVulnError.message);
    } else {
      console.log('✅ Test vulnerability cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Test OFC approval as well
async function testOFCApproval() {
  try {
    console.log('\n=== Testing OFC Approval Process ===\n');
    
    // Create a test OFC submission
    const testOFCSubmission = {
      type: 'ofc',
      data: JSON.stringify({
        option_text: 'Test option for consideration for approval process',
        discipline: 'Physical Security',
        source: 'Test Source',
        sector_id: null,
        subsector_id: null
      }),
      status: 'pending_review',
      source: 'test_submission'
    };
    
    console.log('1. Creating test OFC submission...');
    const { data: submission, error: createError } = await supabase
      .from('submissions')
      .insert([testOFCSubmission])
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Error creating OFC submission:', createError.message);
      return;
    }
    
    console.log('✅ Test OFC submission created:', submission.id);
    
    // Test approval
    console.log('\n2. Testing OFC approval process...');
    const response = await fetch(`http://localhost:3000/api/submissions/${submission.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'approve',
        processedBy: '00000000-0000-0000-0000-000000000000'
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ OFC Approval successful');
      console.log('Result:', result);
      
      // Check if OFC was added to the database
      console.log('\n3. Checking if OFC was added to database...');
      const { data: ofcs, error: ofcError } = await supabase
        .from('options_for_consideration')
        .select('*')
        .eq('option_text', 'Test option for consideration for approval process')
        .limit(1);
      
      if (ofcError) {
        console.log('❌ Error checking OFCs:', ofcError.message);
      } else if (ofcs.length > 0) {
        console.log('✅ OFC successfully added to database');
        console.log('Added OFC:', ofcs[0]);
      } else {
        console.log('❌ OFC not found in database');
      }
      
    } else {
      console.log('❌ OFC Approval failed:', result.error);
      if (result.details) {
        console.log('Details:', result.details);
      }
    }
    
    // Clean up test submission
    console.log('\n4. Cleaning up test OFC submission...');
    const { error: deleteError } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submission.id);
    
    if (deleteError) {
      console.log('⚠️  Error cleaning up OFC submission:', deleteError.message);
    } else {
      console.log('✅ Test OFC submission cleaned up');
    }
    
    // Clean up test OFC
    const { error: deleteOFCError } = await supabase
      .from('options_for_consideration')
      .delete()
      .eq('option_text', 'Test option for consideration for approval process');
    
    if (deleteOFCError) {
      console.log('⚠️  Error cleaning up OFC:', deleteOFCError.message);
    } else {
      console.log('✅ Test OFC cleaned up');
    }
    
  } catch (error) {
    console.error('❌ OFC Test error:', error.message);
  }
}

// Run tests
console.log('=== Testing Approval Process ===\n');
testApprovalProcess().then(() => {
  testOFCApproval();
});
