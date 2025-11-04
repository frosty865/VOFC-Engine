#!/usr/bin/env node
/**
 * Reset Admin Panel Logs
 * Clears console logs, database log entries, and resets admin panel state
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found');
  console.log('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAdminLogs() {
  console.log('🧹 Resetting Admin Panel Logs...\n');

  const results = {
    cleared: [],
    errors: [],
  };

  // 1. Clear learning_events table (if it exists and contains admin-related logs)
  try {
    const { data, error } = await supabase
      .from('learning_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a UUID that won't match)
    
    if (error && error.code !== 'PGRST116') {
      // Table might not exist
      if (error.code === '42P01') {
        console.log('⚠️  learning_events table does not exist');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Cleared learning_events table');
      results.cleared.push('learning_events');
    }
  } catch (err) {
    console.log('⚠️  Could not clear learning_events:', err.message);
    results.errors.push({ table: 'learning_events', error: err.message });
  }

  // 2. Clear any audit logs (if audit_logs table exists)
  try {
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error && error.code !== 'PGRST116') {
      if (error.code === '42P01') {
        console.log('⚠️  audit_logs table does not exist');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Cleared audit_logs table');
      results.cleared.push('audit_logs');
    }
  } catch (err) {
    console.log('⚠️  Could not clear audit_logs:', err.message);
    results.errors.push({ table: 'audit_logs', error: err.message });
  }

  // 3. Clear any admin activity logs (if admin_activity table exists)
  try {
    const { error } = await supabase
      .from('admin_activity')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error && error.code !== 'PGRST116') {
      if (error.code === '42P01') {
        console.log('⚠️  admin_activity table does not exist');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Cleared admin_activity table');
      results.cleared.push('admin_activity');
    }
  } catch (err) {
    console.log('⚠️  Could not clear admin_activity:', err.message);
    results.errors.push({ table: 'admin_activity', error: err.message });
  }

  // 4. Clear processing progress file
  const progressFile = path.join(
    process.env.OLLAMA_DATA_DIR || 'C:\\Users\\frost\\AppData\\Local\\Ollama\\data',
    'processing_progress.json'
  );
  
  try {
    if (fs.existsSync(progressFile)) {
      fs.writeFileSync(progressFile, JSON.stringify({
        status: 'idle',
        message: 'No active processing',
        current_file: null,
        progress_percent: 0,
        timestamp: new Date().toISOString(),
      }, null, 2));
      console.log('✅ Cleared processing_progress.json');
      results.cleared.push('processing_progress.json');
    } else {
      console.log('⚠️  processing_progress.json not found');
    }
  } catch (err) {
    console.log('⚠️  Could not clear processing_progress.json:', err.message);
    results.errors.push({ file: 'processing_progress.json', error: err.message });
  }

  // 5. Note about parsing & processing statistics
  // Parsing stats are computed on-the-fly from submissions table counts
  // They show: total_submissions, pending_review, approved, rejected, total_vulnerabilities, total_ofcs
  // These are query results, not stored data, so they can't be "reset" - they reflect current DB state
  console.log('\n💡 Parsing & Processing Statistics Note:');
  console.log('   Parsing stats (total_submissions, pending_review, approved, etc.)');
  console.log('   are computed on-the-fly from the submissions table.');
  console.log('   They reflect the current database state, not stored statistics.');
  console.log('   To "reset" these, you would need to delete submissions data.');
  console.log('   (These are live counts, not cached values)');
  
  // 6. Note about backend statistics
  // Backend stats (requests_per_minute, avg_response_time) are computed on-the-fly
  // They will reset automatically when Flask restarts
  console.log('\n💡 Backend Statistics Note:');
  console.log('   Backend stats (requests_per_minute, avg_response_time) are computed');
  console.log('   on-the-fly and will reset when Flask server restarts.');
  console.log('   Restart Flask to reset these counters.');

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Reset Summary:');
  console.log(`   Cleared: ${results.cleared.length} items`);
  console.log(`   Errors: ${results.errors.length} items`);
  
  if (results.cleared.length > 0) {
    console.log('\n✅ Successfully cleared:');
    results.cleared.forEach(item => console.log(`   - ${item}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    results.errors.forEach(err => console.log(`   - ${err.table || err.file}: ${err.error}`));
  }

  console.log('\n💡 Note: Browser console logs must be cleared manually:');
  console.log('   - Press Ctrl+L or right-click console -> Clear console');
  console.log('   - Or close and reopen DevTools');
  
  console.log('\n💡 To clear browser local storage:');
  console.log('   - Open DevTools -> Application -> Local Storage');
  console.log('   - Right-click -> Clear');
}

resetAdminLogs()
  .then(() => {
    console.log('\n✅ Admin panel logs reset complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error resetting logs:', err);
    process.exit(1);
  });

