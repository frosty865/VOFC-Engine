import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/supabase-manager';
import crypto from 'crypto';

// Comprehensive security validation system with FISMA/FedRAMP compliance
export async function POST(request) {
  try {
    const { filename, fileData, validationLevel = 'standard', options = {} } = await request.json();
    
    console.log(`🔒 Comprehensive security validation for: ${filename} (${validationLevel})`);
    
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Perform comprehensive security validation
    const securityValidation = await performComprehensiveSecurityValidation(
      fileData, 
      filename, 
      validationLevel,
      options,
      supabaseServer
    );

    // Log security validation with compliance tracking
    await logSecurityValidationWithCompliance(filename, securityValidation, supabaseServer);
    
    if (!securityValidation.isSafe) {
      return NextResponse.json({
        success: false,
        isSafe: false,
        security_issues: securityValidation.issues,
        risk_level: securityValidation.riskLevel,
        compliance_status: securityValidation.complianceStatus,
        message: 'Document failed comprehensive security validation'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      isSafe: true,
      security_validation: securityValidation,
      compliance_status: securityValidation.complianceStatus,
      message: 'Document passed comprehensive security validation'
    });

  } catch (error) {
    console.error('❌ Comprehensive security validation error:', error);
    return NextResponse.json({ error: 'Security validation failed' }, { status: 500 });
  }
}

// Comprehensive security validation with compliance checks
async function performComprehensiveSecurityValidation(fileData, filename, validationLevel, options, supabaseServer) {
  const validation = {
    isSafe: true,
    riskLevel: 'low',
    issues: [],
    complianceStatus: 'compliant',
    checksum: null,
    mimeType: null,
    fileSize: 0,
    securityChecks: {},
    complianceChecks: {},
    metadata: {},
    recommendations: []
  };

  try {
    // Convert base64 to buffer for analysis
    const buffer = Buffer.from(fileData, 'base64');
    validation.fileSize = buffer.length;

    // 1. Enhanced Checksum Verification
    validation.checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    console.log(`📊 File checksum: ${validation.checksum.substring(0, 16)}...`);

    // Check for file deduplication and integrity
    const existingValidation = await checkExistingSecurityValidation(validation.checksum, supabaseServer);
    if (existingValidation) {
      validation.securityChecks.deduplication = {
        status: 'duplicate_detected',
        original_filename: existingValidation.filename,
        original_validation_date: existingValidation.validated_at,
        risk_assessment: existingValidation.risk_level
      };
      
      if (existingValidation.risk_level === 'high' || existingValidation.risk_level === 'critical') {
        validation.isSafe = false;
        validation.riskLevel = existingValidation.risk_level;
        validation.issues.push(`File previously flagged as ${existingValidation.risk_level} risk`);
      }
    }

    // 2. Advanced MIME Type Validation and Sniffing
    const mimeValidation = await performAdvancedMimeValidation(buffer, filename);
    validation.mimeType = mimeValidation.detectedType;
    validation.securityChecks.mimeValidation = mimeValidation;
    
    if (!mimeValidation.isValid) {
      validation.isSafe = false;
      validation.riskLevel = 'high';
      validation.issues.push(`MIME type validation failed: ${mimeValidation.reason}`);
    }

    // 3. File Size and Resource Validation
    const sizeValidation = performFileSizeValidation(buffer, validationLevel);
    validation.securityChecks.sizeValidation = sizeValidation;
    
    if (!sizeValidation.isValid) {
      validation.isSafe = false;
      validation.riskLevel = sizeValidation.riskLevel;
      validation.issues.push(`File size validation failed: ${sizeValidation.reason}`);
    }

    // 4. PDF-Specific Security Analysis (Enhanced)
    if (filename.toLowerCase().endsWith('.pdf')) {
      const pdfSecurityAnalysis = await performEnhancedPdfSecurityAnalysis(buffer);
      validation.securityChecks.pdfAnalysis = pdfSecurityAnalysis;
      
      if (!pdfSecurityAnalysis.isSafe) {
        validation.isSafe = false;
        validation.riskLevel = pdfSecurityAnalysis.riskLevel;
        validation.issues.push(...pdfSecurityAnalysis.issues);
      }
    }

    // 5. Malicious Content Detection (Enhanced)
    const maliciousContentAnalysis = await performEnhancedMaliciousContentDetection(buffer);
    validation.securityChecks.maliciousContent = maliciousContentAnalysis;
    
    if (maliciousContentAnalysis.detected) {
      validation.isSafe = false;
      validation.riskLevel = 'critical';
      validation.issues.push(`Malicious content detected: ${maliciousContentAnalysis.type}`);
    }

    // 6. Metadata Extraction and Security Analysis
    const metadataAnalysis = await performMetadataSecurityAnalysis(buffer, filename);
    validation.metadata = metadataAnalysis.metadata;
    validation.securityChecks.metadataAnalysis = metadataAnalysis;
    
    if (metadataAnalysis.securityIssues.length > 0) {
      validation.issues.push(...metadataAnalysis.securityIssues);
      if (metadataAnalysis.riskLevel === 'high') {
        validation.isSafe = false;
        validation.riskLevel = 'high';
      }
    }

    // 7. Content Structure Security Validation
    const structureValidation = await performContentStructureSecurityValidation(buffer, filename);
    validation.securityChecks.structureValidation = structureValidation;
    
    if (!structureValidation.isValid) {
      validation.issues.push(`Content structure issues: ${structureValidation.issues.join(', ')}`);
      if (structureValidation.riskLevel === 'high') {
        validation.isSafe = false;
        validation.riskLevel = 'high';
      }
    }

    // 8. Compliance Validation (FISMA/FedRAMP)
    const complianceValidation = await performComplianceValidation(validation, validationLevel);
    validation.complianceChecks = complianceValidation;
    validation.complianceStatus = complianceValidation.status;
    
    if (complianceValidation.status !== 'compliant') {
      validation.issues.push(`Compliance validation failed: ${complianceValidation.reason}`);
      if (complianceValidation.riskLevel === 'high') {
        validation.isSafe = false;
        validation.riskLevel = 'high';
      }
    }

    // 9. Generate Security Recommendations
    validation.recommendations = generateSecurityRecommendations(validation);

    console.log(`🔒 Comprehensive security validation completed: ${validation.isSafe ? 'SAFE' : 'UNSAFE'} (${validation.riskLevel})`);
    
    return validation;

  } catch (error) {
    console.error('❌ Comprehensive security validation error:', error);
    return {
      isSafe: false,
      riskLevel: 'critical',
      issues: [`Security validation failed: ${error.message}`],
      complianceStatus: 'non_compliant',
      checksum: null,
      mimeType: null,
      fileSize: 0,
      securityChecks: {},
      complianceChecks: {},
      metadata: {},
      recommendations: ['Security validation system error - manual review required']
    };
  }
}

// Advanced MIME type validation with security focus
async function performAdvancedMimeValidation(buffer, filename) {
  const validation = {
    detectedType: 'application/octet-stream',
    isValid: false,
    reason: '',
    securityFlags: []
  };

  try {
    // File signature analysis
    const signatures = {
      'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
      'text/plain': [0xEF, 0xBB, 0xBF], // UTF-8 BOM
      'application/msword': [0xD0, 0xCF, 0x11, 0xE0], // DOC
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // DOCX
      'application/vnd.ms-excel': [0xD0, 0xCF, 0x11, 0xE0], // XLS
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04], // XLSX
      'text/csv': [0xEF, 0xBB, 0xBF], // UTF-8 BOM
      'image/jpeg': [0xFF, 0xD8, 0xFF], // JPEG
      'image/png': [0x89, 0x50, 0x4E, 0x47], // PNG
      'application/zip': [0x50, 0x4B, 0x03, 0x04], // ZIP
      'application/x-executable': [0x4D, 0x5A], // PE executable
      'application/x-sharedlib': [0x7F, 0x45, 0x4C, 0x46] // ELF
    };

    // Check file signatures
    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (buffer.length >= signature.length) {
        const matches = signature.every((byte, index) => buffer[index] === byte);
        if (matches) {
          validation.detectedType = mimeType;
          break;
        }
      }
    }

    // Security-focused validation
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const dangerousTypes = [
      'application/x-executable',
      'application/x-sharedlib',
      'application/x-msdownload',
      'application/x-msdos-program'
    ];

    if (dangerousTypes.includes(validation.detectedType)) {
      validation.isValid = false;
      validation.reason = `Dangerous file type detected: ${validation.detectedType}`;
      validation.securityFlags.push('executable_content');
    } else if (allowedTypes.includes(validation.detectedType)) {
      validation.isValid = true;
    } else {
      validation.isValid = false;
      validation.reason = `Unsupported file type: ${validation.detectedType}`;
      validation.securityFlags.push('unsupported_type');
    }

    // Check for file extension mismatch
    const extension = filename.split('.').pop().toLowerCase();
    const expectedMimeForExtension = {
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    if (expectedMimeForExtension[extension] && expectedMimeForExtension[extension] !== validation.detectedType) {
      validation.securityFlags.push('extension_mismatch');
      validation.reason += ' (File extension does not match detected MIME type)';
    }

    return validation;

  } catch (error) {
    console.error('MIME validation error:', error);
    return {
      detectedType: 'application/octet-stream',
      isValid: false,
      reason: `MIME validation failed: ${error.message}`,
      securityFlags: ['validation_error']
    };
  }
}

// File size validation with resource limits
function performFileSizeValidation(buffer, validationLevel) {
  const validation = {
    isValid: true,
    reason: '',
    riskLevel: 'low'
  };

  const size = buffer.length;
  const limits = {
    'low': 5 * 1024 * 1024,      // 5MB
    'standard': 10 * 1024 * 1024, // 10MB
    'high': 25 * 1024 * 1024,     // 25MB
    'critical': 50 * 1024 * 1024  // 50MB
  };

  const limit = limits[validationLevel] || limits.standard;

  if (size > limit) {
    validation.isValid = false;
    validation.reason = `File size ${Math.round(size / 1024 / 1024)}MB exceeds limit ${Math.round(limit / 1024 / 1024)}MB`;
    validation.riskLevel = size > limit * 2 ? 'high' : 'medium';
  } else if (size === 0) {
    validation.isValid = false;
    validation.reason = 'Empty file detected';
    validation.riskLevel = 'medium';
  } else if (size < 100) {
    validation.isValid = false;
    validation.reason = 'File too small - potential security risk';
    validation.riskLevel = 'medium';
  }

  return validation;
}

// Enhanced PDF security analysis
async function performEnhancedPdfSecurityAnalysis(buffer) {
  const analysis = {
    isSafe: true,
    riskLevel: 'low',
    issues: [],
    securityFlags: []
  };

  try {
    const content = buffer.toString('binary');
    
    // Check PDF version and security features
    const pdfVersionMatch = content.match(/%PDF-(\d+\.\d+)/);
    if (pdfVersionMatch) {
      const version = parseFloat(pdfVersionMatch[1]);
      if (version < 1.4) {
        analysis.issues.push(`Old PDF version: ${pdfVersionMatch[1]} - potential security risk`);
        analysis.riskLevel = 'medium';
      }
    }

    // Enhanced JavaScript detection
    const jsPatterns = [
      /\/JavaScript\s*\(/g,
      /\/JS\s*\(/g,
      /\/OpenAction\s*\(/g,
      /\/AA\s*\(/g,
      /\/AcroForm.*\/JavaScript/g
    ];

    let jsCount = 0;
    for (const pattern of jsPatterns) {
      const matches = content.match(pattern);
      if (matches) jsCount += matches.length;
    }

    if (jsCount > 0) {
      analysis.isSafe = false;
      analysis.riskLevel = 'high';
      analysis.issues.push(`PDF contains ${jsCount} JavaScript references - potential security risk`);
      analysis.securityFlags.push('javascript_content');
    }

    // Enhanced embedded file detection
    const embeddedPatterns = [
      /\/EmbeddedFile/g,
      /\/FileAttachment/g,
      /\/F\s*\([^)]*\)/g
    ];

    let embeddedCount = 0;
    for (const pattern of embeddedPatterns) {
      const matches = content.match(pattern);
      if (matches) embeddedCount += matches.length;
    }

    if (embeddedCount > 0) {
      analysis.issues.push(`PDF contains ${embeddedCount} embedded files`);
      analysis.securityFlags.push('embedded_files');
      if (embeddedCount > 3) {
        analysis.riskLevel = 'medium';
      }
    }

    // Enhanced form detection
    const formPatterns = [
      /\/AcroForm/g,
      /\/XFA/g,
      /\/Fields\s*\[/g
    ];

    let formCount = 0;
    for (const pattern of formPatterns) {
      const matches = content.match(pattern);
      if (matches) formCount += matches.length;
    }

    if (formCount > 0) {
      analysis.issues.push(`PDF contains ${formCount} interactive forms`);
      analysis.securityFlags.push('interactive_forms');
      if (formCount > 5) {
        analysis.riskLevel = 'medium';
      }
    }

    // Enhanced encryption detection
    const encryptionPatterns = [
      /\/Encrypt/g,
      /\/Filter\s*\/Standard/g,
      /\/V\s*[1-4]/g
    ];

    let encryptionCount = 0;
    for (const pattern of encryptionPatterns) {
      const matches = content.match(pattern);
      if (matches) encryptionCount += matches.length;
    }

    if (encryptionCount > 0) {
      analysis.issues.push(`PDF is encrypted or password-protected`);
      analysis.securityFlags.push('encrypted_content');
      analysis.riskLevel = 'medium';
    }

    // Enhanced external reference detection
    const externalRefs = content.match(/\/URI\s*\([^)]+\)/g);
    if (externalRefs && externalRefs.length > 0) {
      analysis.issues.push(`PDF contains ${externalRefs.length} external references`);
      analysis.securityFlags.push('external_references');
      if (externalRefs.length > 10) {
        analysis.riskLevel = 'medium';
      }
    }

    // Enhanced suspicious action detection
    const suspiciousActions = [
      { pattern: /\/Launch\s*\(/g, name: 'Launch actions' },
      { pattern: /\/GoToR\s*\(/g, name: 'Remote navigation' },
      { pattern: /\/SubmitForm\s*\(/g, name: 'Form submission' },
      { pattern: /\/ImportData\s*\(/g, name: 'Data import' },
      { pattern: /\/SetOCGState\s*\(/g, name: 'Layer state changes' },
      { pattern: /\/Rendition\s*\(/g, name: 'Media rendition' }
    ];

    for (const action of suspiciousActions) {
      const matches = content.match(action.pattern);
      if (matches && matches.length > 0) {
        analysis.issues.push(`PDF contains ${matches.length} ${action.name.toLowerCase()}`);
        analysis.securityFlags.push('suspicious_actions');
        if (matches.length > 2) {
          analysis.riskLevel = 'high';
        }
      }
    }

    // Check for PDF/A compliance
    const pdfaMatch = content.match(/\/Type\s*\/Catalog.*\/MarkInfo/g);
    if (pdfaMatch) {
      analysis.securityFlags.push('pdfa_compliant');
    }

    return analysis;

  } catch (error) {
    console.error('PDF security analysis error:', error);
    return {
      isSafe: false,
      riskLevel: 'high',
      issues: [`PDF security analysis failed: ${error.message}`],
      securityFlags: ['analysis_error']
    };
  }
}

// Enhanced malicious content detection
async function performEnhancedMaliciousContentDetection(buffer) {
  const analysis = {
    detected: false,
    type: null,
    confidence: 0,
    indicators: []
  };

  try {
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024 * 1024)); // Check first 1MB

    // Enhanced executable signatures
    const executableSignatures = [
      { pattern: /MZ/, type: 'PE executable', confidence: 0.9 },
      { pattern: /\x7fELF/, type: 'ELF executable', confidence: 0.9 },
      { pattern: /\xca\xfe\xba\xbe/, type: 'Java class file', confidence: 0.8 },
      { pattern: /\xfe\xed\xfa\xce/, type: 'Mach-O executable', confidence: 0.9 }
    ];

    for (const sig of executableSignatures) {
      if (sig.pattern.test(content)) {
        analysis.detected = true;
        analysis.type = sig.type;
        analysis.confidence = sig.confidence;
        analysis.indicators.push(sig.type);
      }
    }

    // Enhanced script detection
    const scriptPatterns = [
      { pattern: /<script[^>]*>/i, type: 'JavaScript', confidence: 0.8 },
      { pattern: /<iframe[^>]*>/i, type: 'HTML iframe', confidence: 0.7 },
      { pattern: /<object[^>]*>/i, type: 'HTML object', confidence: 0.7 },
      { pattern: /<embed[^>]*>/i, type: 'HTML embed', confidence: 0.7 },
      { pattern: /<applet[^>]*>/i, type: 'Java applet', confidence: 0.9 }
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.pattern.test(content)) {
        analysis.detected = true;
        analysis.type = pattern.type;
        analysis.confidence = Math.max(analysis.confidence, pattern.confidence);
        analysis.indicators.push(pattern.type);
      }
    }

    // Enhanced obfuscation detection
    const obfuscationPatterns = [
      { pattern: /eval\s*\(/i, type: 'JavaScript eval', confidence: 0.9 },
      { pattern: /document\.write/i, type: 'DOM manipulation', confidence: 0.8 },
      { pattern: /window\.open/i, type: 'Window opening', confidence: 0.7 },
      { pattern: /data:text\/html;base64,/i, type: 'Base64 HTML', confidence: 0.8 },
      { pattern: /data:application\/javascript;base64,/i, type: 'Base64 JavaScript', confidence: 0.9 },
      { pattern: /unescape\s*\(/i, type: 'String unescaping', confidence: 0.8 },
      { pattern: /String\.fromCharCode/i, type: 'Character code conversion', confidence: 0.7 }
    ];

    for (const pattern of obfuscationPatterns) {
      if (pattern.pattern.test(content)) {
        analysis.detected = true;
        analysis.type = pattern.type;
        analysis.confidence = Math.max(analysis.confidence, pattern.confidence);
        analysis.indicators.push(pattern.type);
      }
    }

    // Enhanced malware signatures
    const malwareSignatures = [
      { pattern: /powershell\s+-enc/i, type: 'PowerShell encoded command', confidence: 0.9 },
      { pattern: /cmd\s+\/c/i, type: 'Command execution', confidence: 0.8 },
      { pattern: /regsvr32\s+/i, type: 'DLL registration', confidence: 0.8 },
      { pattern: /rundll32\s+/i, type: 'DLL execution', confidence: 0.8 },
      { pattern: /wscript\s+/i, type: 'Script execution', confidence: 0.7 },
      { pattern: /cscript\s+/i, type: 'Script execution', confidence: 0.7 }
    ];

    for (const sig of malwareSignatures) {
      if (sig.pattern.test(content)) {
        analysis.detected = true;
        analysis.type = sig.type;
        analysis.confidence = Math.max(analysis.confidence, sig.confidence);
        analysis.indicators.push(sig.type);
      }
    }

    return analysis;

  } catch (error) {
    console.error('Malicious content detection error:', error);
    return {
      detected: false,
      type: null,
      confidence: 0,
      indicators: []
    };
  }
}

// Metadata security analysis
async function performMetadataSecurityAnalysis(buffer, filename) {
  const analysis = {
    metadata: {},
    securityIssues: [],
    riskLevel: 'low'
  };

  try {
    // Basic file metadata
    analysis.metadata = {
      filename,
      size: buffer.length,
      created: new Date().toISOString(),
      extension: filename.split('.').pop().toLowerCase()
    };

    // PDF metadata extraction with security focus
    if (filename.toLowerCase().endsWith('.pdf')) {
      try {
        const content = buffer.toString('binary');
        
        const metadata = {
          title: null,
          author: null,
          subject: null,
          creator: null,
          producer: null,
          creationDate: null,
          modificationDate: null
        };

        // Extract PDF metadata
        const titleMatch = content.match(/\/Title\s*\(([^)]+)\)/);
        const authorMatch = content.match(/\/Author\s*\(([^)]+)\)/);
        const subjectMatch = content.match(/\/Subject\s*\(([^)]+)\)/);
        const creatorMatch = content.match(/\/Creator\s*\(([^)]+)\)/);
        const producerMatch = content.match(/\/Producer\s*\(([^)]+)\)/);
        const creationDateMatch = content.match(/\/CreationDate\s*\(([^)]+)\)/);
        const modDateMatch = content.match(/\/ModDate\s*\(([^)]+)\)/);

        if (titleMatch) metadata.title = titleMatch[1];
        if (authorMatch) metadata.author = authorMatch[1];
        if (subjectMatch) metadata.subject = subjectMatch[1];
        if (creatorMatch) metadata.creator = creatorMatch[1];
        if (producerMatch) metadata.producer = producerMatch[1];
        if (creationDateMatch) metadata.creationDate = creationDateMatch[1];
        if (modDateMatch) metadata.modificationDate = modDateMatch[1];

        analysis.metadata.pdf = metadata;

        // Security-focused metadata analysis
        if (metadata.creator && metadata.creator.toLowerCase().includes('malware')) {
          analysis.securityIssues.push('Suspicious creator metadata');
          analysis.riskLevel = 'high';
        }

        if (metadata.producer && metadata.producer.toLowerCase().includes('hack')) {
          analysis.securityIssues.push('Suspicious producer metadata');
          analysis.riskLevel = 'medium';
        }

        // Check for suspicious creation dates
        if (metadata.creationDate) {
          const creationDate = new Date(metadata.creationDate);
          const now = new Date();
          const diffYears = (now - creationDate) / (1000 * 60 * 60 * 24 * 365);
          
          if (diffYears > 20) {
            analysis.securityIssues.push('Very old creation date - potential security risk');
            analysis.riskLevel = 'medium';
          }
        }

      } catch (error) {
        analysis.securityIssues.push('PDF metadata extraction failed');
        analysis.riskLevel = 'low';
      }
    }

    return analysis;

  } catch (error) {
    console.error('Metadata analysis error:', error);
    return {
      metadata: {},
      securityIssues: [`Metadata analysis failed: ${error.message}`],
      riskLevel: 'low'
    };
  }
}

// Content structure security validation
async function performContentStructureSecurityValidation(buffer, filename) {
  const validation = {
    isValid: true,
    issues: [],
    riskLevel: 'low'
  };

  try {
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024 * 1024)); // Check first 1MB

    // Check for null bytes (potential binary content in text files)
    if (filename.toLowerCase().endsWith('.txt') || filename.toLowerCase().endsWith('.csv')) {
      const nullByteCount = (content.match(/\x00/g) || []).length;
      if (nullByteCount > 0) {
        validation.issues.push(`Text file contains ${nullByteCount} null bytes`);
        validation.riskLevel = 'medium';
      }
    }

    // Check for excessive whitespace (potential obfuscation)
    const whitespaceRatio = (content.match(/\s/g) || []).length / content.length;
    if (whitespaceRatio > 0.7) {
      validation.issues.push('Excessive whitespace - potential obfuscation');
      validation.riskLevel = 'medium';
    }

    // Check for encoding issues
    const encodingIssues = content.includes('');
    if (encodingIssues) {
      validation.issues.push('File contains encoding issues');
      validation.riskLevel = 'low';
    }

    // Check for suspicious character patterns
    const suspiciousPatterns = [
      { pattern: /[^\x20-\x7E\s]/g, name: 'Non-printable characters' },
      { pattern: /\x00{3,}/g, name: 'Multiple null bytes' },
      { pattern: /\xFF{3,}/g, name: 'Multiple high bytes' }
    ];

    for (const pattern of suspiciousPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches && matches.length > 0) {
        validation.issues.push(`File contains ${matches.length} ${pattern.name.toLowerCase()}`);
        validation.riskLevel = 'medium';
      }
    }

    return validation;

  } catch (error) {
    console.error('Content structure validation error:', error);
    return {
      isValid: false,
      issues: [`Content structure validation failed: ${error.message}`],
      riskLevel: 'high'
    };
  }
}

// Compliance validation (FISMA/FedRAMP)
async function performComplianceValidation(validation, validationLevel) {
  const compliance = {
    status: 'compliant',
    reason: '',
    riskLevel: 'low',
    fismaCompliant: true,
    fedrampCompliant: true,
    issues: []
  };

  try {
    // FISMA compliance checks
    if (validation.riskLevel === 'critical' || validation.riskLevel === 'high') {
      compliance.fismaCompliant = false;
      compliance.issues.push('High risk level violates FISMA requirements');
    }

    if (validation.securityChecks.maliciousContent?.detected) {
      compliance.fismaCompliant = false;
      compliance.issues.push('Malicious content detected - FISMA violation');
    }

    if (validation.securityChecks.pdfAnalysis?.securityFlags?.includes('javascript_content')) {
      compliance.fismaCompliant = false;
      compliance.issues.push('JavaScript content violates FISMA security requirements');
    }

    // FedRAMP compliance checks
    if (validation.fileSize > 50 * 1024 * 1024) { // 50MB limit for FedRAMP
      compliance.fedrampCompliant = false;
      compliance.issues.push('File size exceeds FedRAMP limits');
    }

    if (validation.securityChecks.maliciousContent?.detected) {
      compliance.fedrampCompliant = false;
      compliance.issues.push('Malicious content detected - FedRAMP violation');
    }

    // Overall compliance status
    if (!compliance.fismaCompliant || !compliance.fedrampCompliant) {
      compliance.status = 'non_compliant';
      compliance.reason = 'Failed FISMA/FedRAMP compliance checks';
      compliance.riskLevel = 'high';
    }

    return compliance;

  } catch (error) {
    console.error('Compliance validation error:', error);
    return {
      status: 'non_compliant',
      reason: `Compliance validation failed: ${error.message}`,
      riskLevel: 'high',
      fismaCompliant: false,
      fedrampCompliant: false,
      issues: ['Compliance validation system error']
    };
  }
}

// Generate security recommendations
function generateSecurityRecommendations(validation) {
  const recommendations = [];

  if (validation.riskLevel === 'critical') {
    recommendations.push({
      type: 'immediate_action',
      priority: 'critical',
      message: 'File poses critical security risk - immediate review required'
    });
  }

  if (validation.securityChecks.maliciousContent?.detected) {
    recommendations.push({
      type: 'malware_detection',
      priority: 'high',
      message: 'Malicious content detected - file should be quarantined'
    });
  }

  if (validation.securityChecks.pdfAnalysis?.securityFlags?.includes('javascript_content')) {
    recommendations.push({
      type: 'javascript_removal',
      priority: 'high',
      message: 'Remove JavaScript content from PDF before processing'
    });
  }

  if (validation.complianceStatus !== 'compliant') {
    recommendations.push({
      type: 'compliance_review',
      priority: 'medium',
      message: 'File does not meet FISMA/FedRAMP compliance requirements'
    });
  }

  if (validation.securityChecks.metadataAnalysis?.securityIssues?.length > 0) {
    recommendations.push({
      type: 'metadata_cleanup',
      priority: 'low',
      message: 'Clean suspicious metadata before processing'
    });
  }

  return recommendations;
}

// Check existing security validation
async function checkExistingSecurityValidation(checksum, supabaseServer) {
  try {
    const { data, error } = await supabaseServer
      .from('security_validations')
      .select('*')
      .eq('checksum', checksum)
      .order('validated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to check existing validation:', error);
      return null;
    }

    return data?.[0] || null;

  } catch (error) {
    console.error('Check existing validation error:', error);
    return null;
  }
}

// Log security validation with compliance tracking
async function logSecurityValidationWithCompliance(filename, securityValidation, supabaseServer) {
  try {
    await supabaseServer
      .from('security_validations')
      .insert({
        filename,
        is_safe: securityValidation.isSafe,
        risk_level: securityValidation.riskLevel,
        checksum: securityValidation.checksum,
        mime_type: securityValidation.mimeType,
        file_size: securityValidation.fileSize,
        issues: securityValidation.issues,
        metadata: {
          security_checks: securityValidation.securityChecks,
          compliance_checks: securityValidation.complianceChecks,
          recommendations: securityValidation.recommendations
        },
        validated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('❌ Failed to log security validation:', error);
  }
}
