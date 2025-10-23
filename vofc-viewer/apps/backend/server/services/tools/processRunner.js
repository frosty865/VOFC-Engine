import { spawn } from "child_process";

export const tools = {
  parse_pdf: async (path) => {
    return await runPython("parsers/pdf_parser.py", [path]);
  },
  normalize_json: async (path) => {
    return await runPython("ai/normalize.py", [path]);
  },
  link_to_supabase: async (jsonPath) => {
    return await runPython("pipeline/linker.py", [jsonPath]);
  },
  run_java_module: async (jarPath, args = []) => {
    return await runJava(jarPath, args);
  }
};

function runPython(script, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", [script, ...args]);
    let output = "";
    let error = "";
    
    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => {
      error += d.toString();
      console.error(d.toString());
    });
    
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${error}`));
      } else {
        resolve(output.trim());
      }
    });
    
    proc.on("error", (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

function runJava(jarPath, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn("java", ["-jar", jarPath, ...args]);
    let output = "";
    let error = "";
    
    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => {
      error += d.toString();
      console.error(d.toString());
    });
    
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Java process exited with code ${code}: ${error}`));
      } else {
        resolve(output.trim());
      }
    });
    
    proc.on("error", (err) => {
      reject(new Error(`Failed to start Java process: ${err.message}`));
    });
  });
}

// Additional utility functions for VOFC-specific tasks
export const vofcTools = {
  // Parse PDF documents for vulnerabilities and OFCs
  parseVOFCDocument: async (pdfPath) => {
    try {
      const result = await tools.parse_pdf(pdfPath);
      return JSON.parse(result);
    } catch (error) {
      throw new Error(`Failed to parse VOFC document: ${error.message}`);
    }
  },

  // Normalize extracted data
  normalizeVOFCData: async (jsonPath) => {
    try {
      const result = await tools.normalize_json(jsonPath);
      return JSON.parse(result);
    } catch (error) {
      throw new Error(`Failed to normalize VOFC data: ${error.message}`);
    }
  },

  // Link normalized data to Supabase
  linkToSupabase: async (jsonPath) => {
    try {
      const result = await tools.link_to_supabase(jsonPath);
      return JSON.parse(result);
    } catch (error) {
      throw new Error(`Failed to link to Supabase: ${error.message}`);
    }
  },

  // Run Java-based analysis modules
  runAnalysisModule: async (jarPath, args = []) => {
    try {
      const result = await tools.run_java_module(jarPath, args);
      return JSON.parse(result);
    } catch (error) {
      throw new Error(`Failed to run analysis module: ${error.message}`);
    }
  }
};
