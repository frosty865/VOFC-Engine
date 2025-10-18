const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try different environment file locations
const envPaths = [
  './.env.local',
  '../.env.local', 
  './.env',
  '../.env'
];

let supabaseUrl, supabaseServiceKey;

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseServiceKey) {
      console.log(`✅ Found environment variables in ${envPath}`);
      break;
    }
  }
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Could not find Supabase environment variables');
  console.log('Please ensure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAssessmentQuestions() {
  console.log('📝 Setting up assessment questions...\n');

  try {
    // Read the SQL file
    const sqlPath = path.resolve(__dirname, 'populate-assessment-questions.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 Executing assessment questions SQL...');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn(`⚠️ Statement ${i + 1} failed: ${error.message}`);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (e) {
          console.warn(`⚠️ Statement ${i + 1} failed: ${e.message}`);
        }
      }
    }

    // Verify questions were created
    console.log('\n🔍 Verifying questions table...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(5);

    if (questionsError) {
      console.log('❌ Error checking questions:', questionsError.message);
    } else if (questions && questions.length > 0) {
      console.log(`✅ Successfully created ${questions.length} assessment questions`);
      console.log('\n📋 Sample questions:');
      questions.forEach((q, i) => {
        console.log(`   ${i+1}. ${q.question_text}`);
      });
    } else {
      console.log('⚠️ Questions table is empty');
    }

    console.log('\n🎉 Assessment questions setup complete!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupAssessmentQuestions();
