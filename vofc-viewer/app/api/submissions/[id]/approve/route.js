import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for API submissions to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, comments, processedBy } = body; // action: 'approve' or 'reject'

    if (!id) {
      return NextResponse.json(
        { error: 'Missing submission ID' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get the submission first
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    if (submission.status !== 'pending_review') {
      return NextResponse.json(
        { error: 'Submission has already been processed' },
        { status: 400 }
      );
    }

    // Update submission status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updateData = {
      status: newStatus,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Only add processed_by if it's a valid UUID
    if (processedBy && processedBy !== '00000000-0000-0000-0000-000000000000') {
      updateData.processed_by = processedBy;
    }
    
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update submission', details: updateError.message },
        { status: 500 }
      );
    }

    // If approved, add to the appropriate table (vulnerabilities or options_for_consideration)
    if (action === 'approve') {
      const submissionData = JSON.parse(submission.data);
      
      if (submission.type === 'vulnerability') {
        const vulnerabilityId = crypto.randomUUID();
        
        // Insert vulnerability
        const { error: vulnError } = await supabase
          .from('vulnerabilities')
          .insert([{
            id: vulnerabilityId,
            vulnerability: submissionData.vulnerability,
            discipline: submissionData.discipline || 'General',
            source: submissionData.sources || null,
            id: submissionData.id || null,
            id: submissionData.id || null
          }]);

        if (vulnError) {
          console.error('Error adding vulnerability:', vulnError);
          return NextResponse.json(
            { error: 'Failed to add vulnerability to database', details: vulnError.message },
            { status: 500 }
          );
        }

        // Automatically generate multiple assessment assessment_questions for this vulnerability
        try {
          
          // Generate 5-10 assessment_questions for each vulnerability
          const numQuestions = Math.floor(Math.random() * 6) + 5; // 5-10 assessment_questions
          const questionsToInsert = [];
          
          for (let i = 0; i < numQuestions; i++) {
            try {
              const { data: questionData, error: questionError } = await supabase.functions.invoke('generate-question-i18n', {
                body: { text: submissionData.vulnerability }
              });

              if (!questionError && questionData) {
                questionsToInsert.push({
                  id: vulnerabilityId,
                  question_text: questionData.en,
                  question_en: questionData.en,
                  question_es: questionData.es,
                  is_root: true
                });
              }
            } catch (singleQuestionError) {
              console.error(`Error generating question ${i+1}:`, singleQuestionError);
            }
          }
          
          // Insert all generated assessment_questions at once
          if (questionsToInsert.length > 0) {
            const { error: insertQuestionsError } = await supabase
              .from('assessment_questions')
              .insert(questionsToInsert);

            if (insertQuestionsError) {
              console.error('Error inserting generated assessment_questions:', insertQuestionsError);
            } else {
            }
          }
        } catch (questionGenError) {
          console.error('Error in question generation process:', questionGenError);
        }

        // If this vulnerability has associated OFCs, create them and link them
        if (submissionData.has_associated_ofcs && submissionData.associated_ofcs) {
          for (const ofcText of submissionData.associated_ofcs) {
            const ofcId = crypto.randomUUID();
            
            // Insert OFC
            const { error: ofcError } = await supabase
              .from('options_for_consideration')
              .insert([{
                id: ofcId,
                option_text: ofcText,
                discipline: submissionData.discipline || 'General',
                source: submissionData.sources || null,
                id: submissionData.id || null,
                id: submissionData.id || null
              }]);

            if (ofcError) {
              console.error('Error adding OFC:', ofcError);
              continue; // Continue with other OFCs even if one fails
            }

            // Create link between vulnerability and OFC
            const { error: linkError } = await supabase
              .from('vulnerability_ofc_links')
              .insert([{
                id: vulnerabilityId,
                id: ofcId,
                link_type: 'direct',
                confidence_score: 1
              }]);

            if (linkError) {
              console.error('Error creating vulnerability-OFC link:', linkError);
            }
          }
        }
      } else if (submission.type === 'ofc') {
        const ofcId = crypto.randomUUID();
        
        // Insert OFC
        const { error: ofcError } = await supabase
          .from('options_for_consideration')
          .insert([{
            id: ofcId,
            option_text: submissionData.option_text,
            discipline: submissionData.discipline || 'General',
            source: submissionData.sources || null,
            id: submissionData.id || null,
            id: submissionData.id || null
          }]);

        if (ofcError) {
          console.error('Error adding OFC:', ofcError);
          return NextResponse.json(
            { error: 'Failed to add option for consideration to database', details: ofcError.message },
            { status: 500 }
          );
        }

        // If this OFC is associated with a vulnerability, try to find and link it
        if (submissionData.associated_vulnerability) {
          // Find the vulnerability by text match
          const { data: vulnerabilities, error: findError } = await supabase
            .from('vulnerabilities')
            .select('id')
            .eq('vulnerability', submissionData.associated_vulnerability)
            .limit(1);

          if (!findError && vulnerabilities && vulnerabilities.length > 0) {
            const { error: linkError } = await supabase
              .from('vulnerability_ofc_links')
              .insert([{
                id: vulnerabilities[0].id,
                id: ofcId,
                link_type: 'direct',
                confidence_score: 1
              }]);

            if (linkError) {
              console.error('Error creating vulnerability-OFC link:', linkError);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: `Submission ${action}d successfully`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
