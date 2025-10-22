import express from "express";
import ollamaRouter from "./routes/ollama.js";
import documentsRouter from "./routes/documents.js";
import psaSubmissionRouter from "./routes/psa_submission.js";
import approveSubmissionRouter from "./routes/approve_submission.js";

const app = express();
app.use(express.json());
app.use("/api/ollama", ollamaRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/psa", psaSubmissionRouter);
app.use("/api/approve", approveSubmissionRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));