/**
 * Reprocess documents in review with updated Question → Vulnerability Statement → OFCs structure
 * This script:
 * 1. Finds all submissions with status 'pending_review'
 * 2. Extracts document text from JSON files or submission data
 * 3. Re-runs extraction with updated prompts
 * 4. Updates submission records with new structure
 */

const fs = require('fs').promises
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { execSync } = require('child_process')
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
const PYTHON_PATH = process.env.PYTHON_PATH || 'python'
const PIPELINE_PATH = path.join(process.env.USERPROFILE || process.env.HOME, 'AppData', 'Local', 'Ollama', 'pipeline', 'heuristic_pipeline.py')

async function reprocessDocuments() {
  try {
    console.log('📋 Fetching pending review submissions...\n')
    
    // Get all pending review submissions
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('id, data, source, status')
      .eq('status', 'pending_review')
      .eq('source', 'file_processing')
      .order('created_at', { ascending: false })
    
    if (subError) {
      console.error('❌ Error fetching submissions:', subError.message)
      return
    }
    
    if (!submissions || submissions.length === 0) {
      console.log('✅ No pending review submissions found')
      return
    }
    
    console.log(`📄 Found ${submissions.length} submission(s) to reprocess\n`)
    
    let processed = 0
    let errors = 0
    
    for (const submission of submissions) {
      try {
        console.log(`\n🔄 Processing submission: ${submission.id}`)
        
        // Parse submission data
        let submissionData = {}
        try {
          submissionData = typeof submission.data === 'string' 
            ? JSON.parse(submission.data) 
            : submission.data
        } catch (e) {
          console.error(`   ⚠️  Could not parse submission data: ${e.message}`)
          continue
        }
        
        const documentName = submissionData.document_name || ''
        const filename = documentName.replace(/\.pdf$/i, '')
        
        // Try to find JSON file in processed folder
        const jsonPath = path.join(PROCESSED_DIR, `${filename}.json`)
        let jsonExists = false
        
        try {
          await fs.access(jsonPath)
          jsonExists = true
        } catch {
          // File doesn't exist, try alternative names
          const altNames = [
            filename,
            filename.replace(/\s+/g, '_'),
            filename.replace(/[^a-zA-Z0-9_-]/g, '_')
          ]
          
          for (const altName of altNames) {
            const altPath = path.join(PROCESSED_DIR, `${altName}.json`)
            try {
              await fs.access(altPath)
              jsonPath = altPath
              jsonExists = true
              break
            } catch {}
          }
        }
        
        if (!jsonExists) {
          console.log(`   ⚠️  JSON file not found: ${jsonPath}`)
          console.log(`   💡 Skipping - document file may have been moved or deleted`)
          continue
        }
        
        // Read JSON file
        const jsonContent = await fs.readFile(jsonPath, 'utf-8')
        const vofcData = JSON.parse(jsonContent)
        
        // Check if we have document text
        // If not, we'll need to extract from PDF or use existing data
        console.log(`   📄 Found JSON file: ${path.basename(jsonPath)}`)
        
        // Try to get document text - check library folder for PDFs
        const LIBRARY_DIR = path.join(process.env.USERPROFILE || process.env.HOME, 'AppData', 'Local', 'Ollama', 'data', 'library')
        let documentText = null
        
        // Try to find PDF in library or processed folder
        const pdfPaths = [
          path.join(LIBRARY_DIR, documentName),
          path.join(PROCESSED_DIR, documentName),
          path.join(LIBRARY_DIR, filename + '.pdf'),
          path.join(PROCESSED_DIR, filename + '.pdf')
        ]
        
        let pdfPath = null
        for (const testPath of pdfPaths) {
          try {
            await fs.access(testPath)
            pdfPath = testPath
            break
          } catch {}
        }
        
        if (pdfPath) {
          console.log(`   📄 PDF found: ${path.basename(pdfPath)}`)
          
          // Extract text using Python pipeline
          console.log(`   🔍 Extracting text from PDF...`)
          const extractScript = `
import sys
import json
sys.path.insert(0, r"${path.dirname(PIPELINE_PATH).replace(/\\/g, '\\\\')}")
from heuristic_pipeline import extract_text_from_pdf

pdf_path = r"${pdfPath.replace(/\\/g, '\\\\')}"
try:
    text = extract_text_from_pdf(pdf_path)
    print(json.dumps({"text": text, "success": True}))
except Exception as e:
    import traceback
    print(json.dumps({"error": str(e), "traceback": traceback.format_exc(), "success": False}))
`
          
          try {
            const extractResult = execSync(`${PYTHON_PATH} -c ${JSON.stringify(extractScript)}`, {
              encoding: 'utf-8',
              maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            })
            
            const extractData = JSON.parse(extractResult)
            if (extractData.success) {
              documentText = extractData.text
              console.log(`   ✅ Extracted ${documentText.length} characters from PDF`)
            } else {
              throw new Error(extractData.error)
            }
          } catch (error) {
            console.log(`   ⚠️  Could not extract text from PDF: ${error.message}`)
          }
        } else {
          console.log(`   ⚠️  PDF not found in library or processed folders`)
        }
        
        // If we have document text, reprocess it
        if (documentText && documentText.length > 100) {
          console.log(`   🔄 Reprocessing with updated prompts...`)
          
          // Call Python pipeline to reprocess
          const processScript = `
import sys
import json
sys.path.insert(0, r"${path.dirname(PIPELINE_PATH)}")
from heuristic_pipeline import process_text_with_vofc_engine

text = r"""${documentText.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')}"""

try:
    result = process_text_with_vofc_engine(text, chunk_size=6000, doc_title="${filename}")
    print(json.dumps({"result": result, "success": True}))
except Exception as e:
    import traceback
    print(json.dumps({"error": str(e), "traceback": traceback.format_exc(), "success": False}))
`
          
          try {
            const processResult = execSync(`${PYTHON_PATH} -c ${JSON.stringify(processScript)}`, {
              encoding: 'utf-8',
              maxBuffer: 50 * 1024 * 1024 // 50MB buffer
            })
            
            const processData = JSON.parse(processResult)
            if (processData.success) {
              const newVofcData = processData.result
              
              // Normalize the structure (extract nested OFCs, ensure IDs, etc.)
              const normalizedVulns = (newVofcData.vulnerabilities || []).map((vuln, idx) => ({
                ...vuln,
                id: vuln.id || `vuln-${idx + 1}`,
                title: vuln.title || vuln.vulnerability || `Vulnerability ${idx + 1}`,
                question: vuln.question || null // Ensure question is present
              }))
              
              // Extract OFCs from nested structure
              let normalizedOfcs = []
              normalizedVulns.forEach(vuln => {
                const vulnId = vuln.id || vuln.title || vuln.vulnerability
                const nestedOfcs = vuln.options_for_consideration || []
                nestedOfcs.forEach((ofc, ofcIdx) => {
                  normalizedOfcs.push({
                    id: ofc.id || `ofc-${vulnId}-${ofcIdx + 1}`,
                    title: ofc.title || ofc.option || ofc.option_text || `OFC ${ofcIdx + 1}`,
                    description: ofc.description || ofc.option_text || ofc.option || '',
                    linked_vulnerability: vulnId
                  })
                })
              })
              
              // If no nested OFCs, use flat structure
              if (normalizedOfcs.length === 0 && Array.isArray(newVofcData.ofcs)) {
                normalizedOfcs = newVofcData.ofcs.map((ofc, idx) => ({
                  ...ofc,
                  id: ofc.id || `ofc-${idx + 1}`,
                  title: ofc.title || ofc.option || ofc.option_text || `OFC ${idx + 1}`
                }))
              }
              
              // Update submission data
              const updatedSubmissionData = {
                ...submissionData,
                vulnerabilities: normalizedVulns,
                ofcs: normalizedOfcs,
                vulnerabilities_count: normalizedVulns.length,
                ofcs_count: normalizedOfcs.length,
                links: {
                  vuln_ofc: normalizedOfcs.filter(o => o.linked_vulnerability).length
                },
                reprocessed_at: new Date().toISOString(),
                reprocessed_reason: 'Updated to Question → Vulnerability Statement → OFCs structure'
              }
              
              // Update submission in Supabase
              const { error: updateError } = await supabase
                .from('submissions')
                .update({
                  data: JSON.stringify(updatedSubmissionData),
                  updated_at: new Date().toISOString()
                })
                .eq('id', submission.id)
              
              if (updateError) {
                throw new Error(updateError.message)
              }
              
              console.log(`   ✅ Reprocessed: ${normalizedVulns.length} vulnerabilities, ${normalizedOfcs.length} OFCs`)
              processed++
            } else {
              throw new Error(processData.error || 'Processing failed')
            }
          } catch (error) {
            console.error(`   ❌ Reprocessing failed: ${error.message}`)
            if (error.stdout) console.error(`   Output: ${error.stdout.substring(0, 500)}`)
            errors++
          }
        } else {
          console.log(`   ⚠️  Skipping - no document text available for reprocessing`)
          errors++
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing submission ${submission.id}: ${error.message}`)
        errors++
      }
    }
    
    console.log('\n📊 Summary:')
    console.log(`   Total submissions: ${submissions.length}`)
    console.log(`   Successfully reprocessed: ${processed}`)
    console.log(`   Errors/Skipped: ${errors}`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run reprocessing
reprocessDocuments()
  .then(() => {
    console.log('\n✅ Reprocessing complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Reprocessing failed:', error)
    process.exit(1)
  })

