#!/usr/bin/env python3
"""
Debug environment variables for VOFC import.
"""

import os
from dotenv import load_dotenv

def debug_environment():
    """Debug environment variable loading."""
    print("VOFC Environment Debug")
    print("=" * 40)
    
    # Load .env files
    load_dotenv('.env')
    load_dotenv('.env.local')
    
    # Check for required variables
    required_vars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
    ]
    
    print("Environment Variables:")
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask the key for security
            if 'KEY' in var:
                masked_value = value[:10] + '...' + value[-10:] if len(value) > 20 else '***'
                print(f"✅ {var}: {masked_value}")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: Not found")
    
    # Check all environment variables that start with SUPABASE
    print("\nAll Supabase-related variables:")
    for key, value in os.environ.items():
        if 'SUPABASE' in key.upper():
            if 'KEY' in key.upper():
                masked_value = value[:10] + '...' + value[-10:] if len(value) > 20 else '***'
                print(f"  {key}: {masked_value}")
            else:
                print(f"  {key}: {value}")
    
    # Check if .env files exist
    print("\nFile Check:")
    if os.path.exists('.env'):
        print("✅ .env file exists")
    else:
        print("❌ .env file not found")
    
    if os.path.exists('.env.local'):
        print("✅ .env.local file exists")
    else:
        print("❌ .env.local file not found")

if __name__ == "__main__":
    debug_environment()

