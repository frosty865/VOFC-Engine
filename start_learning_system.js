const fetch = require('node-fetch');

async function startLearningSystem() {
  console.log('🧠 Starting Learning System...');
  
  try {
    // Start the learning system
    const response = await fetch('http://localhost:3000/api/learning/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'start' })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Learning system started successfully!');
      console.log('📊 Status:', data.status);
      console.log('🆔 Process ID:', data.processId);
      
      // Check learning status
      setTimeout(async () => {
        try {
          const statusResponse = await fetch('http://localhost:3000/api/learning/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'status' })
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('📈 Learning system status:', statusData.status);
          }
        } catch (statusError) {
          console.warn('⚠️ Could not check learning status:', statusError.message);
        }
      }, 2000);
      
    } else {
      const errorData = await response.json();
      console.error('❌ Failed to start learning system:', errorData.error);
    }
    
  } catch (error) {
    console.error('❌ Error starting learning system:', error.message);
    console.log('💡 Make sure the application is running on http://localhost:3000');
  }
}

// Run the learning system startup
startLearningSystem();
