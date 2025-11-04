// ================================
// VOFC Engine - Auto OFC Generator
// ================================

import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

// -------------------------------
// 🔹 SUPABASE CONFIG
// -------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// -------------------------------
// 🔹 OLLAMA CONFIG
// -------------------------------
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const MODEL_NAME = process.env.OLLAMA_MODEL || "mistral:latest";
const TEMPERATURE = 0.2;

// -------------------------------
// 🔹 SYSTEM PROMPT TEMPLATE
// -------------------------------
const SYSTEM_PROMPT = `
You are a DHS-style Protective Security Analyst creating authoritative "Options for Consideration" (OFCs)
for vulnerabilities in the VOFC database.

Maintain tone and structure consistent with the SAFE VOFC Library:
- Directive, professional voice. Each OFC begins with an action verb (Implement, Develop, Conduct, etc.)
- 1–2 sentences, ≤40 words.
- Provide concise, actionable mitigation or improvement steps.

Citation rules:
- Every OFC must cite at least one verifiable authoritative source.
- Prefer internal SAFE VOFC Library, FEMA 426/430, DHS, CISA, ASIS, UFC, or Ready.gov.
- Use [cite: SourceTitle, Year, Page] at the end of each OFC.
- If no source available, include [cite: Verification Required].

Response format (valid JSON only):
{
  "vulnerability_id": "<id>",
  "ofcs": [
    {
      "text": "<OFC text>",
      "source": "<Full citation or SAFE reference>",
      "confidence": 0.0-1.0,
      "tone_match": true|false
    }
  ]
}
`;

// -------------------------------
// 🔹 UTILITIES
// -------------------------------

function validateOFCs(ofcs) {
  return ofcs.filter(ofc => {
    const hasCitation =
      /\[cite:.*?\]/i.test(ofc.text) || ofc.source !== "Verification Required";
    const toneOk = /^(Implement|Develop|Conduct|Install|Establish|Ensure)/i.test(ofc.text);
    const concise = ofc.text.split(" ").length <= 40;
    return hasCitation && toneOk && concise;
  });
}

// -------------------------------
// 🔹 MAIN FUNCTION
// -------------------------------

async function generateOFCsForMissing() {
  console.log("🔍 Fetching vulnerabilities with < 3 OFCs...");

  // 1️⃣ Get vulnerabilities missing OFCs
  const { data: vulns, error } = await supabase.rpc("get_vulns_missing_ofcs"); // <-- or replace with your query
  if (error) throw new Error(`Supabase RPC error: ${error.message}`);
  if (!vulns || vulns.length === 0) {
    console.log("✅ No vulnerabilities need new OFCs.");
    return;
  }

  for (const vuln of vulns) {
    console.log(`🧠 Generating OFCs for: ${vuln.id} - ${vuln.vulnerability}`);

    const userPrompt = `
VULNERABILITY: "${vuln.vulnerability}"
EXISTING OFCS: ${JSON.stringify(vuln.existing_ofcs || [], null, 2)}
TASK:
Provide enough new OFCs so total = 3.
Each OFC must align with tone and citation rules.
Return only JSON as defined.
`;

    try {
      // 2️⃣ Send to Ollama
      const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL_NAME,
          stream: false,
          temperature: TEMPERATURE,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt }
          ]
        })
      });

      const raw = await response.json();
      let result;
      try {
        result = JSON.parse(raw.response);
      } catch (e) {
        console.error("❌ JSON parse error, skipping vuln:", vuln.id);
        continue;
      }

      // 3️⃣ Validate
      const valid = validateOFCs(result.ofcs);
      const flagged = result.ofcs.filter(x => !valid.includes(x));

      // 4️⃣ Insert into Supabase
      if (valid.length) {
        const { error: insertErr } = await supabase.from("ofc_proposals").insert(
          valid.map(ofc => ({
            vulnerability_id: vuln.id,
            text: ofc.text,
            source: ofc.source,
            confidence: ofc.confidence || 0.7,
            tone_match: ofc.tone_match,
            verified_source: !/\[cite: Verification Required\]/i.test(ofc.text),
            requires_review: false,
            model_version: MODEL_NAME,
            created_at: new Date().toISOString()
          }))
        );
        if (insertErr) console.error("❌ Insert error:", insertErr.message);
        else console.log(`✅ Inserted ${valid.length} OFCs for ${vuln.id}`);
      }

      if (flagged.length) {
        const { error: flaggedErr } = await supabase.from("ofc_proposals").insert(
          flagged.map(ofc => ({
            vulnerability_id: vuln.id,
            text: ofc.text,
            source: ofc.source,
            confidence: ofc.confidence || 0.5,
            tone_match: ofc.tone_match,
            verified_source: false,
            requires_review: true,
            model_version: MODEL_NAME,
            created_at: new Date().toISOString()
          }))
        );
        if (flaggedErr) console.error("❌ Flagged insert error:", flaggedErr.message);
        else console.log(`⚠️ Flagged ${flagged.length} OFCs for review.`);
      }
    } catch (err) {
      console.error("💥 Generation failed:", err.message);
    }
  }
}

// -------------------------------
// 🔹 RUN
// -------------------------------
generateOFCsForMissing()
  .then(() => console.log("🏁 OFC generation complete."))
  .catch(err => console.error("Fatal error:", err));
