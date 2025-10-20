#!/bin/bash
# Vercel Environment Variables Setup Script
# Run this after: vercel login

echo "Setting up environment variables for VOFC Engine..."

vercel env add NEXT_PUBLIC_SUPABASE_URL "https://wivohgbuuwxoyfyzntsd.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJlUzI1NilsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpdm9oZ2J1dXd4b3lmeXpudHNkliwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2OTQyNDksImV4cCI6MjA3NTI3MDI0OX0.Vb7uUOkQ34bKSdufED8VXYPHTTJvZqQhgMKcJgTKSIg"
vercel env add SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJlUzI1NilsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZil6Indpdm9oZ2J1dXd4b3lmeXpudHNkliwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY5NDI0OSwiZXhwljoyMDc1MjcwMjQ5fQ.uVMA5t2eMCDbmj-jv6F-pzDEopHvFv-4CzpnJLowWEo"
vercel env add JWT_SECRET "vofc-engine-jwt-secret-2024-secure-key-change-in-production"
vercel env add ADMIN_PASSWORD "AdminSecure2024!"
vercel env add BACKUP_ENCRYPTION_KEY "vofc-backup-encryption-key-2024-secure"
vercel env add DATABASE_PASSWORD "PatriciaF123!!!"
vercel env add PROJECT_ID "wivohgbuuwxoyfyzntsd"

echo "✅ All environment variables set!"
echo "🚀 You can now deploy with: vercel --prod"
