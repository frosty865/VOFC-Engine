import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request) {
  try {
    const { action } = await request.json();
    
    if (action === 'start') {
      // Start the continuous learning daemon
      const pythonScript = path.join(process.cwd(), 'apps', 'backend', 'continuous_intelligence.py');
      
      console.log('🧠 Starting Continuous Learning System...');
      
      const pythonProcess = spawn('python', [pythonScript, 'start'], {
        cwd: process.cwd(),
        detached: true,
        stdio: 'pipe'
      });
      
      // Store process ID for later management
      const processId = pythonProcess.pid;
      
      console.log(`✅ Continuous Learning started with PID: ${processId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Continuous Learning System started',
        processId: processId,
        status: 'running'
      });
      
    } else if (action === 'cycle') {
      // Run a single learning cycle
      const pythonScript = path.join(process.cwd(), 'apps', 'backend', 'continuous_intelligence.py');
      
      console.log('🔄 Running single learning cycle...');
      
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
        pythonProcess.on('close', (code) => {
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
      
    } else if (action === 'status') {
      // Get learning system status
      const pythonScript = path.join(process.cwd(), 'apps', 'backend', 'continuous_intelligence.py');
      
      console.log('📊 Getting learning system status...');
      
      const pythonProcess = spawn('python', [pythonScript, 'status'], {
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
        pythonProcess.on('close', (code) => {
          try {
            const status = JSON.parse(output);
            resolve(NextResponse.json({
              success: true,
              status: status
            }));
          } catch (parseError) {
            resolve(NextResponse.json({
              success: false,
              error: 'Failed to parse status',
              rawOutput: output,
              rawError: error
            }));
          }
        });
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use: start, cycle, or status'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Error in learning API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to execute learning action'
    }, { status: 500 });
  }
}
