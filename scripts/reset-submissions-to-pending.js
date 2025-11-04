/**
 * Reset submissions to pending_review status for JSON files in processed folder
 * This updates submissions in Supabase to allow re-review after vulnerability statement updates
 */

const fs = require('fs').promises
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.join(__dirname, '../vofc-viewer/.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const PROCESSED_DIR = path.join(process.env.USERPROFILE || process.env.HOME, 'AppData', 'Local', 'Ollama', 'data', 'processed')

async function resetSubmissionsToPending() {
  try {
    console.log('📂 Scanning processed folder:', PROCESSED_DIR)
    
    // Check if directory exists
    try {
      await fs.access(PROCESSED_DIR)
    } catch {
      console.error(`❌ Processed folder not found: ${PROCESSED_DIR}`)
      return
    }
    
    // Read all JSON files
    const files = await fs.readdir(PROCESSED_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json'))
    
    console.log(`📄 Found ${jsonFiles.length} JSON file(s)\n`)
    
    if (jsonFiles.length === 0) {
      console.log('✅ No JSON files to process')
      return
    }
    
    let processed = 0
    let updated = 0
    let notFound = 0
    let errors = 0
    
    for (const jsonFile of jsonFiles) {
      try {
        console.log(`\n🔄 Processing: ${jsonFile}`)
        
        // Read JSON to get filename
        const jsonPath = path.join(PROCESSED_DIR, jsonFile)
        const jsonContent = await fs.readFile(jsonPath, 'utf-8')
        const vofcData = JSON.parse(jsonContent)
        
        // Extract filename from JSON data
        const jsonFilename = vofcData.filename || jsonFile.replace(/\.json$/, '')
        const baseFilename = jsonFilename.replace(/\.pdf$/, '').replace(/\.json$/, '')
        const pdfFilename = baseFilename + '.pdf'
        
        console.log(`   📄 Looking for: ${baseFilename} or ${pdfFilename}`)
        
        // Get all submissions and check data field
        const { data: allSubmissions, error: fetchError } = await supabase
          .from('submissions')
          .select('id, status, data, source')
        
        if (fetchError) {
          console.log(`   ⚠️  Fetch error: ${fetchError.message}`)
          errors++
          continue
        }
        
        if (!allSubmissions || allSubmissions.length === 0) {
          console.log(`   ⚠️  No submissions found in database`)
          notFound++
          continue
        }
        
        // Find matching submissions by checking data field content
        const matchingSubmissions = allSubmissions.filter(sub => {
          // Check data field (JSON)
          if (sub.data) {
            try {
              const subData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data
              const docName = subData?.document_name || subData?.filename || ''
              if (docName && (
                docName.toLowerCase().includes(baseFilename.toLowerCase()) ||
                docName.toLowerCase().includes(pdfFilename.toLowerCase()) ||
                baseFilename.toLowerCase().includes(docName.toLowerCase().replace(/\.(pdf|json)$/, ''))
              )) {
                return true
              }
            } catch {}
          }
          
          // Check source field
          if (sub.source && (
            sub.source.toLowerCase().includes(baseFilename.toLowerCase()) ||
            sub.source.toLowerCase().includes(pdfFilename.toLowerCase())
          )) {
            return true
          }
          
          return false
        })
        
        if (matchingSubmissions.length === 0) {
          console.log(`   ⚠️  No matching submission found`)
          notFound++
          continue
        }
        
        // Update each matching submission
        for (const submission of matchingSubmissions) {
          const { error: updateError } = await supabase
            .from('submissions')
            .update({
              status: 'pending_review',
              updated_at: new Date().toISOString()
            })
            .eq('id', submission.id)
          
          if (updateError) {
            console.log(`   ⚠️  Could not update submission ${submission.id}: ${updateError.message}`)
            errors++
          } else {
            console.log(`   ✅ Updated submission ${submission.id} to pending_review (was: ${submission.status || 'unknown'})`)
            updated++
          }
        }
        
        processed++
        
      } catch (error) {
        console.error(`   ❌ Error processing ${jsonFile}: ${error.message}`)
        errors++
      }
    }
    
    console.log('\n📊 Summary:')
    console.log(`   Total files: ${jsonFiles.length}`)
    console.log(`   Processed: ${processed}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Not found: ${notFound}`)
    console.log(`   Errors: ${errors}`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run reset
resetSubmissionsToPending()
  .then(() => {
    console.log('\n✅ Reset to pending_review complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Reset failed:', error)
    process.exit(1)
  })

