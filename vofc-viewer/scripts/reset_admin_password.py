import os
import bcrypt
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Reset Admin Password")
print("=" * 50)

# Admin credentials
admin_username = "admin"
admin_password = "Admin123!"

print(f"Resetting password for admin user: {admin_username}")
print(f"New password: {admin_password}")

# Hash the password
hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt(rounds=12))

try:
    # Update admin user password
    result = supabase.table('vofc_users').update({
        'password_hash': hashed_password.decode('utf-8'),
        'is_active': True
    }).eq('username', admin_username).execute()
    
    if result.data:
        print("SUCCESS: Admin password reset successfully!")
        print(f"Username: {admin_username}")
        print(f"Password: {admin_password}")
        print(f"Role: admin")
        print("\nYou can now login with these credentials.")
    else:
        print("ERROR: Failed to reset admin password")
        
except Exception as e:
    print(f"ERROR: {e}")

print("\nAdmin credentials:")
print(f"Username: {admin_username}")
print(f"Password: {admin_password}")
print("\nYou can now login to the application with these credentials.")
