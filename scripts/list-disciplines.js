#!/usr/bin/env node

/**
 * List all disciplines from the database
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../vofc-viewer/vofc-viewer/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listDisciplines() {
  console.log('📋 Fetching disciplines from database...\n');
  
  try {
    const { data: disciplines, error } = await supabase
      .from('disciplines')
      .select('*')
      .order('category, name', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching disciplines:', error.message);
      process.exit(1);
    }
    
    if (!disciplines || disciplines.length === 0) {
      console.log('⚠️  No disciplines found in the database');
      return;
    }
    
    console.log(`✅ Found ${disciplines.length} discipline(s):\n`);
    
    // Group by category
    const grouped = disciplines.reduce((acc, discipline) => {
      const category = discipline.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(discipline);
      return acc;
    }, {});
    
    // Display grouped by category
    Object.keys(grouped).sort().forEach(category => {
      console.log(`📁 ${category}`);
      grouped[category].forEach(discipline => {
        const status = discipline.is_active ? '✅' : '❌';
        const id = discipline.id;
        const name = discipline.name;
        const description = discipline.description ? ` - ${discipline.description}` : '';
        console.log(`   ${status} [${id}] ${name}${description}`);
      });
      console.log('');
    });
    
    // Summary
    const activeCount = disciplines.filter(d => d.is_active).length;
    const inactiveCount = disciplines.length - activeCount;
    console.log('='.repeat(60));
    console.log(`Total: ${disciplines.length} disciplines`);
    console.log(`Active: ${activeCount}`);
    console.log(`Inactive: ${inactiveCount}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
listDisciplines();

