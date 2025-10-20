const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test CSV data
const testCSV = `Category,Vulnerability,"Options for Consideration",Sources
Insider Threat,"The facility does not have a comprehensive program to mitigate threats from insiders (employees, former employees, contractors, or partners).","Establish a program to mitigate insider threats, which can include malicious, unintentional, or complacent acts that harm an organization.","[cite: 2]"
Insider Threat,"The facility's security culture does not adequately address unintentional insider threats, such as negligence or accidents.","Conduct continuous employee training and awareness programs to educate staff on security policies and the dangers of negligent actions.","[cite: 2, 6]"
Cyber-Physical Security,"The facility's physical security systems (e.g., access control, CCTV, HVAC) are connected to the IT network, but are managed by separate, non-collaborating departments.","Establish formal collaboration and convergence between previously disjointed security functions, such as cybersecurity and physical security teams, to create a unified security policy.","[cite: 4, 5, 8]"`;

async function testCSVParsing() {
  try {
    console.log('Testing CSV parsing functionality...\n');
    
    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/submissions/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        csvData: testCSV,
        submittedBy: '00000000-0000-0000-0000-000000000000' // Test user ID
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ CSV parsing successful!');
      console.log('Summary:', result.summary);
      console.log('Submission IDs:', result.submissionIds);
    } else {
      console.log('❌ CSV parsing failed:');
      console.log('Error:', result.error);
      if (result.details) {
        console.log('Details:', result.details);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test CSV parsing locally
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Handle CSV parsing with quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    // Create object from headers and values
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].replace(/"/g, '') : '';
    });
    
    data.push(row);
  }
  
  return data;
}

function testLocalParsing() {
  console.log('Testing local CSV parsing...\n');
  
  const parsedData = parseCSV(testCSV);
  console.log('Parsed data:');
  console.log(JSON.stringify(parsedData, null, 2));
  
  // Validate data
  const requiredFields = ['Category', 'Vulnerability', 'Options for Consideration'];
  const errors = [];
  
  parsedData.forEach((row, index) => {
    const rowNum = index + 2;
    requiredFields.forEach(field => {
      if (!row[field] || row[field].trim() === '') {
        errors.push(`Row ${rowNum}: Missing required field "${field}"`);
      }
    });
  });
  
  if (errors.length > 0) {
    console.log('❌ Validation errors:');
    errors.forEach(error => console.log('  -', error));
  } else {
    console.log('✅ Local parsing successful');
  }
}

// Run tests
console.log('=== CSV Parsing Test ===\n');
testLocalParsing();
console.log('\n=== API Test ===\n');
testCSVParsing();


