/**
 * Reprocess JSON files in processed folder with updated Question → Vulnerability Statement → OFCs structure
 * This script reads existing JSON files, ensures they have the proper structure, and updates Supabase
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

// Generate a question from a vulnerability statement
function generateQuestion(vulnerability) {
  let vulnText = vulnerability.vulnerability || vulnerability.title || ''
  
  // If it's already a question, return it
  if (vulnText.trim().endsWith('?')) {
    return vulnText
  }
  
  // Remove trailing period and clean up
  vulnText = vulnText.trim().replace(/\.$/, '').trim()
  
  // Convert statement to question by extracting the key concept
  const lower = vulnText.toLowerCase()
  
  // Extract the core concept (remove common vulnerability verbs and phrases)
  let coreConcept = vulnText
  
  // Special handling for "open access" patterns
  if (lower.includes('open access') || lower.includes('unauthorized access') || lower.includes('unrestricted access')) {
    if (lower.includes('open access')) {
      coreConcept = 'open access points'
    } else if (lower.includes('unauthorized access')) {
      coreConcept = 'unauthorized access'
    } else {
      coreConcept = 'unrestricted access'
    }
  } else {
    // Remove common vulnerability prefixes, but keep the key noun
    const prefixPatterns = [
      { pattern: /^large concentrations of /i, keep: 'student concentrations' },
      { pattern: /^inadequate /i, keep: null },
      { pattern: /^insufficient /i, keep: null },
      { pattern: /^limited /i, keep: null },
      { pattern: /^lack of /i, keep: null },
      { pattern: /^poor /i, keep: null },
      { pattern: /^weak /i, keep: null },
    ]
    
    for (const { pattern, keep } of prefixPatterns) {
      if (pattern.test(coreConcept)) {
        if (keep) {
          coreConcept = keep
          break
        } else {
          coreConcept = coreConcept.replace(pattern, '')
        }
      }
    }
  }
  
  // Remove everything after common vulnerability verbs and phrases
  // This extracts the subject/object before the verb
  const verbPatterns = [
    /\b(creates?|allows?|exposes?|hinders?|increases?|gather|gathers?|create|allow|expose|hinder|increase|prevent|prevents?|enable|enables?|entry|entry)\b.*$/i,
  ]
  
  for (const pattern of verbPatterns) {
    const match = coreConcept.match(new RegExp(`^(.+?)\\s+${pattern.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))
    if (match && match[1].trim().length > 5) {
      coreConcept = match[1].trim()
    }
  }
  
  // Remove trailing prepositional phrases
  coreConcept = coreConcept.replace(/\b(without|with|during|for|to|on|in|at|into|onto)\b.*$/i, '').trim()
  
  // If we extracted a good core concept, use it; otherwise use the original
  // But ensure it's not too short or too long
  if (coreConcept.length > 5 && coreConcept.length < vulnText.length * 0.9 && coreConcept.length > vulnText.length * 0.2) {
    vulnText = coreConcept
  } else {
    // Fallback: try to extract just the first noun phrase (up to 8 words)
    const words = vulnText.split(/\s+/)
    const firstPhrase = words.slice(0, Math.min(8, words.length)).join(' ')
    // Remove leading vulnerability indicators
    const cleaned = firstPhrase.replace(/^(inadequate|insufficient|limited|lack of|poor|weak|unauthorized|open|unrestricted)\s+/i, '')
    if (cleaned.length > 10 && cleaned.length < firstPhrase.length) {
      vulnText = cleaned
    }
  }
  
  // Convert to lowercase for question generation
  const questionBase = vulnText.toLowerCase()
  
  // Generate question based on vulnerability type
  if (lower.includes('inadequate') || lower.includes('insufficient') || lower.includes('limited') || lower.includes('lack')) {
    if (lower.includes('security')) {
      return `Are there adequate security measures in place to address ${questionBase}?`
    }
    return `Are there adequate measures in place to address ${questionBase}?`
  }
  
  if (lower.includes('open') || lower.includes('unrestricted') || lower.includes('unauthorized')) {
    return `How does the organization control and secure ${questionBase}?`
  }
  
  if (lower.includes('cyber') || lower.includes('network')) {
    return `What cybersecurity measures are in place to protect against ${questionBase}?`
  }
  
  if (lower.includes('concentration') || lower.includes('gather') || lower.includes('outside')) {
    return `How does the organization manage ${questionBase}?`
  }
  
  if (lower.includes('communication') || lower.includes('coordination')) {
    return `How does the organization ensure adequate ${questionBase}?`
  }
  
  // Generic question format
  return `How does the organization address ${questionBase}?`
}

// Ensure vulnerability is a clear statement with proper sentence capitalization
function ensureStatement(vulnerability) {
  let vulnText = vulnerability.vulnerability || vulnerability.title || ''
  
  if (!vulnText || vulnText.trim().length === 0) {
    return 'Vulnerability not specified.'
  }
  
  // Remove leading/trailing whitespace
  vulnText = vulnText.trim()
  
  // If it's a question, convert to statement
  if (vulnText.endsWith('?')) {
    // Remove question mark
    vulnText = vulnText.replace(/\?$/, '').trim()
    
    // Convert common question patterns to statements
    const lower = vulnText.toLowerCase()
    
    if (lower.startsWith('are there')) {
      vulnText = vulnText.replace(/^are there/i, 'There are inadequate')
        .replace(/adequate\s+/i, '')
        .replace(/in place/i, 'in place')
    } else if (lower.startsWith('how does')) {
      vulnText = vulnText.replace(/^how does the organization address/i, 'The organization does not adequately address')
    } else if (lower.startsWith('what')) {
      vulnText = vulnText.replace(/^what/i, 'Inadequate')
        .replace(/are in place/i, 'are not in place')
    } else if (lower.startsWith('is there') || lower.startsWith('does')) {
      vulnText = vulnText.replace(/^(is there|does)/i, 'There is inadequate')
    }
  }
  
  // Convert title-case phrases and noun phrases to proper vulnerability statements
  const lower = vulnText.toLowerCase()
  const words = vulnText.split(/\s+/)
  
  // Check if it's a title/noun phrase (most words capitalized, or short phrase)
  const isTitleCase = words.length > 1 && words.filter(w => w.length > 0 && w.charAt(0) === w.charAt(0).toUpperCase()).length > words.length * 0.6
  const isShortPhrase = words.length <= 5
  const hasVerb = lower.match(/\b(is|are|was|were|has|have|had|does|do|did|will|would|can|could|should|may|might|creates|allows|exposes|hinders|increases|gather|create|allow|expose|hinder|increase)\b/)
  const hasNoVerb = !hasVerb
  
  // Check if statement is incomplete (just a phrase, not a full sentence)
  const isIncomplete = (isTitleCase || (isShortPhrase && hasNoVerb)) && 
      !lower.includes('allows') && !lower.includes('creates') && !lower.includes('exposes') &&
      !lower.includes('hinders') && !lower.includes('increases') && !lower.includes('gather')
  
  // If it's an incomplete phrase, convert to full statement
  if (isIncomplete) {
    // Convert to vulnerability statement based on content
    if (lower.includes('open access')) {
      vulnText = 'Open access points allow unauthorized entry without proper screening.'
    } else if (lower.includes('large concentration') || lower.includes('students outside') || lower.includes('outside school')) {
      vulnText = 'Large concentrations of students gather outside school buildings without adequate security controls.'
    } else if (lower.includes('after-school') || lower.includes('after school') || lower.includes('after school events') || lower.includes('security control')) {
      vulnText = 'Limited security control during after-school events creates safety risks.'
    } else if (lower.includes('school bus') || lower.includes('buses') || lower.includes('transportation') || (lower.includes('bus') && lower.includes('security'))) {
      vulnText = 'Limited security measures on school buses create transportation safety vulnerabilities.'
    } else if (lower.includes('cyber') || (lower.includes('network') && lower.includes('threat'))) {
      vulnText = 'Inadequate cybersecurity measures expose systems to potential cyber threats.'
    } else if (lower.includes('natural hazard') || lower.includes('accident') || lower.includes('disaster')) {
      vulnText = 'Inadequate preparation for natural hazards and accidents increases risk to personnel and facilities.'
    } else if (lower.includes('communication') || lower.includes('external') || lower.includes('coordination')) {
      vulnText = 'Limited communication with external entities hinders coordination during emergencies.'
    } else if (lower.includes('perimeter') || lower.includes('boundary') || lower.includes('fence')) {
      vulnText = 'Inadequate perimeter security controls allow unauthorized access to the facility.'
    } else if (lower.includes('access control') || lower.includes('entry')) {
      vulnText = 'Inadequate access control measures allow unauthorized entry into secure areas.'
    } else {
      // Generic conversion - ensure it's a complete statement
      // Remove "Inadequate" or "Limited" if at start and rebuild as proper sentence
      let baseText = vulnText
      if (lower.startsWith('inadequate ')) {
        baseText = vulnText.substring(11).trim()
      } else if (lower.startsWith('limited ')) {
        baseText = vulnText.substring(8).trim()
      }
      
      // Convert to sentence case
      const sentenceCase = baseText.split(/\s+/).map((w, i) => 
        i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()
      ).join(' ')
      
      // Add appropriate vulnerability verb based on context
      if (lower.includes('security') || lower.includes('control') || lower.includes('measure')) {
        vulnText = 'Inadequate ' + sentenceCase + ' creates security vulnerabilities.'
      } else if (lower.includes('access') || lower.includes('entry')) {
        vulnText = 'Inadequate ' + sentenceCase + ' allows unauthorized access.'
      } else {
        vulnText = 'Inadequate ' + sentenceCase + ' creates security risks.'
      }
    }
  }
  
  // Ensure proper sentence capitalization
  // First, ensure it starts with a capital letter
  vulnText = vulnText.charAt(0).toUpperCase() + vulnText.slice(1)
  
  // Ensure it's a complete sentence (ends with period unless it's a statement ending with other punctuation)
  if (!vulnText.match(/[.!]$/)) {
    vulnText = vulnText + '.'
  }
  
  // Clean up multiple spaces and ensure proper spacing
  vulnText = vulnText.replace(/\s+/g, ' ').trim()
  
  return vulnText
}

async function reprocessJsonFiles() {
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
      console.log('✅ No JSON files to reprocess')
      return
    }
    
    let processed = 0
    let updated = 0
    let errors = 0
    
    for (const jsonFile of jsonFiles) {
      try {
        console.log(`\n🔄 Processing: ${jsonFile}`)
        
        const jsonPath = path.join(PROCESSED_DIR, jsonFile)
        const jsonContent = await fs.readFile(jsonPath, 'utf-8')
        const vofcData = JSON.parse(jsonContent)
        
        // Process vulnerabilities
        const vulnerabilities = Array.isArray(vofcData.vulnerabilities) ? vofcData.vulnerabilities : []
        let needsUpdate = false
        
        const updatedVulnerabilities = vulnerabilities.map((vuln, idx) => {
          const updated = { ...vuln }
          
          // Ensure vulnerability is a clear statement with proper capitalization
          const statement = ensureStatement(vuln)
          const originalVuln = updated.vulnerability || updated.title || ''
          
          if (statement !== originalVuln) {
            updated.vulnerability = statement
            updated.title = statement
            needsUpdate = true
          }
          
          // Also update what field if it exists and needs fixing
          if (updated.what) {
            const whatStatement = ensureStatement({ vulnerability: updated.what })
            if (whatStatement !== updated.what) {
              updated.what = whatStatement
              needsUpdate = true
            }
          }
          
          // Always regenerate question to ensure proper format
          const newQuestion = generateQuestion(updated)
          if (updated.question !== newQuestion) {
            updated.question = newQuestion
            needsUpdate = true
          }
          
          // Ensure ID
          if (!updated.id) {
            updated.id = `vuln-${idx + 1}`
          }
          
          return updated
        })
        
        // Extract and normalize OFCs
        let ofcs = []
        
        // First, extract from nested structure
        updatedVulnerabilities.forEach(vuln => {
          const vulnId = vuln.id || vuln.title || vuln.vulnerability
          const nestedOfcs = vuln.options_for_consideration || []
          
          nestedOfcs.forEach((ofc, ofcIdx) => {
            ofcs.push({
              id: ofc.id || `ofc-${vulnId}-${ofcIdx + 1}`,
              title: ofc.title || ofc.option || ofc.option_text || `OFC ${ofcIdx + 1}`,
              description: ofc.description || ofc.option_text || ofc.option || '',
              linked_vulnerability: vulnId,
              sources: ofc.sources || []
            })
          })
        })
        
        // If no nested OFCs, check flat structure
        if (ofcs.length === 0 && Array.isArray(vofcData.ofcs)) {
          ofcs = vofcData.ofcs.map((ofc, idx) => ({
            ...ofc,
            id: ofc.id || `ofc-${idx + 1}`,
            title: ofc.title || ofc.option || ofc.option_text || `OFC ${idx + 1}`
          }))
        }
        
        // Update the data structure
        if (needsUpdate || ofcs.length !== (vofcData.ofcs?.length || 0)) {
          vofcData.vulnerabilities = updatedVulnerabilities
          vofcData.ofcs = ofcs
          vofcData.vulnerabilities_count = updatedVulnerabilities.length
          vofcData.ofcs_count = ofcs.length
          vofcData.links = {
            vuln_ofc: ofcs.filter(o => o.linked_vulnerability).length
          }
          vofcData.reprocessed_at = new Date().toISOString()
          vofcData.reprocessed_reason = 'Updated to Question → Vulnerability Statement → OFCs structure'
          
          // Save updated JSON
          await fs.writeFile(jsonPath, JSON.stringify(vofcData, null, 2), 'utf-8')
          console.log(`   ✅ Updated JSON file`)
          updated++
          
          // Update Supabase submission
          const filename = jsonFile.replace(/\.json$/, '')
          const pdfFilename = filename + '.pdf'
          
          // Find submission by document name
          const { data: submissions } = await supabase
            .from('submissions')
            .select('id, data')
            .eq('source', 'file_processing')
            .eq('status', 'pending_review')
          
          if (submissions) {
            for (const submission of submissions) {
              try {
                const subData = typeof submission.data === 'string' 
                  ? JSON.parse(submission.data) 
                  : submission.data
                
                if (subData?.document_name === pdfFilename || subData?.document_name === filename) {
                  // Update submission
                  const updatedSubmissionData = {
                    ...subData,
                    ...vofcData,
                    vulnerabilities: updatedVulnerabilities,
                    ofcs: ofcs,
                    vulnerabilities_count: updatedVulnerabilities.length,
                    ofcs_count: ofcs.length
                  }
                  
                  const { error: updateError } = await supabase
                    .from('submissions')
                    .update({
                      data: JSON.stringify(updatedSubmissionData),
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', submission.id)
                  
                  if (updateError) {
                    console.log(`   ⚠️  Could not update Supabase: ${updateError.message}`)
                  } else {
                    console.log(`   ✅ Updated Supabase submission: ${submission.id}`)
                  }
                  break
                }
              } catch {}
            }
          }
        } else {
          console.log(`   ℹ️  No updates needed`)
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
    console.log(`   Errors: ${errors}`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run reprocessing
reprocessJsonFiles()
  .then(() => {
    console.log('\n✅ Reprocessing complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Reprocessing failed:', error)
    process.exit(1)
  })

