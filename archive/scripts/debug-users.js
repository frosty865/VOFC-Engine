const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
    console.log('Checking vofc_users table...');

    try {
        const { data, error } = await supabase
            .from('vofc_users')
            .select('*');

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Users found:', data?.length || 0);
            if (data && data.length > 0) {
                console.log('Users:');
                data.forEach((user, index) => {
                    console.log(`${index + 1}. Username: ${user.username}, Role: ${user.role}, Active: ${user.is_active}`);
                });
            } else {
                console.log('No users found in vofc_users table');
                console.log('You may need to run: node scripts/manageUsers.js');
            }
        }
    } catch (err) {
        console.error('Script error:', err);
    }
}

checkUsers();
