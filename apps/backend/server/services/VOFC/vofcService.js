// vofcService.js
// Core VOFC data service for Supabase
// Provides citation-aware functions with full referential integrity support.

import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch all Options for Consideration (OFCs)
 * with their linked source citations.
 */
export async function fetchVOFC() {
  const { data, error } = await supabase
    .from('options_for_consideration')
    .select(`
      id,
      option_text,
      ofc_sources (
        source_id,
        sources (
          reference_number,
          source_text
        )
      )
    `);

  if (error) {
    console.error('Error fetching VOFCs:', error.message);
    throw new Error('Failed to fetch VOFC data.');
  }

  // Flatten nested structure for convenience
  const formatted = data.map((ofc) => ({
    id: ofc.id,
    option_text: ofc.option_text,
    citations: ofc.ofc_sources?.map((os) => ({
      reference_number: os.sources?.reference_number,
      source_text: os.sources?.source_text
    })) || []
  }));

  return formatted;
}

/**
 * Fetch all sources linked to a specific OFC by its UUID.
 * @param {string} ofcId - UUID of the Option for Consideration.
 */
export async function fetchSourcesForOFC(ofcId) {
  const { data, error } = await supabase
    .from('ofc_sources')
    .select(`
      source_id,
      sources (
        reference_number,
        source_text
      )
    `)
    .eq('ofc_id', ofcId);

  if (error) {
    console.error('Error fetching sources for OFC:', error.message);
    throw new Error('Failed to fetch sources for this OFC.');
  }

  return data.map((entry) => ({
    reference_number: entry.sources.reference_number,
    source_text: entry.sources.source_text
  }));
}

/**
 * Link an existing source to an OFC using its reference number.
 * Automatically avoids duplicate inserts (unique constraint).
 * @param {string} ofcId - UUID of the OFC.
 * @param {number} referenceNumber - Reference number from sources table.
 */
export async function linkOFCtoSource(ofcId, referenceNumber) {
  // 1️⃣ Find the source UUID by reference number
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('id')
    .eq('reference_number', referenceNumber)
    .single();

  if (sourceError || !source) {
    console.error('Source not found:', sourceError?.message);
    throw new Error(`No source found for reference number ${referenceNumber}`);
  }

  // 2️⃣ Link it to the OFC — duplicates will fail silently due to constraint
  const { error: insertError } = await supabase
    .from('ofc_sources')
    .insert([{ ofc_id: ofcId, source_id: source.id }]);

  if (insertError && !insertError.message.includes('duplicate key')) {
    console.error('Error linking OFC to Source:', insertError.message);
    throw new Error('Failed to link source to OFC.');
  }

  return { success: true };
}

/**
 * Unlink (remove) a source from an OFC using the reference number.
 * Does NOT delete the source or OFC themselves.
 * @param {string} ofcId - UUID of the OFC.
 * @param {number} referenceNumber - Reference number from sources table.
 */
export async function unlinkOFCSource(ofcId, referenceNumber) {
  // 1️⃣ Find the source UUID by its reference number
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('id')
    .eq('reference_number', referenceNumber)
    .single();

  if (sourceError || !source) {
    console.error('Source not found:', sourceError?.message);
    throw new Error(`No source found for reference number ${referenceNumber}`);
  }

  // 2️⃣ Delete only the link between OFC and Source
  const { error: deleteError } = await supabase
    .from('ofc_sources')
    .delete()
    .match({ ofc_id: ofcId, source_id: source.id });

  if (deleteError) {
    console.error('Error unlinking OFC and Source:', deleteError.message);
    throw new Error('Failed to unlink source from OFC.');
  }

  return { success: true };
}
