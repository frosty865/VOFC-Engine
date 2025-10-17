// Simple test to create a submission directly
const testSubmission = {
  type: 'vulnerability',
  data: JSON.stringify({
    vulnerability: 'Test vulnerability for admin dashboard',
    discipline: 'Physical Security',
    source: 'Test Source',
    sector_id: 1,
    subsector_id: 1
  }),
  status: 'pending_review',
  source: 'test_script'
};

console.log('Test submission data:');
console.log(JSON.stringify(testSubmission, null, 2));

console.log('\nTo create this submission, use the single submission form:');
console.log('1. Go to http://localhost:3001/submit');
console.log('2. Fill out the form with:');
console.log('   - Vulnerability: "Test vulnerability for admin dashboard"');
console.log('   - Discipline: "Physical Security"');
console.log('   - Source: "Test Source"');
console.log('   - Select a sector and subsector');
console.log('3. Click "Submit for Review"');
console.log('4. Check the admin page at http://localhost:3001/admin');


