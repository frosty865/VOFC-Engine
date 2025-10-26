import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const logFile = path.join(process.cwd(), "ollama_dashboard.log");

function appendLog(msg) {
  const entry = `${new Date().toISOString()} | ${msg}\n`;
  fs.appendFileSync(logFile, entry);
}

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
        appendLog(logEntry);
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
  send("🔴 LIVE MODE: Monitoring actual VOFC processing", "system");
  
  // Check for active processing
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/documents/status`);
    const status = await response.json();
    
    if (status.processing > 0) {
      send(`📊 Found ${status.processing} active processing jobs`, "info");
      send("🔄 Monitoring live processing...", "info");
      
      // Monitor for 60 seconds with more detailed updates
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        
        // Check processing status every 10 seconds
        if (i % 10 === 0) {
          try {
            const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/documents/status`);
            const currentStatus = await statusResponse.json();
            
            if (currentStatus.processing > 0) {
              send(`📈 Processing status: ${currentStatus.processing} active jobs`, "info");
              if (currentStatus.completed > 0) {
                send(`✅ Completed: ${currentStatus.completed} documents`, "success");
              }
              if (currentStatus.failed > 0) {
                send(`❌ Failed: ${currentStatus.failed} documents`, "error");
              }
            } else {
              send("✅ All processing jobs completed", "success");
              break;
            }
          } catch (statusError) {
            send(`⚠️ Could not check status: ${statusError.message}`, "warning");
          }
        } else {
          send(`⏱️ Live monitoring: ${60-i}s remaining`, "info");
        }
      }
    } else {
      send("ℹ️ No active processing jobs found", "info");
      send("💡 Start a document processing job to see live monitoring", "tip");
      
      // Check for recent activity
      try {
        const recentResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/documents/list`);
        const recentData = await recentResponse.json();
        
        if (recentData.documents && recentData.documents.length > 0) {
          send(`📋 Found ${recentData.documents.length} documents in queue`, "info");
          send("🔄 Ready to process documents when submitted", "info");
        } else {
          send("📭 No documents in processing queue", "info");
        }
      } catch (recentError) {
        send(`⚠️ Could not check document queue: ${recentError.message}`, "warning");
      }
    }
  } catch (error) {
    send(`⚠️ Could not connect to live monitoring: ${error.message}`, "warning");
    send("🔧 Check if the VOFC application is running", "tip");
  }
}

async function runOllamaOnlyMode(send) {
  send("🧠 OLLAMA-ONLY MODE: Direct model monitoring", "system");
  
  try {
    // Check Ollama status
    const ollamaStatus = spawn("ollama", ["list"]);
    ollamaStatus.stdout.on("data", (data) => {
      const models = data.toString().trim();
      send(`📋 Available models:\n${models}`, "info");
    });
    
    ollamaStatus.stderr.on("data", (data) => {
      send(`⚠️ Ollama error: ${data.toString().trim()}`, "error");
    });
    
    await new Promise((r) => setTimeout(r, 2000));
    
    // Test model
    send("🧪 Testing Mistral model...", "info");
    const testProcess = spawn("ollama", ["run", "mistral", "--input", "Hello, test response"]);
    
    testProcess.stdout.on("data", (data) => {
      send(`🤖 Model response: ${data.toString().trim()}`, "success");
    });
    
    testProcess.stderr.on("data", (data) => {
      send(`⚠️ Model error: ${data.toString().trim()}`, "error");
    });
    
    await new Promise((r) => setTimeout(r, 5000));
    
  } catch (error) {
    send(`❌ Ollama monitoring failed: ${error.message}`, "error");
  }
}
