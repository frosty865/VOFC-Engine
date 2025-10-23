import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Creating Supabase Auth Admin User")
print("=" * 50)

# Admin credentials
admin_email = "admin@vofc.gov"
admin_password = "Admin123!"

print(f"Creating admin user with email: {admin_email}")
print(f"Password: {admin_password}")

try:
    # Create admin user in Supabase Auth
    result = supabase.auth.admin.create_user({
        "email": admin_email,
        "password": admin_password,
        "email_confirm": True,
        "user_metadata": {
            "role": "admin",
            "name": "System Administrator"
        }
    })
    
    if result.data:
        print("SUCCESS: Admin user created in Supabase Auth!")
        print(f"Email: {admin_email}")
        print(f"Password: {admin_password}")
        print(f"User ID: {result.data.user.id}")
        print(f"Role: admin")
    else:
        print("ERROR: Failed to create admin user")
        
except Exception as e:
    print(f"ERROR: {e}")
    print("\nTrying to update existing admin user...")
    
    try:
        # Try to update existing admin user
        update_result = supabase.auth.admin.update_user_by_id(
            admin_email,  # This might need the actual user ID
            {
                "password": admin_password,
                "email_confirm": True,
                "user_metadata": {
                    "role": "admin",
                    "name": "System Administrator"
                }
            }
        )
        
        if update_result.data:
            print("SUCCESS: Admin user updated!")
            print(f"Email: {admin_email}")
            print(f"Password: {admin_password}")
        else:
            print("ERROR: Failed to update admin user")
            
    except Exception as update_error:
        print(f"ERROR updating admin user: {update_error}")

print("\nAdmin credentials for Supabase Auth:")
print(f"Email: {admin_email}")
print(f"Password: {admin_password}")
print("\nYou can now login to the application with these credentials.")
