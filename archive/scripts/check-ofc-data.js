const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOFCData() {
    console.log('Checking OFC data in database...');

    try {
        // Check options_for_consideration table
        const { data: ofcs, error } = await supabase
            .from('options_for_consideration')
            .select('*')
            .limit(10);

        if (error) {
            console.error('Error fetching OFCs:', error);
            return;
        }

        console.log(`Found ${ofcs?.length || 0} OFCs in options_for_consideration table`);

        if (ofcs && ofcs.length > 0) {
            console.log('\nSample OFCs:');
            ofcs.forEach((ofc, index) => {
                console.log(`\n${index + 1}. ID: ${ofc.id}`);
                console.log(`   Text: ${ofc.option_text?.substring(0, 100)}...`);
                console.log(`   Discipline: ${ofc.discipline}`);
                console.log(`   Source: ${ofc.source}`);
            });
        }

        // Also check submissions table for any OFC submissions
        const { data: submissions, error: subError } = await supabase
            .from('submissions')
            .select('*')
            .eq('type', 'ofc')
            .limit(5);

        if (subError) {
            console.error('Error fetching OFC submissions:', subError);
        } else {
            console.log(`\nFound ${submissions?.length || 0} OFC submissions in submissions table`);

            if (submissions && submissions.length > 0) {
                console.log('\nSample OFC submissions:');
                submissions.forEach((sub, index) => {
                    const data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
                    console.log(`\n${index + 1}. Submission ID: ${sub.id}`);
                    console.log(`   Status: ${sub.status}`);
                    console.log(`   Text: ${data.option_text?.substring(0, 100)}...`);
                });
            }
        }

    } catch (error) {
        console.error('Script error:', error);
    }
}

checkOFCData();
