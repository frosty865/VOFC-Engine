import { createClient } from '@supabase/supabase-js';
import { linkOFCtoSource } from '../VOFC/vofcService.js';

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Scan OFC text for [cite: #] patterns and link them to sources automatically.
 * @param {string} ofcId - UUID of the Option for Consideration.
 * @param {string} optionText - Full OFC text.
 */
export async function resolveCitations(ofcId, optionText) {
  const matches = [...optionText.matchAll(/\[cite:\s*([\d, ]+)\]/g)];
  if (!matches.length) return { success: true, linked: 0 };

  const referenceNumbers = matches
    .map((m) => m[1].split(',').map((n) => parseInt(n.trim())))
    .flat()
    .filter((n) => !isNaN(n));

  let linked = 0;
  for (const ref of referenceNumbers) {
    try {
      await linkOFCtoSource(ofcId, ref);
      linked++;
    } catch (err) {
      console.warn(`⚠️ Failed to link [cite: ${ref}] → ${err.message}`);
    }
  }
  return { success: true, linked };
}

/**
 * Shortcut function to resolve citations for an OFC object.
 * Automatically extracts id and option_text from the OFC object.
 * @param {Object} ofc - OFC object with id and option_text properties
 * @returns {Promise<Object>} Result with success status and linked count
 * 
 * @example
 * // Usage with OFC object
 * const result = await resolveCitationsForOFC(ofc);
 * console.log(`Linked ${result.linked} citations`);
 */
export async function resolveCitationsForOFC(ofc) {
  if (!ofc || !ofc.id || !ofc.option_text) {
    throw new Error('OFC object must have id and option_text properties');
  }
  
  return await resolveCitations(ofc.id, ofc.option_text);
}

/**
 * Batch resolve citations for multiple OFCs.
 * @param {Array<Object>} ofcs - Array of OFC objects
 * @returns {Promise<Object>} Summary of all citation resolutions
 * 
 * @example
 * // Usage with multiple OFCs
 * const results = await resolveCitationsBatch(ofcs);
 * console.log(`Total linked: ${results.totalLinked} citations across ${results.processed} OFCs`);
 */
export async function resolveCitationsBatch(ofcs) {
  if (!Array.isArray(ofcs)) {
    throw new Error('Input must be an array of OFC objects');
  }

  let totalLinked = 0;
  let processed = 0;
  const errors = [];

  for (const ofc of ofcs) {
    try {
      const result = await resolveCitationsForOFC(ofc);
      totalLinked += result.linked;
      processed++;
    } catch (err) {
      errors.push({ ofcId: ofc.id, error: err.message });
      console.error(`Failed to process OFC ${ofc.id}:`, err.message);
    }
  }

  return {
    success: true,
    totalLinked,
    processed,
    totalOFCs: ofcs.length,
    errors: errors.length > 0 ? errors : undefined
  };
}