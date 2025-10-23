import { supabase } from "../adapters/supabaseClient.js";
import { v4 as uuid } from "uuid";
export async function persistExtraction(aid, ex) {
    const { error: aerr } = await supabase
        .from("assessments")
        .upsert([{ id: aid, sector_id: ex.sector_id, subsector_id: ex.subsector_id ?? null, title: "AI Imported" }], { onConflict: "id" });
    if (aerr)
        throw aerr;
    const vulns = ex.vulnerabilities.map(v => ({
        id: uuid(),
        vulnerability: v.text,
        discipline: v.discipline,
        source: v.source ?? "AI",
        sector_id: ex.sector_id,
        subsector_id: ex.subsector_id ?? null
    }));
    if (vulns.length) {
        const { error } = await supabase.from("vulnerabilities").insert(vulns);
        if (error)
            throw error;
    }
    const ofcs = ex.options_for_consideration.map(o => ({
        id: uuid(),
        option_text: o.text,
        discipline: o.discipline,
        source: o.source ?? "AI",
        sector_id: ex.sector_id,
        subsector_id: ex.subsector_id ?? null
    }));
    if (ofcs.length) {
        const { error } = await supabase.from("options_for_consideration").insert(ofcs);
        if (error)
            throw error;
    }
    const links = [];
    for (const l of ex.links) {
        const vuln = vulns.find(v => v.vulnerability === l.vulnerability_text);
        const ofc = ofcs.find(o => o.option_text === l.ofc_text);
        if (vuln && ofc)
            links.push({ vulnerability_id: vuln.id, ofc_id: ofc.id, link_type: "direct", confidence_score: 1.0 });
    }
    if (links.length) {
        const { error } = await supabase.from("vulnerability_ofc_links").insert(links);
        if (error)
            throw error;
    }
    return { vulns: vulns.length, ofcs: ofcs.length };
}
