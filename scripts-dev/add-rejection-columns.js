/**
 * Script to add rejection-related columns to submissions table
 * Run this with: node scripts-dev/add-rejection-columns.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addRejectionColumns() {
  console.log('🔧 Adding rejection columns to submissions table...\n');

  const columns = [
    {
      name: 'reviewed_at',
      type: 'timestamptz',
      nullable: true,
      description: 'Timestamp when submission was reviewed'
    },
    {
      name: 'reviewed_by',
      type: 'uuid',
      nullable: true,
      description: 'User ID who reviewed the submission',
      reference: 'auth.users(id) ON DELETE SET NULL'
    },
    {
      name: 'rejection_reason',
      type: 'text',
      nullable: true,
      description: 'Reason for rejection if submission was rejected'
    },
    {
      name: 'review_comments',
      type: 'text',
      nullable: true,
      description: 'General comments from reviewer'
    }
  ];

  for (const column of columns) {
    try {
      // Check if column already exists
      const { data: existing, error: checkError } = await supabase.rpc('check_column_exists', {
        table_name: 'submissions',
        column_name: column.name
      }).catch(() => ({ data: null, error: { message: 'Function not available' } }));

      // Try to add column using raw SQL
      const sql = `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'submissions' 
            AND column_name = '${column.name}'
          ) THEN
            ALTER TABLE submissions 
            ADD COLUMN ${column.name} ${column.type}${column.nullable ? '' : ' NOT NULL'};
            
            ${column.reference ? `ALTER TABLE submissions ADD CONSTRAINT submissions_${column.name}_fkey FOREIGN KEY (${column.name}) REFERENCES ${column.reference.split(' ON')[0]};` : ''}
          END IF;
        END $$;
      `;

      // Use Supabase REST API to execute SQL
      const { error: sqlError } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
        // Fallback: Try direct SQL via REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql_query: sql })
        });
        return { error: response.ok ? null : new Error('SQL execution failed') };
      });

      if (sqlError && !sqlError.message?.includes('already exists')) {
        console.log(`⚠️  Could not add ${column.name} via RPC, trying alternative method...`);
        
        // Alternative: Use Supabase SQL editor endpoint or direct connection
        console.log(`📝 Column ${column.name} SQL:`);
        console.log(`   ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}${column.nullable ? '' : ' NOT NULL'};`);
        console.log(`   Please run this SQL manually in Supabase SQL editor if needed.\n`);
      } else {
        console.log(`✅ Column ${column.name} added successfully`);
      }
    } catch (error) {
      console.log(`⚠️  Column ${column.name}: ${error.message}`);
      console.log(`   Manual SQL: ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}${column.nullable ? '' : ' NOT NULL'};`);
    }
  }

  console.log('\n✅ Migration complete!');
  console.log('\n📋 If columns were not added automatically, run these SQL commands in Supabase SQL editor:');
  console.log(`
    -- Add rejection columns
    ALTER TABLE submissions 
    ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
    ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejection_reason text,
    ADD COLUMN IF NOT EXISTS review_comments text;

    -- Add index for faster queries
    CREATE INDEX IF NOT EXISTS idx_submissions_reviewed_at ON submissions(reviewed_at);
    CREATE INDEX IF NOT EXISTS idx_submissions_reviewed_by ON submissions(reviewed_by);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
  `);
}

addRejectionColumns().catch(console.error);

