// Main chat loop using built-in fetch
import { tools } from "./ollamaTools.js";
import fs from "fs";
import path from "path";

const OLLAMA_BASE_URL = "http://localhost:11434";
const MODEL = "llama3:latest";

// Logging function
function logRun(command, output) {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const logData = { command, output, timestamp: new Date().toISOString() };
    // Ensure the directory exists
    const logDir = path.join(process.cwd(), 'data', 'agent_logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(path.join(logDir, `${ts}.json`), JSON.stringify(logData, null, 2));
  } catch (error) {
    console.error("Failed to log run:", error);
  }
}

// Load context and memory
function loadContext() {
  try {
    const schemaPath = path.join(process.cwd(), 'ollama', 'context', 'schema.json');
    const memoryPath = path.join(process.cwd(), 'ollama', 'memory.json');
    const rulesPath = path.join(process.cwd(), 'ollama', 'rules.yaml');
    
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const memory = fs.existsSync(memoryPath) 
      ? JSON.parse(fs.readFileSync(memoryPath, "utf8"))
      : { known_vulnerabilities: [], known_ofcs: [] };
    
    // Load learning rules if available
    const rules = fs.existsSync(rulesPath) 
      ? fs.readFileSync(rulesPath, "utf8")
      : "# No learning rules available yet";
    
    return { schema, memory, rules };
  } catch (error) {
    console.error("Failed to load context:", error);
    return { schema: {}, memory: { known_vulnerabilities: [], known_ofcs: [] }, rules: "# No context available" };
  }
}

export async function runAgent(prompt) {
  try {
    const { schema, memory, rules } = loadContext();
    
    // Adaptive system prompt based on context
    let systemPrompt;
    if (prompt.includes("parse") || prompt.includes("extract")) {
      systemPrompt = `You are in Data Extraction mode. Focus on parsing and extracting vulnerabilities and OFCs from documents.`;
    } else if (prompt.includes("link") || prompt.includes("database")) {
      systemPrompt = `You are in Database Reasoning mode. Focus on linking data to Supabase and managing relationships.`;
    } else if (prompt.includes("learn") || prompt.includes("pattern") || prompt.includes("gap")) {
      systemPrompt = `You are in Learning mode. Focus on analyzing patterns, generating reports, and improving the system.`;
    } else if (prompt.includes("intelligence") || prompt.includes("continuous") || prompt.includes("autonomous")) {
      systemPrompt = `You are in Continuous Intelligence mode. You can orchestrate autonomous learning, proactive recommendations, correlation analysis, and adaptive prompts.`;
    } else {
      systemPrompt = `You are a specialized VOFC (Vulnerabilities and Options for Consideration) analysis agent with self-improving capabilities.

Your capabilities include:
- Parsing PDF documents to extract vulnerabilities and OFCs
- Normalizing and cleaning extracted text data
- Linking data to Supabase database with confidence scoring
- Auto-linking similar vulnerabilities and OFCs
- Learning from patterns and improving over time
- Generating gap reports and sector analysis
- Running analysis tools and generating reports
- Verifying data integrity and citations

Database Schema:
${JSON.stringify(schema, null, 2)}

Known Vulnerabilities:
${memory.known_vulnerabilities.join(", ")}

Learning Rules:
${rules}

Available tools:
- parse_pdf: Extract vulnerabilities and OFCs from PDF documents
- parse_universal: Document-agnostic parser for any file type (PDF, DOCX, TXT)
- process_document: Complete document processing with sector mapping
- normalize_json: Clean and structure extracted data
- normalize_universal: Universal normalization using vofc-engine model
- link_supabase: Import processed data into database
- verify_json: Verify data integrity and citations
- auto_link: Automatically link similar items with confidence scoring
- generate_gap_report: Identify vulnerabilities without OFCs
- learn_patterns: Analyze patterns and generate improvement rules
- start_intelligence: Start continuous intelligence system
- run_intelligence_cycle: Run complete autonomous intelligence cycle
- get_intelligence_status: Get current intelligence system status

Always provide clear, actionable responses and explain your reasoning when using tools.`;
    }
    
    // Call Ollama API
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.message.content.trim();
    
    // Log the interaction
    logRun(prompt, text);
    
    // Intelligent tool selection for natural language
    if (!text.startsWith("{")) {
      // Natural language → decide tool
      if (text.match(/\.pdf/i) || prompt.match(/\.pdf/i)) {
        const pdfPath = text.match(/\.pdf/i) ? text : prompt;
        const result = await tools.parse_universal("data/" + pdfPath, "PDF Document");
        return runAgent(`Tool output:\n${result}\nWhat should we do next?`);
      }
      if (text.match(/\.(docx?|txt|rtf)/i) || prompt.match(/\.(docx?|txt|rtf)/i)) {
        const docPath = text.match(/\.(docx?|txt|rtf)/i) ? text : prompt;
        const result = await tools.parse_universal("data/" + docPath, "Document");
        return runAgent(`Tool output:\n${result}\nWhat should we do next?`);
      }
      if (text.match(/\.html/i) || prompt.match(/\.html/i)) {
        const htmlPath = text.match(/\.html/i) ? text : prompt;
        const result = await tools.parse_universal("data/" + htmlPath, "HTML Document");
        return runAgent(`Tool output:\n${result}\nWhat should we do next?`);
      }
      if (text.match(/\.xlsx/i) || prompt.match(/\.xlsx/i)) {
        const excelPath = text.match(/\.xlsx/i) ? text : prompt;
        const result = await tools.parse_universal("data/" + excelPath, "Excel Document");
        return runAgent(`Tool output:\n${result}\nWhat should we do next?`);
      }
      if (text.match(/process.*document/i) || prompt.match(/process.*document/i)) {
        const result = await tools.process_document("data/sample.pdf", "Sample Document");
        return runAgent(`Tool output:\n${result}\nWhat should we do next?`);
      }
      if (text.match(/normalize.*universal/i) || prompt.match(/normalize.*universal/i)) {
        const result = await tools.normalize_universal("data/parsed_generic.json");
        return runAgent(`Tool output:\n${result}\nWhat should we do next?`);
      }
      if (text.match(/normalize/i) || prompt.match(/normalize/i)) {
        const result = await tools.normalize_json("data/temp_data.json");
        return runAgent(`Tool output:\n${result}\nWhat should we do next?`);
      }
      if (text.match(/link/i) || prompt.match(/link/i)) {
        const result = await tools.link_supabase("data/normalized.json");
        return runAgent(`Tool output:\n${result}\nWhat should we do next?`);
      }
      if (text.match(/verify/i) || prompt.match(/verify/i)) {
        const result = await tools.verify_json("data/linked.json");
        return runAgent(`Tool output:\n${result}\nWhat should we do next?`);
      }
    }
    
    // Check if the response contains a tool action
    if (text.startsWith("{") && text.includes('"action"')) {
      try {
        const { action, args } = JSON.parse(text);
        if (tools[action]) {
          const result = await tools[action](...Object.values(args));
          return runAgent(`Tool output:\n${result}\nWhat should we do next?`);
        }
      } catch (parseError) {
        console.error("Failed to parse tool action:", parseError);
        return runAgent("Validation failed; please correct output.");
      }
    }
    
    return text;
  } catch (error) {
    console.error("Error in runAgent:", error);
    return `Error: ${error.message}`;
  }
}