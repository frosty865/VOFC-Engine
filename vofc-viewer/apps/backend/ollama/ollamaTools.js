// Calls your Python scripts.

import { spawn } from "child_process";
import path from "path";

export const tools = {
  parse_pdf: (filePath) => runPython("parsers/pdf_parser.py", [filePath]),
  parse_universal: (filePath, title) => runPython("parsers/universal_parser.py", [filePath, title || "Document"]),
  process_document: (filePath, title) => runPython("parsers/document_processor.py", [filePath, title || "Document"]),
  normalize_json: (filePath) => runPython("ai/normalize.py", [filePath]),
  normalize_universal: (filePath) => runPython("ai/normalize_universal.py", [filePath]),
  link_supabase: (filePath) => runPython("ai/linker.py", [filePath]),
  verify_json: (filePath) => runPython("ai/verify.py", [filePath]),
  auto_link: (filePath) => runPython("pipeline/auto_linker.py", [filePath]),
  generate_gap_report: (sector) => runPython("reports/gap_report.py", [sector || "all"]),
  learn_patterns: () => runPython("ai/pattern_learner.py", []),
  create_sector_profiles: () => runPython("learning/sector_profiles.py", []),
  start_intelligence: () => runPython("continuous_intelligence.py", ["start"]),
  run_intelligence_cycle: () => runPython("continuous_intelligence.py", ["cycle"]),
  get_intelligence_status: () => runPython("continuous_intelligence.py", ["status"]),
  run_proactive_recommendations: () => runPython("alerts/suggestions.py", []),
  analyze_correlations: () => runPython("analytics/correlation.py", []),
  update_adaptive_prompts: () => runPython("ollama/adaptive_prompts.py", []),
};

function runPython(script, args = []) {
  return new Promise((resolve, reject) => {
    // Use absolute path to avoid path issues
    const scriptPath = path.resolve(script);
    const proc = spawn("python", [scriptPath, ...args]);
    let output = "";
    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => console.error(d.toString()));
    proc.on("close", () => resolve(output.trim()));
  });
}