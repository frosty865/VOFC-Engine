import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

// Use service role for API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  // Check admin authentication
  const { user, error: authError } = await requireAdmin(request);
  if (authError) {
    return NextResponse.json({ error: String(authError) }, { status: 403 });
  }

  try {
    const { action } = await request.json();
    
    if (action === 'status') {
      // Get learning system status from database
      try {
        // Try to get learning events count and stats from database
        const { data: events, error: eventsError } = await supabase
          .from('learning_events')
          .select('*', { count: 'exact', head: false })
          .order('created_at', { ascending: false })
          .limit(100);

        const { count: totalEvents } = await supabase
          .from('learning_events')
          .select('*', { count: 'exact', head: true });

        const { count: approvedCount } = await supabase
          .from('learning_events')
          .select('*', { count: 'exact', head: true })
          .eq('approved', true);

        const { data: lastEvent } = await supabase
          .from('learning_events')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Check if Python script exists (optional, for future use)
        const pythonScript = path.join(process.cwd(), 'apps', 'backend', 'continuous_intelligence.py');
        const scriptExists = fs.existsSync(pythonScript);

        const learningStatus = {
          daemon_status: 'available', // Always available via API
          last_learning_run: lastEvent?.created_at || null,
          learning_stats: {
            total_events_processed: totalEvents || 0,
            approved_events: approvedCount || 0,
            rules_generated: 0, // Can be calculated from rules table if it exists
            successful_retrains: 0,
            failed_retrains: 0,
            embeddings_updated: 0
          },
          python_script_available: scriptExists,
          last_check: new Date().toISOString()
        };

        return NextResponse.json({
          success: true,
          status: learningStatus
        });

      } catch (dbError) {
        console.error('Error fetching learning status from database:', dbError);
        // Return fallback status if database query fails
        return NextResponse.json({
          success: true,
          status: {
            daemon_status: 'available',
            last_learning_run: null,
            learning_stats: {
              total_events_processed: 0,
              approved_events: 0,
              rules_generated: 0,
              successful_retrains: 0,
              failed_retrains: 0,
              embeddings_updated: 0
            },
            python_script_available: false,
            last_check: new Date().toISOString(),
            warning: 'Database query failed, showing fallback status'
          }
        });
      }
      
    } else if (action === 'start') {
      // Start the continuous learning daemon
      const pythonScript = path.join(process.cwd(), 'apps', 'backend', 'continuous_intelligence.py');
      
      if (!fs.existsSync(pythonScript)) {
        return NextResponse.json({
          success: false,
          error: 'Continuous learning script not found. Learning is available via API only.',
          message: 'The system can process learning events through the database automatically.'
        }, { status: 404 });
      }
      
      console.log('Starting Continuous Learning System...');
      
      try {
        const pythonProcess = spawn('python', [pythonScript, 'start'], {
          cwd: process.cwd(),
          detached: true,
          stdio: 'pipe'
        });
        
        const processId = pythonProcess.pid;
        console.log(`Continuous Learning started with PID: ${processId}`);
        
        return NextResponse.json({
          success: true,
          message: 'Continuous Learning System started',
          processId: processId,
          status: 'running'
        });
      } catch (spawnError) {
        console.error('Error spawning learning process:', spawnError);
        return NextResponse.json({
          success: false,
          error: 'Failed to start learning process',
          details: spawnError.message
        }, { status: 500 });
      }
      
    } else if (action === 'cycle') {
      // Run a single learning cycle
      const pythonScript = path.join(process.cwd(), 'apps', 'backend', 'continuous_intelligence.py');
      
      if (!fs.existsSync(pythonScript)) {
        return NextResponse.json({
          success: false,
          error: 'Continuous learning script not found',
          message: 'Learning cycles can be triggered manually through database queries.'
        }, { status: 404 });
      }
      
      console.log('Running single learning cycle...');
      
      const pythonProcess = spawn('python', [pythonScript, 'cycle'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      let output = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pythonProcess.kill();
          resolve(NextResponse.json({
            success: false,
            error: 'Learning cycle timed out after 60 seconds',
            output: output,
            error: error
          }));
        }, 60000);

        pythonProcess.on('close', (code) => {
          clearTimeout(timeout);
          console.log(`Learning cycle completed with code: ${code}`);
          
          resolve(NextResponse.json({
            success: code === 0,
            message: 'Learning cycle completed',
            output: output,
            error: error,
            exitCode: code
          }));
        });
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use: start, cycle, or status'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error in learning API:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to execute learning action'
    }, { status: 500 });
  }
}
