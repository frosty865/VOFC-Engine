# Assessment Questions for VOFC System

## Physical Security Questions

1. **Are security cameras properly positioned and functioning to monitor critical areas?**
2. **Is access control properly implemented and functioning at all entry points?**
3. **Are intrusion detection and alarm systems properly installed and operational?**
4. **Is perimeter lighting adequate and properly maintained for security purposes?**
5. **Are perimeter barriers and fencing adequate and properly maintained?**

## Personnel Security Questions

6. **Is security personnel properly trained and positioned to monitor facility security?**
7. **Are background checks conducted for all personnel with access to sensitive areas?**
8. **Is there a clear chain of command and reporting structure for security personnel?**

## Operational Security Questions

9. **Are fire safety systems properly installed and regularly tested?**
10. **Are backup power systems properly installed and regularly tested?**
11. **Are emergency communication systems properly installed and functional?**
12. **Are emergency evacuation procedures clearly posted and regularly practiced?**

## Cybersecurity Questions

13. **Are cybersecurity measures properly implemented and regularly updated?**
14. **Are network security controls properly configured and monitored?**
15. **Are data backup and recovery procedures properly implemented?**

## General Security Questions

16. **Are security policies and procedures clearly documented and communicated?**
17. **Are security incidents properly reported and investigated?**
18. **Are security assessments conducted regularly and findings addressed?**

---

## How to Add These to Your Database

### Option 1: Using Supabase Dashboard
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/wivohgbuuwxoyfyzntsd
2. Navigate to Table Editor
3. Find or create the `questions` table
4. Add each question as a new row

### Option 2: Using SQL Editor
1. Go to SQL Editor in your Supabase dashboard
2. Run this SQL:

```sql
-- Create questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    sector_id INTEGER DEFAULT 1,
    technology_class TEXT,
    discipline TEXT,
    question_type TEXT DEFAULT 'assessment',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert assessment questions
INSERT INTO questions (question_text, technology_class, discipline) VALUES
('Are security cameras properly positioned and functioning to monitor critical areas?', 'Physical Security', 'Physical Security'),
('Is access control properly implemented and functioning at all entry points?', 'Physical Security', 'Physical Security'),
('Are intrusion detection and alarm systems properly installed and operational?', 'Physical Security', 'Physical Security'),
('Is perimeter lighting adequate and properly maintained for security purposes?', 'Physical Security', 'Physical Security'),
('Are perimeter barriers and fencing adequate and properly maintained?', 'Physical Security', 'Physical Security'),
('Is security personnel properly trained and positioned to monitor facility security?', 'Physical Security', 'Personnel Security'),
('Are background checks conducted for all personnel with access to sensitive areas?', 'Personnel Security', 'Personnel Security'),
('Is there a clear chain of command and reporting structure for security personnel?', 'Personnel Security', 'Personnel Security'),
('Are fire safety systems properly installed and regularly tested?', 'Safety Systems', 'Operational Security'),
('Are backup power systems properly installed and regularly tested?', 'Infrastructure', 'Operational Security'),
('Are emergency communication systems properly installed and functional?', 'Communication Systems', 'Operational Security'),
('Are emergency evacuation procedures clearly posted and regularly practiced?', 'Safety Systems', 'Operational Security'),
('Are cybersecurity measures properly implemented and regularly updated?', 'Information Technology', 'Cybersecurity'),
('Are network security controls properly configured and monitored?', 'Information Technology', 'Cybersecurity'),
('Are data backup and recovery procedures properly implemented?', 'Information Technology', 'Cybersecurity'),
('Are security policies and procedures clearly documented and communicated?', 'General', 'General Security'),
('Are security incidents properly reported and investigated?', 'General', 'General Security'),
('Are security assessments conducted regularly and findings addressed?', 'General', 'General Security');
```

### Option 3: Using the Edge Function
You can also use your deployed `generate-question-i18n` function to generate assessment questions from vulnerability descriptions:

```javascript
// Example usage
const { data, error } = await supabase.functions.invoke('generate-question-i18n', {
  body: { text: "security cameras are not working properly" }
});
// Returns: { en: "Are security cameras properly positioned and functioning to monitor critical areas?", es: "¿Están las cámaras de seguridad posicionadas y funcionando correctamente para monitorear áreas críticas?" }
```

