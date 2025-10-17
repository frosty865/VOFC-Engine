# VOFC Viewer Setup Instructions

## Environment Variables Setup

You need to create a `.env.local` file in the project root with your Supabase credentials:

```bash
# Create .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Installation and Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Database Schema

The viewer now works with the following tables:
- `parent_questions` - Main questions from VOFC
- `child_questions` - Conditional child questions
- `answers` - Answer options and OFC mitigations
- `vulnerabilities` - Security vulnerabilities
- `conditional_relationships` - Links between questions, answers, and vulnerabilities

## Features

- **Question Browser**: View all parent questions organized by domain
- **Vulnerability Explorer**: Browse security vulnerabilities
- **OFC Viewer**: View Options for Consideration (mitigations)
- **Search and Filter**: Search across all content and filter by domain
- **Responsive Design**: Works on desktop and mobile

## Troubleshooting

If you see "Using mock data" in the console, check:
1. Environment variables are set correctly
2. Supabase project is accessible
3. Database tables exist and have data

The application will fall back to mock data if the database connection fails.
