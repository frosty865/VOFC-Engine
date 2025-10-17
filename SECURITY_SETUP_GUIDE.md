# Security Setup Guide

## Next Steps for Secure Implementation

### 1. Database Setup
Run the secure authentication setup:
```bash
node scripts/setup-secure-auth.js
```

### 2. Test the Application
Start your development server:
```bash
npm run dev
```

### 3. Security Features Now Available

#### Authentication
- ✅ Server-side JWT authentication
- ✅ No localStorage dependencies
- ✅ Secure HTTP-only cookies
- ✅ Account lockout protection

#### Data Protection
- ✅ XSS prevention with HTML sanitization
- ✅ Input validation and sanitization
- ✅ Secure password hashing (bcrypt)

#### Database Security
- ✅ Row Level Security (RLS) policies
- ✅ Encrypted password storage
- ✅ Secure session management

#### Backup System
- ✅ Automated encrypted backups
- ✅ Backup integrity verification
- ✅ Retention policies

### 4. API Endpoints

#### Authentication
- `POST /api/auth/login` - Secure login
- `GET /api/auth/verify` - Token verification
- `POST /api/auth/logout` - Secure logout

#### Monitoring
- `GET /api/health` - Health check
- `GET /api/metrics` - System metrics (admin only)

#### Backup (Admin Only)
- `POST /api/backup/create` - Create backup
- `GET /api/backup/list` - List backups

### 5. Security Components

#### SafeHTML Component
Use `<SafeHTML content={htmlContent} />` instead of `dangerouslySetInnerHTML`

#### Authentication
Use `AuthClient.getCurrentUser()` instead of localStorage

### 6. Testing Security

#### Test Authentication
1. Try logging in with invalid credentials
2. Check rate limiting (5 attempts per 15 minutes)
3. Verify session persistence

#### Test XSS Protection
1. Submit content with HTML/JavaScript
2. Verify it's sanitized in display

#### Test Backup System
1. Create a backup (admin only)
2. Verify encryption
3. Test restore process

## Security Checklist

- [ ] Change default admin password
- [ ] Test all authentication flows
- [ ] Verify XSS protection
- [ ] Test backup system
- [ ] Check monitoring endpoints
- [ ] Review security logs

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check JWT_SECRET in .env.local
   - Verify database connection
   - Check browser cookies

2. **XSS protection not working**
   - Ensure SafeHTML component is used
   - Check DOMPurify installation

3. **Backup system not working**
   - Check BACKUP_ENCRYPTION_KEY
   - Verify backup directory permissions
   - Check database connection

### Support
- Check console logs for errors
- Review security documentation
- Test individual components
