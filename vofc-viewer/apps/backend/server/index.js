import express from "express";
import ollamaRouter from "./routes/ollama.js";
import documentsRouter from "./routes/documents.js";
import psaSubmissionRouter from "./routes/psa_submission.js";
import approveSubmissionRouter from "./routes/approve_submission.js";
import aiToolsRouter from "./routes/aiTools.js";

const app = express();
app.use(express.json());
app.use("/api/ollama", ollamaRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/psa", psaSubmissionRouter);
app.use("/api/approve", approveSubmissionRouter);
app.use("/api/ai-tools", aiToolsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));