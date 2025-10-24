import { createClient } from '@supabase/supabase-js';
import { resolveCitations } from "./citeResolver.js";
import { linkOFCtoSource } from '../VOFC/vofcService.js';
import { ollamaChat } from '../../adapters/ollamaClient.js';

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Analyze an OFC for missing citations or vague text.
 * Auto-suggest improvements with authoritative context.
 */
export async function enhanceOFC(ofcId) {
  // Fetch the OFC text
  const { data: ofc, error } = await supabase
    .from('options_for_consideration')
    .select('option_text')
    .eq('id', ofcId)
    .single();

  if (error) throw new Error('OFC not found.');

  // Ask the AI model for improvement
  const prompt = `
Review the following Option for Consideration text for clarity, strength, and source alignment.
- Identify where authoritative citations could be added.
- Suggest refined, actionable phrasing.
Return JSON: { "enhanced_text": "...", "suggested_citations": [#,#,...] }

OFC Text:
${ofc.option_text}
`;

  const response = await ollamaChat([
    { role: "user", content: prompt }
  ], { json: true });
  const enhancedText = response.enhanced_text;
  const citations = response.suggested_citations || [];

  // Update the OFC with improved text
  await supabase
    .from('options_for_consideration')
    .update({ option_text: enhancedText })
    .eq('id', ofcId);

  // Link any newly suggested citations
  for (const ref of citations) await linkOFCtoSource(ofcId, ref);

  // Validate citations in the final text
  await resolveCitations(ofcId, enhancedText);

  return { success: true, enhancedText, citationsLinked: citations.length };
}
