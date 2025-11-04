// Script to add existing documents from Ollama server to Supabase submissions table
import { supabaseAdmin } from '../lib/supabase-client.js';

async function addExistingDocuments() {
  console.log('📄 Adding existing documents from Ollama server to database...');
  
  // List of documents that exist on Ollama server but aren't in database
  const existingDocuments = [
    {
      type: 'ofc',
      data: JSON.stringify({
        source_title: 'Document 1 from Ollama',
        source_type: 'unknown',
        source_url: null,
        author_org: null,
        publication_year: null,
        content_restriction: 'public',
        document_name: 'document1.pdf', // Replace with actual filename
        document_type: 'application/pdf',
        document_size: 1024000, // Replace with actual size
        local_file_path: '/var/ollama/uploads/document1.pdf', // Replace with actual path
        storage_type: 'ollama_server'
      }),
      status: 'pending_review',
      source: 'ollama_server_existing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      type: 'ofc',
      data: JSON.stringify({
        source_title: 'Document 2 from Ollama',
        source_type: 'unknown',
        source_url: null,
        author_org: null,
        publication_year: null,
        content_restriction: 'public',
        document_name: 'document2.pdf', // Replace with actual filename
        document_type: 'application/pdf',
        document_size: 2048000, // Replace with actual size
        local_file_path: '/var/ollama/uploads/document2.pdf', // Replace with actual path
        storage_type: 'ollama_server'
      }),
      status: 'pending_review',
      source: 'ollama_server_existing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  try {
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .insert(existingDocuments)
      .select();

    if (error) {
      console.error('❌ Error adding documents:', error);
      return;
    }

    console.log('✅ Successfully added documents to database:', data);
    console.log('📊 Document Processor should now show these documents');
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
}

// Run the script
addExistingDocuments();
