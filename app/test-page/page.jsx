export default function TestPage() {
  console.log('🎯 Test page is rendering');
  
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightgreen' }}>
      <h1>Test Page</h1>
      <p>This is a test page to verify routing is working.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  );
}
