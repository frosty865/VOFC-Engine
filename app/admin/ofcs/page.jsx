'use client';

export default function OFCManagement() {
  console.log('🎯 OFCManagement component is rendering - NEW VERSION');
  
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue' }}>
      <h1>OFC Management Test - NEW VERSION</h1>
      <p>Component is rendering! This is the new version.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  );
}