import { createClient } from '@supabase/supabase-js';
import { linkOFCtoSource } from '../VOFC/vofcService.js';
import { ollamaChat } from '../../adapters/ollamaClient.js';

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function discoverNewVOFC(sector, inputText) {
  const prompt = `
Analyze the following content for vulnerabilities and mitigation guidance
relevant to the ${sector} sector.

Output JSON array:
[
  {
    "category": "...",
    "vulnerability": "...",
    "options_for_consideration": "...",
    "suggested_citations": [#,#]
  }
]

Text:
${inputText}
`;

  const vofcList = await ollamaChat([
    { role: "user", content: prompt }
  ], { json: true });

  for (const vofc of vofcList) {
    const { data, error } = await supabase
      .from('options_for_consideration')
      .insert([{ option_text: vofc.options_for_consideration }])
      .select()
      .single();

    if (!error && data) {
      for (const cite of vofc.suggested_citations || [])
        await linkOFCtoSource(data.id, cite);
    }
  }

  return { success: true, inserted: vofcList.length };
}
