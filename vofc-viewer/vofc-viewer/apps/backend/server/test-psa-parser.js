// Test script for PSA Document Parser
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testPSAParser() {
  console.log('🧪 Testing PSA Document Parser...\n');

  // Test health check
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/psa/health`);
    const healthData = await healthResponse.json();
    console.log('✅ PSA Parser Health Check:', healthData);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return;
  }

  // Sample security assessment document
  const sampleDocument = `
SECURITY ASSESSMENT REPORT
Facility: Critical Infrastructure Power Plant
Date: 2024-01-15
Assessor: Senior PSA Team

FINDINGS:
1. Physical Security Vulnerabilities:
   - Perimeter fence has multiple gaps allowing unauthorized access
   - Access control system lacks multi-factor authentication
   - Security cameras have blind spots in critical areas
   - No 24/7 security personnel on-site

2. Cybersecurity Issues:
   - Industrial control systems not properly segmented from corporate network
   - Outdated firmware on SCADA systems presents significant risk
   - No network monitoring for anomalous activity
   - Insufficient backup and recovery procedures

3. Personnel Security:
   - Background checks not completed for all contractors
   - No security awareness training program
   - Inadequate visitor management procedures

RECOMMENDATIONS:
1. Install additional perimeter fencing and access controls
2. Implement multi-factor authentication for all systems
3. Upgrade security camera system with AI-powered analytics
4. Hire dedicated security personnel for 24/7 coverage
5. Segment industrial networks from corporate systems
6. Establish regular security training program
7. Implement comprehensive visitor management system
  `;

  // Test single document parsing
  try {
    console.log('\n📄 Testing single document parsing...');
    const parseResponse = await fetch(`${BASE_URL}/api/psa/parse-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentText: sampleDocument,
        documentType: 'security_assessment'
      })
    });

    const parseData = await parseResponse.json();
    console.log('✅ Document parsing result:', JSON.stringify(parseData, null, 2));
  } catch (error) {
    console.error('❌ Document parsing failed:', error.message);
  }

  // Test multiple documents
  try {
    console.log('\n📚 Testing multiple document parsing...');
    const multiDocResponse = await fetch(`${BASE_URL}/api/psa/parse-documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents: [
          {
            id: 'doc1',
            type: 'security_assessment',
            text: sampleDocument
          },
          {
            id: 'doc2', 
            type: 'vulnerability_report',
            text: 'Network vulnerability found: Unpatched Windows servers in DMZ. Recommend immediate patching and network segmentation.'
          }
        ]
      })
    });

    const multiDocData = await multiDocResponse.json();
    console.log('✅ Multiple document parsing result:', JSON.stringify(multiDocData, null, 2));
  } catch (error) {
    console.error('❌ Multiple document parsing failed:', error.message);
  }

  console.log('\n🎯 PSA Document Parser testing complete!');
}

// Run the test
testPSAParser().catch(console.error);
