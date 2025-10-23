import { ollamaChat } from "../adapters/ollamaClient.js";
import { parseExtraction } from "../parsers/vofcParser.js";
import fs from "fs/promises";
import path from "path";
async function loadPrompt(name) {
    return fs.readFile(path.join(process.cwd(), "apps", "backend", "server", "prompts", name), "utf8");
}
export async function extractFromText(input) {
    const system = (await loadPrompt("vofc_extract.prompt.txt")).trim();
    const resp = await ollamaChat([
        { role: "system", content: system },
        { role: "user", content: input.slice(0, 16000) }
    ]);
    let parsed;
    try {
        parsed = JSON.parse(resp);
    }
    catch {
        throw new Error("Model did not return valid JSON");
    }
    return parseExtraction(parsed);
}
