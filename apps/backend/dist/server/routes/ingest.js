import { Router } from "express";
import { processAssessmentText } from "../services/extractService.js";
export const ingest = Router();
ingest.post("/", async (req, res) => {
    try {
        const { text, assessment_id } = req.body || {};
        if (!text || typeof text !== "string")
            return res.status(400).json({ error: "text is required" });
        const out = await processAssessmentText(text, assessment_id);
        res.json(out);
    }
    catch (e) {
        res.status(500).json({ error: e.message || "ingest failed" });
    }
});
