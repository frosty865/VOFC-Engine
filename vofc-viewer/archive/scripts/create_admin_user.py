import os
import bcrypt
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Creating Admin User")
print("=" * 50)

# Admin credentials
admin_username = "admin"
admin_password = "Admin123!"
admin_full_name = "System Administrator"

print(f"Creating admin user: {admin_username}")
print(f"Password: {admin_password}")

# Hash the password
hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt(rounds=12))

try:
    # Insert admin user
    result = supabase.table('vofc_users').insert({
        'username': admin_username,
        'password_hash': hashed_password.decode('utf-8'),
        'full_name': admin_full_name,
        'role': 'admin',
        'agency': 'CISA',
        'is_active': True
    }).execute()
    
    if result.data:
        print("✅ Admin user created successfully!")
        print(f"Username: {admin_username}")
        print(f"Password: {admin_password}")
        print(f"Role: admin")
        print(f"Full Name: {admin_full_name}")
        print("\nYou can now login with these credentials.")
    else:
        print("❌ Failed to create admin user")
        
except Exception as e:
    print(f"❌ Error creating admin user: {e}")
    print("\nTrying to update existing admin user...")
    
    try:
        # Try to update existing admin user
        update_result = supabase.table('vofc_users').update({
            'password_hash': hashed_password.decode('utf-8'),
            'full_name': admin_full_name,
            'role': 'admin',
            'agency': 'CISA',
            'is_active': True
        }).eq('username', admin_username).execute()
        
        if update_result.data:
            print("✅ Admin user updated successfully!")
            print(f"Username: {admin_username}")
            print(f"Password: {admin_password}")
        else:
            print("❌ Failed to update admin user")
            
    except Exception as update_error:
        print(f"❌ Error updating admin user: {update_error}")

print("\nAdmin credentials:")
print(f"Username: {admin_username}")
print(f"Password: {admin_password}")
print("\nYou can now login to the application with these credentials.")
