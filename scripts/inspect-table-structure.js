#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTableStructure() {
  console.log('🔍 Inspecting table structure...\n');
  
  const tablesToCheck = ['questions', 'vulnerabilities', 'ofcs', 'sectors'];
  
  for (const tableName of tablesToCheck) {
    console.log(`📋 ${tableName} table structure:`);
    
    try {
      // Try to get one record to see the structure
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Error accessing ${tableName}:`, error.message);
      } else if (data && data.length > 0) {
        console.log('✅ Columns found:');
        Object.keys(data[0]).forEach(column => {
          console.log(`   - ${column}: ${typeof data[0][column]}`);
        });
      } else {
        console.log(`⚠️  Table ${tableName} is empty, trying to insert a test record...`);
        
        // Try to insert a minimal record to see what columns are required
        let testData = {};
        if (tableName === 'questions') {
          testData = { question_text: 'Test question' };
        } else if (tableName === 'vulnerabilities') {
          testData = { vulnerability_name: 'Test vulnerability' };
        } else if (tableName === 'ofcs') {
          testData = { ofc_text: 'Test OFC' };
        } else if (tableName === 'sectors') {
          testData = { sector_name: 'Test Sector' };
        }
        
        const { data: insertData, error: insertError } = await supabase
          .from(tableName)
          .insert([testData])
          .select();
        
        if (insertError) {
          console.log(`❌ Insert error for ${tableName}:`, insertError.message);
        } else {
          console.log(`✅ Successfully inserted test record into ${tableName}`);
          console.log('📄 Record structure:');
          console.log(JSON.stringify(insertData[0], null, 2));
          
          // Clean up test record
          if (insertData[0].id) {
            await supabase.from(tableName).delete().eq('id', insertData[0].id);
          } else if (insertData[0].question_id) {
            await supabase.from(tableName).delete().eq('question_id', insertData[0].question_id);
          } else if (insertData[0].vulnerability_id) {
            await supabase.from(tableName).delete().eq('vulnerability_id', insertData[0].vulnerability_id);
          } else if (insertData[0].ofc_id) {
            await supabase.from(tableName).delete().eq('ofc_id', insertData[0].ofc_id);
          } else if (insertData[0].sector_id) {
            await supabase.from(tableName).delete().eq('sector_id', insertData[0].sector_id);
          }
        }
      }
    } catch (err) {
      console.log(`❌ Error with ${tableName}:`, err.message);
    }
    
    console.log(''); // Add spacing
  }
}

inspectTableStructure().catch(console.error);






