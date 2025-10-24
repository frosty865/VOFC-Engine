import { ollamaChat } from '../adapters/ollamaClient.js';
import fs from 'fs';
import path from 'path';

export class PSADocumentParser {
  private systemPrompt: string;

  constructor() {
    // Load the Senior PSA training prompt
    const promptPath = path.join(process.cwd(), 'server', 'prompts', 'senior_psa_training.prompt.txt');
    this.systemPrompt = fs.readFileSync(promptPath, 'utf-8');
  }

  async parseDocument(documentText: string, documentType: string = 'assessment'): Promise<any> {
    try {
      const messages = [
        {
          role: 'system',
          content: this.systemPrompt
        },
        {
          role: 'user', 
          content: `Document Type: ${documentType}\n\nDocument Content:\n${documentText}\n\nExtract vulnerabilities and OFCs as a Senior PSA would analyze this document.`
        }
      ];

      const response = await ollamaChat(messages, { json: true });
      
      // Validate the response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format from Ollama');
      }

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
        parser: 'Senior PSA Document Parser'
      };

    } catch (error) {
      console.error('PSA Document Parser Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async parseMultipleDocuments(documents: Array<{text: string, type: string, id: string}>): Promise<any> {
    const results = [];
    
    for (const doc of documents) {
      console.log(`Parsing document ${doc.id} (${doc.type})`);
      const result = await this.parseDocument(doc.text, doc.type);
      results.push({
        document_id: doc.id,
        document_type: doc.type,
        ...result
      });
    }

    return {
      success: true,
      total_documents: documents.length,
      results: results,
      timestamp: new Date().toISOString()
    };
  }

  async analyzeVulnerabilityPatterns(parsedData: any[]): Promise<any> {
    // Analyze patterns across multiple parsed documents
    const allVulnerabilities = parsedData.flatMap(doc => doc.data?.vulnerabilities || []);
    const allOFCs = parsedData.flatMap(doc => doc.data?.options_for_consideration || []);

    const disciplineCounts = allVulnerabilities.reduce((acc, vuln) => {
      acc[vuln.discipline] = (acc[vuln.discipline] || 0) + 1;
      return acc;
    }, {});

    const riskLevelCounts = allVulnerabilities.reduce((acc, vuln) => {
      acc[vuln.risk_level] = (acc[vuln.risk_level] || 0) + 1;
      return acc;
    }, {});

    return {
      total_vulnerabilities: allVulnerabilities.length,
      total_ofcs: allOFCs.length,
      discipline_breakdown: disciplineCounts,
      risk_level_breakdown: riskLevelCounts,
      common_themes: this.extractCommonThemes(allVulnerabilities, allOFCs)
    };
  }

  private extractCommonThemes(vulnerabilities: any[], ofcs: any[]): string[] {
    // Simple keyword extraction for common themes
    const allText = [...vulnerabilities, ...ofcs].map(item => item.text).join(' ').toLowerCase();
    
    const securityKeywords = [
      'access control', 'authentication', 'authorization', 'encryption',
      'firewall', 'intrusion detection', 'monitoring', 'surveillance',
      'physical security', 'cybersecurity', 'network security', 'data protection',
      'vulnerability', 'threat', 'risk', 'mitigation', 'protection'
    ];

    return securityKeywords.filter(keyword => allText.includes(keyword));
  }
}
