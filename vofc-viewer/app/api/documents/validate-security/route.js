import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/supabase-manager';
import crypto from 'crypto';

// Enhanced security validation for document uploads
export async function POST(request) {
  try {
    const { filename, fileData } = await request.json();
    
    console.log(`🔒 Security validation for: ${filename}`);
    
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Convert base64 to buffer for analysis
    const buffer = Buffer.from(fileData, 'base64');
    
    // Perform comprehensive security checks
    const securityChecks = await performSecurityChecks(buffer, filename);
    
    // Log security validation
    await logSecurityValidation(filename, securityChecks, supabaseServer);
    
    if (!securityChecks.isSafe) {
      return NextResponse.json({
        success: false,
        isSafe: false,
        security_issues: securityChecks.issues,
        risk_level: securityChecks.riskLevel,
        message: 'Document failed security validation'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      isSafe: true,
      security_checks: securityChecks,
      message: 'Document passed security validation'
    });

  } catch (error) {
    console.error('❌ Security validation error:', error);
    return NextResponse.json({ error: 'Security validation failed' }, { status: 500 });
  }
}

// Comprehensive security checks
async function performSecurityChecks(buffer, filename) {
  const checks = {
    isSafe: true,
    riskLevel: 'low',
    issues: [],
    checksum: null,
    mimeType: null,
    fileSize: buffer.length,
    metadata: {}
  };

  try {
    // 1. Calculate checksum for deduplication and integrity
    checks.checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    console.log(`📊 File checksum: ${checks.checksum.substring(0, 16)}...`);

    // 2. MIME type validation and sniffing
    const mimeType = await detectMimeType(buffer, filename);
    checks.mimeType = mimeType;
    
    // Validate against allowed MIME types
    const allowedMimeTypes = [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      checks.isSafe = false;
      checks.riskLevel = 'high';
      checks.issues.push(`Unsupported MIME type: ${mimeType}`);
    }

    // 3. File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      checks.isSafe = false;
      checks.riskLevel = 'high';
      checks.issues.push(`File size exceeds limit: ${Math.round(buffer.length / 1024 / 1024)}MB > 10MB`);
    }

    // 4. PDF-specific security checks
    if (filename.toLowerCase().endsWith('.pdf')) {
      const pdfChecks = await validatePdfSecurity(buffer);
      checks.metadata.pdfChecks = pdfChecks;
      
      if (!pdfChecks.isSafe) {
        checks.isSafe = false;
        checks.riskLevel = pdfChecks.riskLevel;
        checks.issues.push(...pdfChecks.issues);
      }
    }

    // 5. Malicious content detection
    const maliciousContent = await detectMaliciousContent(buffer);
    if (maliciousContent.detected) {
      checks.isSafe = false;
      checks.riskLevel = 'critical';
      checks.issues.push(`Malicious content detected: ${maliciousContent.type}`);
    }

    // 6. Metadata extraction and validation
    const metadata = await extractFileMetadata(buffer, filename);
    checks.metadata = { ...checks.metadata, ...metadata };

    // 7. Content structure validation
    const structureValidation = await validateContentStructure(buffer, filename);
    if (!structureValidation.isValid) {
      checks.issues.push(`Content structure issues: ${structureValidation.issues.join(', ')}`);
      if (structureValidation.riskLevel === 'high') {
        checks.isSafe = false;
        checks.riskLevel = 'high';
      }
    }

    console.log(`🔒 Security validation completed: ${checks.isSafe ? 'SAFE' : 'UNSAFE'} (${checks.riskLevel})`);
    
    return checks;

  } catch (error) {
    console.error('❌ Security check error:', error);
    return {
      isSafe: false,
      riskLevel: 'critical',
      issues: [`Security check failed: ${error.message}`],
      checksum: null,
      mimeType: null,
      fileSize: buffer.length,
      metadata: {}
    };
  }
}

// Detect MIME type using file signature
async function detectMimeType(buffer, filename) {
  const signatures = {
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    'text/plain': [0xEF, 0xBB, 0xBF], // UTF-8 BOM
    'application/msword': [0xD0, 0xCF, 0x11, 0xE0], // DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // DOCX
    'application/vnd.ms-excel': [0xD0, 0xCF, 0x11, 0xE0], // XLS
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04], // XLSX
    'text/csv': [0xEF, 0xBB, 0xBF] // UTF-8 BOM or comma-separated
  };

  // Check file signatures
  for (const [mimeType, signature] of Object.entries(signatures)) {
    if (buffer.length >= signature.length) {
      const matches = signature.every((byte, index) => buffer[index] === byte);
      if (matches) {
        return mimeType;
      }
    }
  }

  // Fallback to filename extension
  const extension = filename.split('.').pop().toLowerCase();
  const extensionMap = {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  return extensionMap[extension] || 'application/octet-stream';
}

// PDF-specific security validation
async function validatePdfSecurity(buffer) {
  const checks = {
    isSafe: true,
    riskLevel: 'low',
    issues: []
  };

  try {
    const content = buffer.toString('binary');
    
    // Check for PDF version
    const pdfVersionMatch = content.match(/%PDF-(\d+\.\d+)/);
    if (pdfVersionMatch) {
      const version = parseFloat(pdfVersionMatch[1]);
      if (version < 1.4) {
        checks.issues.push(`Old PDF version: ${pdfVersionMatch[1]}`);
        checks.riskLevel = 'medium';
      }
    }

    // Check for JavaScript (potential security risk)
    if (content.includes('/JavaScript') || content.includes('/JS')) {
      checks.isSafe = false;
      checks.riskLevel = 'high';
      checks.issues.push('PDF contains JavaScript - potential security risk');
    }

    // Check for embedded files
    if (content.includes('/EmbeddedFile') || content.includes('/FileAttachment')) {
      checks.issues.push('PDF contains embedded files');
      checks.riskLevel = 'medium';
    }

    // Check for forms (potential data collection)
    if (content.includes('/AcroForm') || content.includes('/XFA')) {
      checks.issues.push('PDF contains interactive forms');
      checks.riskLevel = 'medium';
    }

    // Check for encryption
    if (content.includes('/Encrypt') || content.includes('/Filter')) {
      checks.issues.push('PDF is encrypted or filtered');
      checks.riskLevel = 'medium';
    }

    // Check for external references
    const externalRefs = content.match(/\/URI\s*\([^)]+\)/g);
    if (externalRefs && externalRefs.length > 0) {
      checks.issues.push(`PDF contains ${externalRefs.length} external references`);
      checks.riskLevel = 'medium';
    }

    // Check for suspicious objects
    const suspiciousPatterns = [
      /\/Launch\s*\(/g, // Launch actions
      /\/GoToR\s*\(/g, // Go to remote
      /\/SubmitForm\s*\(/g, // Form submission
      /\/ImportData\s*\(/g // Data import
    ];

    for (const pattern of suspiciousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        checks.issues.push(`PDF contains potentially suspicious actions: ${pattern.source}`);
        checks.riskLevel = 'high';
      }
    }

    return checks;

  } catch (error) {
    return {
      isSafe: false,
      riskLevel: 'critical',
      issues: [`PDF validation failed: ${error.message}`]
    };
  }
}

// Detect malicious content patterns
async function detectMaliciousContent(buffer) {
  const maliciousPatterns = [
    // Executable signatures
    { pattern: /MZ/, type: 'PE executable' },
    { pattern: /\x7fELF/, type: 'ELF executable' },
    { pattern: /\xca\xfe\xba\xbe/, type: 'Java class file' },
    
    // Script signatures
    { pattern: /<script[^>]*>/i, type: 'JavaScript' },
    { pattern: /<iframe[^>]*>/i, type: 'HTML iframe' },
    { pattern: /<object[^>]*>/i, type: 'HTML object' },
    
    // Suspicious strings
    { pattern: /eval\s*\(/i, type: 'JavaScript eval' },
    { pattern: /document\.write/i, type: 'DOM manipulation' },
    { pattern: /window\.open/i, type: 'Window opening' },
    
    // Base64 encoded content (potential obfuscation)
    { pattern: /data:text\/html;base64,/i, type: 'Base64 HTML' },
    { pattern: /data:application\/javascript;base64,/i, type: 'Base64 JavaScript' }
  ];

  const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024 * 1024)); // Check first 1MB

  for (const { pattern, type } of maliciousPatterns) {
    if (pattern.test(content)) {
      return { detected: true, type };
    }
  }

  return { detected: false, type: null };
}

// Extract file metadata
async function extractFileMetadata(buffer, filename) {
  const metadata = {
    filename,
    size: buffer.length,
    created: new Date().toISOString(),
    extension: filename.split('.').pop().toLowerCase()
  };

  // PDF metadata extraction
  if (filename.toLowerCase().endsWith('.pdf')) {
    try {
      const content = buffer.toString('binary');
      
      // Extract PDF metadata
      const titleMatch = content.match(/\/Title\s*\(([^)]+)\)/);
      const authorMatch = content.match(/\/Author\s*\(([^)]+)\)/);
      const subjectMatch = content.match(/\/Subject\s*\(([^)]+)\)/);
      const creatorMatch = content.match(/\/Creator\s*\(([^)]+)\)/);
      const producerMatch = content.match(/\/Producer\s*\(([^)]+)\)/);
      
      metadata.pdf = {
        title: titleMatch ? titleMatch[1] : null,
        author: authorMatch ? authorMatch[1] : null,
        subject: subjectMatch ? subjectMatch[1] : null,
        creator: creatorMatch ? creatorMatch[1] : null,
        producer: producerMatch ? producerMatch[1] : null
      };
    } catch (error) {
      metadata.pdf = { error: 'Failed to extract PDF metadata' };
    }
  }

  return metadata;
}

// Validate content structure
async function validateContentStructure(buffer, filename) {
  const validation = {
    isValid: true,
    riskLevel: 'low',
    issues: []
  };

  try {
    // Check for null bytes (potential binary content in text files)
    if (filename.toLowerCase().endsWith('.txt') || filename.toLowerCase().endsWith('.csv')) {
      const nullByteCount = (buffer.toString('binary').match(/\x00/g) || []).length;
      if (nullByteCount > 0) {
        validation.issues.push(`Text file contains ${nullByteCount} null bytes`);
        validation.riskLevel = 'medium';
      }
    }

    // Check for excessive whitespace (potential obfuscation)
    const content = buffer.toString('utf-8');
    const whitespaceRatio = (content.match(/\s/g) || []).length / content.length;
    if (whitespaceRatio > 0.5) {
      validation.issues.push('High whitespace ratio - potential obfuscation');
      validation.riskLevel = 'medium';
    }

    // Check for encoding issues
    const utf8Content = buffer.toString('utf-8');
    const hasEncodingIssues = utf8Content.includes('');
    if (hasEncodingIssues) {
      validation.issues.push('File contains encoding issues');
      validation.riskLevel = 'low';
    }

    return validation;

  } catch (error) {
    return {
      isValid: false,
      riskLevel: 'high',
      issues: [`Content structure validation failed: ${error.message}`]
    };
  }
}

// Log security validation results with enhanced schema
async function logSecurityValidation(filename, securityChecks, supabaseServer) {
  try {
    // Get current user's agency (if authenticated)
    let agencyId = null;
    try {
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (user) {
        const { data: userAgency } = await supabaseServer
          .from('user_agency_relationships')
          .select('agency_id')
          .eq('user_id', user.id)
          .single();
        agencyId = userAgency?.agency_id;
      }
    } catch (authError) {
      console.log('⚠️ No authenticated user for security validation');
    }

    // Insert security validation with agency relationship
    const { data: validationRecord, error: validationError } = await supabaseServer
      .from('security_validations')
      .insert({
        filename,
        is_safe: securityChecks.isSafe,
        risk_level: securityChecks.riskLevel,
        checksum: securityChecks.checksum,
        mime_type: securityChecks.mimeType,
        file_size: securityChecks.fileSize,
        issues: securityChecks.issues,
        metadata: securityChecks.metadata,
        agency_id: agencyId,
        validated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (validationError) {
      throw validationError;
    }

    // Log security audit trail
    await supabaseServer
      .from('security_audit_trail')
      .insert({
        user_id: null, // Will be populated if user is authenticated
        agency_id: agencyId,
        action: 'document_security_validation',
        resource_type: 'document',
        resource_id: filename,
        details: {
          validation_id: validationRecord.id,
          risk_level: securityChecks.riskLevel,
          issues_count: securityChecks.issues.length,
          is_safe: securityChecks.isSafe
        },
        ip_address: null, // Could be extracted from request headers
        user_agent: null, // Could be extracted from request headers
        created_at: new Date().toISOString()
      });

    console.log(`✅ Security validation logged for ${filename} (${securityChecks.isSafe ? 'SAFE' : 'UNSAFE'})`);

  } catch (error) {
    console.error('❌ Failed to log security validation:', error);
  }
}
