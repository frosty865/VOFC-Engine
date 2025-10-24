#!/usr/bin/env node

/**
 * Production Database Fix Script
 * This script applies the necessary database schema fixes to your production Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProductionDatabase() {
  console.log('🔧 Fixing Production Database Schema...\n');
  
  try {
    // 1. Check current sources table structure
    console.log('📋 Checking sources table structure...');
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .limit(1);
    
    if (sourcesError) {
      console.error('❌ Error accessing sources table:', sourcesError.message);
      return;
    }
    
    if (sources && sources.length > 0) {
      const columns = Object.keys(sources[0]);
      console.log('📊 Current sources table columns:', columns);
      
      // Check if we need to rename columns
      const hasOldColumns = columns.includes('reference number') || columns.includes('source');
      const hasNewColumns = columns.includes('reference_number') && columns.includes('source_text');
      
      if (hasOldColumns && !hasNewColumns) {
        console.log('⚠️  Found old column names. You need to rename them manually in Supabase dashboard.');
        console.log('📝 Run these SQL commands in your Supabase SQL editor:');
        console.log('   ALTER TABLE sources RENAME COLUMN "reference number" TO reference_number;');
        console.log('   ALTER TABLE sources RENAME COLUMN "source" TO source_text;');
        console.log('');
      } else if (hasNewColumns) {
        console.log('✅ Sources table has correct column names');
      } else {
        console.log('❓ Unexpected column structure. Please check manually.');
      }
    }
    
    // 2. Check if sectors table exists
    console.log('\n📋 Checking sectors table...');
    const { data: sectors, error: sectorsError } = await supabase
      .from('sectors')
      .select('*')
      .limit(1);
    
    if (sectorsError && sectorsError.code === 'PGRST116') {
      console.log('⚠️  Sectors table does not exist');
      console.log('📝 Run this SQL in your Supabase SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subsectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sector_id UUID REFERENCES sectors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to sectors" ON sectors FOR SELECT USING (true);
CREATE POLICY "Allow public read access to subsectors" ON subsectors FOR SELECT USING (true);
CREATE POLICY "Allow public read access to disciplines" ON disciplines FOR SELECT USING (true);

-- Insert default data
INSERT INTO sectors (id, name, description) VALUES 
    (gen_random_uuid(), 'Critical Infrastructure', 'Essential services and systems'),
    (gen_random_uuid(), 'Cybersecurity', 'Information security and digital systems'),
    (gen_random_uuid(), 'Physical Security', 'Physical protection and access control'),
    (gen_random_uuid(), 'Emergency Management', 'Disaster response and preparedness'),
    (gen_random_uuid(), 'Personnel Security', 'Human resources and background checks')
ON CONFLICT DO NOTHING;
      `);
    } else if (sectorsError) {
      console.error('❌ Error accessing sectors table:', sectorsError.message);
    } else {
      console.log('✅ Sectors table exists');
    }
    
    // 3. Test the problematic queries
    console.log('\n🧪 Testing problematic queries...');
    
    // Test subsectors query
    console.log('\n📋 Testing subsectors query...');
    try {
      const { data: subsectorsTest, error: subsectorsTestError } = await supabase
        .from('subsectors')
        .select('*')
        .order('name', { ascending: true });
      
      if (subsectorsTestError) {
        console.log('❌ Subsectors query failing:', subsectorsTestError.message);
        if (subsectorsTestError.message.includes('relation "subsectors" does not exist')) {
          console.log('💡 Solution: Create the subsectors table using the SQL above');
        }
      } else {
        console.log('✅ Subsectors query working');
        console.log(`   Found ${subsectorsTest.length} subsectors`);
      }
    } catch (err) {
      console.log('❌ Subsectors query error:', err.message);
    }
    
    // Test OFCs query
    console.log('\n📋 Testing OFCs query...');
    try {
      const { data: ofcsTest, error: ofcsTestError } = await supabase
        .from('options_for_consideration')
        .select('*, ofc_sources(*, sources(*))')
        .order('id', { ascending: true })
        .limit(5);
      
      if (ofcsTestError) {
        console.log('❌ OFCs query failing:', ofcsTestError.message);
        if (ofcsTestError.message.includes('column') && ofcsTestError.message.includes('does not exist')) {
          console.log('💡 Solution: Rename the source table columns using the SQL above');
        }
      } else {
        console.log('✅ OFCs query working');
      }
    } catch (err) {
      console.log('❌ OFCs query error:', err.message);
    }
    
    console.log('\n🎉 Database check complete!');
    console.log('\n📋 Next steps:');
    console.log('1. If you see SQL commands above, run them in your Supabase SQL editor');
    console.log('2. After applying the fixes, run this script again to verify');
    console.log('3. Then deploy to Vercel with: vercel --prod');
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error.message);
  }
}

// Run the database fix
fixProductionDatabase();
