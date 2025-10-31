import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { vulnerabilityText, discipline, count = 3 } = await request.json();
    
    // Send OFC generation instruction to Ollama server
    const ollamaResponse = await fetch('http://10.0.0.213:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'vofc-engine:latest',
        messages: [{
          role: 'user',
          content: `Generate ${count} Options for Consideration (OFCs) for this vulnerability in the ${discipline} discipline:

${vulnerabilityText}

Return ONLY valid JSON in this exact format:
{
  "ofcs": [
    {
      "title": "OFC title",
      "description": "Detailed description",
      "implementation_steps": ["step1", "step2", "step3"],
      "priority": "high|medium|low",
      "estimated_effort": "hours|days|weeks",
      "resources_needed": ["resource1", "resource2"]
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

    const result = await ollamaResponse.json();
    return NextResponse.json({
      success: true,
      ofcs: result.message?.content || result.response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Generate OFCs Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
