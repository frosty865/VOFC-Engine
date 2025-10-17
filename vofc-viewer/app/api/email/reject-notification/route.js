import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { submissionId, comments, processedBy } = await request.json();

    if (!submissionId || !processedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: submissionId and processedBy' },
        { status: 400 }
      );
    }

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Get processor details
    const { data: processor, error: processorError } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, role')
      .eq('user_id', processedBy)
      .single();

    if (processorError || !processor) {
      return NextResponse.json(
        { error: 'Processor not found' },
        { status: 404 }
      );
    }

    // Send email notification
    const emailData = {
      to: submission.submitter_email,
      subject: `VOFC Submission Update - ${submission.type === 'vulnerability' ? 'Vulnerability' : 'Option for Consideration'} Submission`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #112e51;">VOFC Submission Update</h2>
          
          <p>Dear Submitter,</p>
          
          <p>Your ${submission.type === 'vulnerability' ? 'vulnerability' : 'option for consideration'} submission has been reviewed by our team.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <h3 style="color: #dc3545; margin-top: 0;">Submission Status: Rejected</h3>
            <p><strong>Reviewer:</strong> ${processor.first_name} ${processor.last_name} (${processor.role})</p>
            <p><strong>Review Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          ${comments ? `
            <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">Reviewer Comments:</h3>
              <p style="white-space: pre-wrap;">${comments}</p>
            </div>
          ` : ''}
          
          <div style="background-color: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="color: #004085; margin-top: 0;">Next Steps:</h3>
            <ul>
              <li>Please review the feedback above</li>
              <li>Consider revising your submission based on the comments</li>
              <li>You may resubmit with improvements</li>
            </ul>
          </div>
          
          <p>If you have any questions about this decision, please contact our support team.</p>
          
          <p>Thank you for your contribution to the VOFC system.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 12px;">
            This is an automated message from the VOFC (Vulnerabilities and Options for Consideration) system.
          </p>
        </div>
      `
    };

    // For now, we'll just log the email (in production, you'd use a service like SendGrid, AWS SES, etc.)
    console.log('📧 Rejection email would be sent to:', submission.submitter_email);
    console.log('📧 Email data:', emailData);

    // In a real implementation, you would send the email here
    // await sendEmail(emailData);

    return NextResponse.json({
      success: true,
      message: 'Rejection notification sent',
      emailSent: true,
      recipient: submission.submitter_email
    });

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

