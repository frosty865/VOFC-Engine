import express from 'express';
import { createClient } from '@supabase/supabase-js';
const app = express();
const PORT = process.env.PORT || 3001;
// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
// Middleware
app.use(express.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Example API endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend server is running!' });
});
// Start server
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
export default app;
