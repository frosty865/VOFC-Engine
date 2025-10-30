import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for API submissions to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Parse form data
    const formData = await request.formData();
    
    // Extract form fields
    const source_title = formData.get('source_title');
    const source_type = formData.get('source_type');
    const source_url = formData.get('source_url');
    const author_org = formData.get('author_org');
    const publication_year = formData.get('publication_year');
    const content_restriction = formData.get('content_restriction');
    const document = formData.get('file');

    console.log('📄 Processing document via Vercel → Ollama:', {
      source_title,
      source_type,
      author_org,
      document_name: document?.name,
      document_size: document?.size
    });

    // Validate required fields
    if (!source_title || !document) {
      return NextResponse.json(
        { error: 'Missing required fields: source_title and document' },
        { status: 400 }
      );
    }

    // Extract document content
    let documentContent = '';
    try {
      if (document.type === 'text/plain') {
        documentContent = await document.text();
      } else {
        // For other file types, create metadata-based content
        documentContent = `Document: ${source_title}\nOrganization: ${author_org || 'Unknown'}\nYear: ${publication_year || 'Unknown'}\nType: ${document.type}`;
      }
    } catch (contentError) {
      console.warn('⚠️ Could not extract document content:', contentError.message);
      documentContent = `Document: ${source_title}\nOrganization: ${author_org || 'Unknown'}\nYear: ${publication_year || 'Unknown'}`;
    }

    // Send to private Ollama server for processing
    console.log('🤖 Sending document to private Ollama server...');
    
    const ollamaResponse = await fetch('http://10.0.0.213:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'vofc-engine:latest',
        messages: [{
          role: 'user',
          content: `Extract vulnerabilities and options for consideration from this security document:

${documentContent}

Return ONLY valid JSON in this exact format:
{
  "entries": [
    {
      "topic": "Brief descriptive topic",
      "category": "Security Management|Access Control|Perimeter Security|etc.",
      "vulnerability": "Clear statement of the vulnerability",
      "options_for_consideration": [
        "Specific actionable recommendation 1",
        "Specific actionable recommendation 2"
      ],
      "confidence": 0.85,
      "section_context": "Relevant section or context"
    }
  ]
}`
        }],
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama server error: ${ollamaResponse.status}`);
    }

    const ollamaData = await ollamaResponse.json();
    const aiContent = ollamaData.message?.content || '';
    
    console.log('✅ Received response from Ollama server');

    // Parse AI response
    let parsedData;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiContent;
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('❌ Error parsing Ollama response:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Prepare data for Supabase storage
    const submissionData = {
      type: 'document',
      data: JSON.stringify({
        filename: document.name,
        source_title,
        source_type,
        source_url,
        author_org,
        publication_year: publication_year ? parseInt(publication_year) : null,
        content_restriction,
        document_type: document.type,
        document_size: document.size,
        processed_at: new Date().toISOString(),
        processing_method: 'ollama_heuristic_parser',
        entries: parsedData.entries || [],
        extraction_stats: {
          total_entries: parsedData.entries?.length || 0,
          vulnerabilities_found: parsedData.entries?.filter(e => e.vulnerability)?.length || 0,
          ofcs_found: parsedData.entries?.reduce((sum, e) => sum + (e.options_for_consideration?.length || 0), 0) || 0
        }
      }),
      status: 'completed',
      source: 'vercel_ollama_processing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store in Supabase
    const { data: submission, error } = await supabase
      .from('submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({
        success: false,
        error: 'Database storage failed',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ Document processed and stored successfully');

    return NextResponse.json({
      success: true,
      submission_id: submission.id,
      status: 'completed',
      message: 'Document processed successfully',
      extraction_stats: JSON.parse(submissionData.data).extraction_stats,
      entries: parsedData.entries || []
    }, { status: 201 });

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}