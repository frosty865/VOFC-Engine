import { z } from "zod";
const ExtractSchema = z.object({
    sector_id: z.string(),
    subsector_id: z.string().nullable().optional(),
    vulnerabilities: z.array(z.object({
        text: z.string().min(3),
        discipline: z.string().min(2),
        source: z.string().optional().nullable()
    })).default([]),
    options_for_consideration: z.array(z.object({
        text: z.string().min(3),
        discipline: z.string().min(2),
        source: z.string().optional().nullable()
    })).default([]),
    links: z.array(z.object({
        vulnerability_text: z.string().min(3),
        ofc_text: z.string().min(3)
    })).default([])
});
export function parseExtraction(raw) {
    return ExtractSchema.parse(raw);
}
