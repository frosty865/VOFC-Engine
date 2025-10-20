import { extractFromText } from "./ingestService.js";
import { persistExtraction } from "./persistService.js";
import { v4 as uuid } from "uuid";

export async function processAssessmentText(text: string, assessmentId?: string) {
  const id = assessmentId ?? uuid();
  const extraction = await extractFromText(text);
  const result = await persistExtraction(id, extraction);
  return { assessment_id: id, ...result, sector_id: extraction.sector_id, subsector_id: extraction.subsector_id ?? null };
}
