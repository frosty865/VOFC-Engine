import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function POST() {
  try {
    console.log('🧹 Cleaning up fake documents from database...');
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client not available' },
        { status: 500 }
      );
    }

    // Delete all submissions that were auto-synced with fake data
    const { data: deletedData, error } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('source', 'ollama_server_sync')
      .select();

    if (error) {
      console.error('❌ Error cleaning up fake documents:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to clean up fake documents' },
        { status: 500 }
      );
    }

    console.log(`✅ Cleaned up ${deletedData.length} fake documents`);
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedData.length} fake documents`,
      deleted: deletedData.length,
      documents: deletedData
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
