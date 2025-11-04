/**
 * Sync JSON files from processed folder to Supabase submissions table
 * This script reads JSON files from the processed folder and creates/updates
 * submission records in Supabase if they don't exist.
 */

const fs = require('fs').promises
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.join(__dirname, '../vofc-viewer/.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const PROCESSED_DIR = path.join(process.env.USERPROFILE || process.env.HOME, 'AppData', 'Local', 'Ollama', 'data', 'processed')

async function syncProcessedFiles() {
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
    
    console.log(`📄 Found ${jsonFiles.length} JSON file(s)`)
    
    if (jsonFiles.length === 0) {
      console.log('✅ No JSON files to sync')
      return
    }
    
    let synced = 0
    let created = 0
    let updated = 0
    let errors = 0
    
    for (const jsonFile of jsonFiles) {
      try {
        const jsonPath = path.join(PROCESSED_DIR, jsonFile)
        const jsonContent = await fs.readFile(jsonPath, 'utf-8')
        const vofcData = JSON.parse(jsonContent)
        
        // Extract filename without .json extension
        const filename = jsonFile.replace(/\.json$/, '')
        const pdfFilename = filename + '.pdf'
        
        // Check if submission already exists by filename
        const { data: existing, error: queryError } = await supabase
          .from('submissions')
          .select('id, status, source, data')
          .eq('source', 'file_processing')
          .limit(1)
        
        if (queryError) {
          console.error(`❌ Error querying submissions: ${queryError.message}`)
        }
        
        // Find by filename in data field
        let existingSubmission = null
        if (existing && Array.isArray(existing)) {
          for (const sub of existing) {
            try {
              const subData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data
              if (subData?.document_name === pdfFilename || subData?.document_name === filename) {
                existingSubmission = sub
                break
              }
            } catch {}
          }
        }
        
        // Extract and normalize vulnerabilities
        let vulnerabilities = Array.isArray(vofcData.vulnerabilities) ? vofcData.vulnerabilities : []
        
        // Ensure each vulnerability has an ID
        vulnerabilities = vulnerabilities.map((vuln, idx) => ({
          ...vuln,
          id: vuln.id || `vuln-${idx + 1}`,
          title: vuln.title || vuln.vulnerability || `Vulnerability ${idx + 1}`
        }))
        
        // Extract OFCs - handle both nested and flat structures
        let ofcs = []
        
        // First, check if OFCs are nested inside vulnerabilities
        if (vulnerabilities.length > 0) {
          vulnerabilities.forEach(vuln => {
            const vulnId = vuln.id || vuln.title || vuln.vulnerability
            const nestedOfcs = vuln.options_for_consideration || []
            
            nestedOfcs.forEach((ofc, ofcIdx) => {
              ofcs.push({
                id: ofc.id || `ofc-${vulnId}-${ofcIdx + 1}`,
                title: ofc.title || ofc.option || ofc.option_text || `OFC ${ofcIdx + 1}`,
                description: ofc.description || ofc.option_text || ofc.option || '',
                linked_vulnerability: vulnId, // Link to parent vulnerability
                sources: ofc.sources || [],
                ...ofc // Include any other fields
              })
            })
          })
        }
        
        // If no nested OFCs found, check for flat structure
        if (ofcs.length === 0 && Array.isArray(vofcData.ofcs)) {
          ofcs = vofcData.ofcs.map((ofc, idx) => ({
            ...ofc,
            id: ofc.id || `ofc-${idx + 1}`,
            title: ofc.title || ofc.option || ofc.option_text || `OFC ${idx + 1}`
          }))
        }
        
        const vulnCount = vulnerabilities.length
        const ofcCount = ofcs.length
        
        // Extract sources
        let sources = []
        if (Array.isArray(vofcData.sources)) {
          sources = vofcData.sources
        } else if (vofcData.sources && typeof vofcData.sources === 'object') {
          sources = Object.values(vofcData.sources)
        }
        
        // Also collect sources from nested OFCs
        ofcs.forEach(ofc => {
          if (Array.isArray(ofc.sources)) {
            ofc.sources.forEach(src => {
              if (!sources.find(s => JSON.stringify(s) === JSON.stringify(src))) {
                sources.push(src)
              }
            })
          }
        })
        
        const submissionData = {
          document_name: pdfFilename,
          file_path: path.join(PROCESSED_DIR, pdfFilename),
          vulnerabilities_count: vulnCount,
          ofcs_count: ofcCount,
          processed_at: new Date().toISOString(),
          storage_type: 'local',
          processing_method: 'heuristic_pipeline_llm',
          vulnerabilities: vulnerabilities,
          ofcs: ofcs, // Now properly linked
          sources: sources,
          links: vofcData.links || { vuln_ofc: ofcs.filter(o => o.linked_vulnerability).length }
        }
        
        if (existingSubmission) {
          // Update existing submission
          const { error: updateError } = await supabase
            .from('submissions')
            .update({
              data: JSON.stringify(submissionData),
              status: 'pending_review',
              source: 'file_processing',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSubmission.id)
          
          if (updateError) {
            console.error(`❌ Failed to update ${jsonFile}: ${updateError.message}`)
            errors++
          } else {
            console.log(`✅ Updated: ${jsonFile}`)
            updated++
          }
        } else {
          // Create new submission
          const submissionId = require('crypto').randomUUID()
          
          const { error: insertError } = await supabase
            .from('submissions')
            .insert({
              id: submissionId,
              type: 'ofc',
              status: 'pending_review',
              source: 'file_processing',
              data: JSON.stringify(submissionData),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (insertError) {
            console.error(`❌ Failed to create ${jsonFile}: ${insertError.message}`)
            errors++
          } else {
            console.log(`✅ Created: ${jsonFile} (${vulnCount} vulns, ${ofcCount} OFCs)`)
            created++
          }
        }
        
        synced++
      } catch (error) {
        console.error(`❌ Error processing ${jsonFile}: ${error.message}`)
        errors++
      }
    }
    
    console.log('\n📊 Summary:')
    console.log(`   Total files: ${jsonFiles.length}`)
    console.log(`   Synced: ${synced}`)
    console.log(`   Created: ${created}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Errors: ${errors}`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run sync
syncProcessedFiles()
  .then(() => {
    console.log('\n✅ Sync complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  })

