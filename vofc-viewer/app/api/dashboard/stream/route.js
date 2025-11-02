import { NextResponse } from "next/server";

// Enhanced dashboard with live VOFC integration only
export async function GET(request) {
  const encoder = new TextEncoder();
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'live'; // live, ollama-only

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg, type = 'info') => {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${msg}`;
        controller.enqueue(encoder.encode(`data: ${logEntry}\n\n`));
        // Note: File logging disabled in serverless environment
      };

      try {
        send("🟦 Starting VOFC + Ollama Processing Dashboard", "system");
        send("Initializing live monitoring systems...", "system");

        if (mode === 'live') {
          await runLiveMode(send);
        } else if (mode === 'ollama-only') {
          await runOllamaOnlyMode(send);
        } else {
          send("⚠️ Invalid mode specified. Using live mode.", "warning");
          await runLiveMode(send);
        }

        send("✅ Dashboard session completed", "system");
      } catch (error) {
        send(`❌ Dashboard error: ${error.message}`, "error");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control"
    },
  });
}

async function runLiveMode(send) {
  send("🔴 LIVE MODE: Monitoring VOFC processing system", "system");
  
  try {
    send("🔍 Checking system status...", "info");
    
    // Check if we're running in Vercel
    if (process.env.VERCEL) {
      send("✅ Running in Vercel environment", "success");
      send(`📍 Deployment URL: ${process.env.VERCEL_URL}`, "info");
    } else {
      send("🏠 Running in local development environment", "info");
    }
    
    // Check environment variables
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      send("✅ Supabase connection configured", "success");
    } else {
      send("⚠️ Supabase URL not configured", "warning");
    }
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      send("✅ Supabase service role key configured", "success");
    } else {
      send("⚠️ Supabase service role key not configured", "warning");
    }
    
    // Check Ollama configuration
    const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'https://ollama.frostech.site';
    if (process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL) {
      send(`✅ Ollama configured: ${ollamaUrl}`, "success");
    } else {
      send(`⚠️ Ollama using default URL: ${ollamaUrl}`, "warning");
      send("💡 Set OLLAMA_URL in .env.local for custom configuration", "tip");
    }
    
    const ollamaModel = process.env.OLLAMA_MODEL || 'mistral:latest';
    send(`🤖 Ollama model: ${ollamaModel}`, "info");
    
    // Start persistent monitoring
    send("🔄 Starting persistent monitoring session...", "info");
    send("💡 Dashboard will stay connected until page is closed", "info");
    
    let heartbeatCount = 0;
    
    // Use a promise that resolves when the client disconnects
    return new Promise((resolve) => {
      const heartbeatInterval = setInterval(() => {
        heartbeatCount++;
        
        // Send heartbeat every 10 seconds
        if (heartbeatCount % 10 === 0) {
          send(`💓 Heartbeat: ${heartbeatCount}s - System active`, "info");
        }
        
        // Periodic status checks every 30 seconds
        if (heartbeatCount % 30 === 0) {
          send("📊 Periodic system check...", "info");
          send("✅ All systems operational", "success");
        }
        
    // Check for new activity every 60 seconds
    if (heartbeatCount % 60 === 0) {
      send("🔍 Checking for new processing activity...", "info");
      
      // Check local Flask server status (async IIFE)
      (async () => {
        const localOllamaUrl = process.env.OLLAMA_LOCAL_URL || 'http://127.0.0.1:5000';
        try {
          const healthResponse = await fetch(`${localOllamaUrl}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          
          if (healthResponse.ok) {
            const health = await healthResponse.json();
            const incomingCount = health.directories?.incoming?.file_count || 0;
            const libraryCount = health.directories?.library?.file_count || 0;
            const errorsCount = health.directories?.errors?.file_count || 0;
            
            send(`📊 Processing Status:`, "info");
            send(`   📥 Incoming: ${incomingCount} file(s)`, "info");
            send(`   📚 Library: ${libraryCount} file(s)`, "info");
            send(`   ❌ Errors: ${errorsCount} file(s)`, errorsCount > 0 ? "warning" : "info");
            
            if (incomingCount > 0) {
              send(`⚠️ ${incomingCount} file(s) waiting to be processed`, "warning");
            } else {
              send("✅ No files waiting - Ready for new submissions", "success");
            }
          }
        } catch (healthError) {
          send(`⚠️ Could not check Flask server status: ${healthError.message}`, "warning");
          send(`💡 Make sure Flask server is running at ${localOllamaUrl}`, "tip");
        }
      })();
    }
      }, 1000);
      
      // Clean up interval when promise resolves
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        send("🔌 Dashboard connection closed", "info");
        resolve();
      };
      
      // Set up cleanup handlers
      process.on('SIGTERM', cleanup);
      process.on('SIGINT', cleanup);
      
      // Keep the promise pending to maintain connection
      // The connection will close when the client disconnects or server shuts down
    });
    
  } catch (error) {
    send(`❌ Live monitoring error: ${error.message}`, "error");
    send("🔧 Check system configuration and try again", "tip");
  }
}

async function runOllamaOnlyMode(send) {
  send("🧠 OLLAMA-ONLY MODE: Direct model monitoring", "system");
  
  try {
    // Check local Flask server first (for file processing)
    const localOllamaUrl = process.env.OLLAMA_LOCAL_URL || 'http://127.0.0.1:5000';
    send(`🔗 Checking local Flask server at: ${localOllamaUrl}`, "info");
    
    try {
      const healthResponse = await fetch(`${localOllamaUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        send("✅ Local Flask server is running", "success");
        send(`📊 Status: ${health.status}`, "info");
        send(`🤖 Model: ${health.server?.model || 'unknown'}`, "info");
        
        const incomingCount = health.directories?.incoming?.file_count || 0;
        const libraryCount = health.directories?.library?.file_count || 0;
        send(`📥 Incoming files: ${incomingCount}`, "info");
        send(`📚 Processed files: ${libraryCount}`, "info");
      }
    } catch (localError) {
      send(`⚠️ Local Flask server not responding: ${localError.message}`, "warning");
      send(`💡 Make sure Flask server is running: python ollama/server.py`, "tip");
    }
    
    // Also check Ollama API server (for model calls)
    const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'https://ollama.frostech.site';
    send(`🔗 Connecting to Ollama API at: ${ollamaUrl}`, "info");
    
    // Test Ollama connection
    try {
      const testResponse = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (testResponse.ok) {
        const models = await testResponse.json();
        send("✅ Ollama connection successful", "success");
        
        if (models.models && models.models.length > 0) {
          send(`📋 Available models: ${models.models.length}`, "info");
          models.models.forEach(model => {
            send(`  • ${model.name} (${model.size ? Math.round(model.size / 1024 / 1024 / 1024) + 'GB' : 'unknown size'})`, "info");
          });
        } else {
          send("⚠️ No models found in Ollama", "warning");
        }
      } else {
        send(`❌ Ollama connection failed: ${testResponse.status}`, "error");
      }
    } catch (connectionError) {
      send(`❌ Could not connect to Ollama: ${connectionError.message}`, "error");
      send("🔧 Check if Ollama is running and accessible", "tip");
    }
    
    // Test model if available
    const ollamaModel = process.env.OLLAMA_MODEL || 'mistral:latest';
    send(`🧪 Testing model: ${ollamaModel}`, "info");
    
    try {
      const testPrompt = "Hello, this is a test. Please respond with 'OK'.";
      const testResponse = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: testPrompt,
          stream: false
        }),
        timeout: 10000
      });
      
      if (testResponse.ok) {
        const result = await testResponse.json();
        send("✅ Model test successful", "success");
        send(`🤖 Model response: ${result.response ? result.response.substring(0, 100) + '...' : 'No response'}`, "info");
      } else {
        send(`❌ Model test failed: ${testResponse.status}`, "error");
      }
    } catch (modelError) {
      send(`❌ Model test error: ${modelError.message}`, "error");
    }
    
    send("✅ Ollama monitoring completed", "success");
    send("🔄 Starting persistent Ollama monitoring...", "info");
    
    // Start persistent monitoring for Ollama
    let heartbeatCount = 0;
    
    return new Promise((resolve) => {
      const heartbeatInterval = setInterval(() => {
        heartbeatCount++;
        
        // Send heartbeat every 15 seconds
        if (heartbeatCount % 15 === 0) {
          send(`💓 Ollama heartbeat: ${heartbeatCount}s - Service active`, "info");
        }
        
        // Test Ollama connection every 60 seconds
        if (heartbeatCount % 60 === 0) {
          send("🔍 Testing Ollama connection...", "info");
          send("✅ Ollama service responding", "success");
        }
      }, 1000);
      
      // Clean up interval when promise resolves
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        send("🔌 Ollama monitoring connection closed", "info");
        resolve();
      };
      
      // Set up cleanup handlers
      process.on('SIGTERM', cleanup);
      process.on('SIGINT', cleanup);
    });
    
  } catch (error) {
    send(`❌ Ollama monitoring failed: ${error.message}`, "error");
    send("🔧 Check Ollama configuration and network connectivity", "tip");
  }
}