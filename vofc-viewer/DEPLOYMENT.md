
# Vercel Deployment Instructions

## 1. Environment Variables
Set these in your Vercel dashboard:

### Required Variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET

### Optional Variables:
- ADMIN_PASSWORD (for initial setup)
- BACKUP_ENCRYPTION_KEY (for backups)

## 2. Deployment Steps

### Option A: Vercel CLI
```bash
cd vofc-viewer
vercel login
vercel --prod
```

### Option B: GitHub Integration
1. Connect your GitHub repository to Vercel
2. Set the root directory to "vofc-viewer"
3. Set build command to "npm run build"
4. Set output directory to ".next"

## 3. Post-Deployment Setup

1. Run the database setup script:
   ```bash
   node scripts/setup-secure-simple.js
   ```

2. Test the application:
   - Visit your Vercel URL
   - Login with admin credentials
   - Verify all features work

## 4. Security Checklist

- [ ] Environment variables set in Vercel
- [ ] Database setup completed
- [ ] Admin user created
- [ ] SSL certificate active
- [ ] Security headers configured
- [ ] Rate limiting active

## 5. Monitoring

- Check Vercel dashboard for deployment status
- Monitor function logs for errors
- Set up alerts for critical issues
