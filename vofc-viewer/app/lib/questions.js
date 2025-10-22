import { supabase } from './supabaseClient';

export async function fetchQuestions(sectorId = 1) {
  const { data, error } = await supabase
    .from('questions')
    .select(`
      question_id,
      question_text,
      parent_id,
      conditional_trigger,
      technology_class,
      vulnerabilities(vulnerability_name),
      question_ofc_map(ofcs(ofc_text, technology_class, source_doc))
    `)
    .eq('sector_id', sectorId)
    .order('display_order');

  if (error) throw error;
  return data;
}

export async function fetchQuestionById(questionId) {
  const { data, error } = await supabase
    .from('questions')
    .select(`
      question_id,
      question_text,
      parent_id,
      conditional_trigger,
      technology_class,
      vulnerabilities(vulnerability_name),
      question_ofc_map(ofcs(ofc_text, technology_class, source_doc))
    `)
    .eq('question_id', questionId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchSectors() {
  const { data, error } = await supabase
    .from('sectors')
    .select('sector_id, sector_name, description')
    .order('sector_name');

  if (error) throw error;
  return data;
}

export async function fetchVulnerabilities() {
  const { data, error } = await supabase
    .from('vulnerabilities')
    .select('vulnerability_id, vulnerability_name, description')
    .order('vulnerability_name');

  if (error) throw error;
  return data;
}

export async function fetchOFCs() {
  const { data, error } = await supabase
    .from('ofcs')
    .select('ofc_id, ofc_text, technology_class, source_doc, effort_level, effectiveness')
    .order('ofc_text');

  if (error) throw error;
  return data;
}
