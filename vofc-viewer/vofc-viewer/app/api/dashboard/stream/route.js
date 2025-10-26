import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const logFile = path.join(process.cwd(), "ollama_dashboard.log");

function appendLog(msg) {
  const entry = `${new Date().toISOString()} | ${msg}\n`;
  fs.appendFileSync(logFile, entry);
}

// Enhanced dashboard with real VOFC integration
export async function GET(request) {
  const encoder = new TextEncoder();
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'demo'; // demo, live, ollama-only

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
        send("Initializing monitoring systems...", "system");

        if (mode === 'demo') {
          await runDemoMode(send);
        } else if (mode === 'live') {
          await runLiveMode(send);
        } else if (mode === 'ollama-only') {
          await runOllamaOnlyMode(send);
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

async function runDemoMode(send) {
  send("📄 VOFC Document Processing Pipeline", "info");
  
  // Stage 1: Document Parsing
  await new Promise((r) => setTimeout(r, 800));
  send("🔍 Stage 1: PDF Text Extraction", "stage");
  await new Promise((r) => setTimeout(r, 600));
  send("   ✓ Extracted 2,847 characters from document", "success");
  
  // Stage 2: Chunking
  await new Promise((r) => setTimeout(r, 500));
  send("✂️ Stage 2: Intelligent Text Chunking", "stage");
  await new Promise((r) => setTimeout(r, 400));
  send("   ✓ Created 12 chunks with 150-char overlap", "success");
  send("   ✓ Filtered chunks by security keywords", "success");
  
  // Stage 3: Ollama Processing
  await new Promise((r) => setTimeout(r, 600));
  send("🧠 Stage 3: Ollama AI Analysis", "stage");
  send("   🔄 Initializing Mistral model...", "info");
  
  // Simulate Ollama activity
  const ollamaProcess = spawn("ollama", ["list"]);
  ollamaProcess.stdout.on("data", (data) => {
    const output = data.toString().trim();
    if (output.includes("mistral")) {
      send(`   ✓ Model loaded: ${output.split('\n').find(line => line.includes('mistral'))}`, "success");
    }
  });
  
  await new Promise((r) => setTimeout(r, 1000));
  send("   🔄 Processing batch 1/3 (GPU optimized)...", "info");
  await new Promise((r) => setTimeout(r, 1200));
  send("   ✓ Batch 1: 4 vulnerabilities, 7 OFCs extracted", "success");
  
  await new Promise((r) => setTimeout(r, 800));
  send("   🔄 Processing batch 2/3...", "info");
  await new Promise((r) => setTimeout(r, 1100));
  send("   ✓ Batch 2: 3 vulnerabilities, 5 OFCs extracted", "success");
  
  await new Promise((r) => setTimeout(r, 700));
  send("   🔄 Processing batch 3/3...", "info");
  await new Promise((r) => setTimeout(r, 900));
  send("   ✓ Batch 3: 2 vulnerabilities, 4 OFCs extracted", "success");
  
  // Stage 4: Data Validation
  await new Promise((r) => setTimeout(r, 500));
  send("🔍 Stage 4: Data Validation & Consolidation", "stage");
  await new Promise((r) => setTimeout(r, 400));
  send("   ✓ Validated 9 vulnerabilities", "success");
  send("   ✓ Consolidated 16 options for consideration", "success");
  send("   ✓ Grouped by discipline categories", "success");
  
  // Stage 5: Storage
  await new Promise((r) => setTimeout(r, 600));
  send("💾 Stage 5: Supabase Storage", "stage");
  await new Promise((r) => setTimeout(r, 500));
  send("   ✓ Uploaded processed JSON to Parsed bucket", "success");
  send("   ✓ Updated vulnerability database", "success");
  send("   ✓ Created OFC linkages", "success");
  
  // Performance Metrics
  await new Promise((r) => setTimeout(r, 300));
  send("📊 Performance Metrics:", "metrics");
  send("   • Total processing time: 8.2 seconds", "metrics");
  send("   • GPU utilization: 85%", "metrics");
  send("   • Tokens processed: 12,400", "metrics");
  send("   • Processing rate: 1,512 tokens/sec", "metrics");
  send("   • Memory usage: 2.1GB", "metrics");
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
      
      // Monitor for 30 seconds
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        send(`⏱️ Live monitoring: ${30-i}s remaining`, "info");
      }
    } else {
      send("ℹ️ No active processing jobs found", "info");
      send("💡 Start a document processing job to see live monitoring", "tip");
    }
  } catch (error) {
    send(`⚠️ Could not connect to live monitoring: ${error.message}`, "warning");
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
