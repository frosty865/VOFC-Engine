# VOFC User Management System

## Overview
This system provides user authentication and authorization for the VOFC (Vulnerability and Options for Consideration Engine) application. It includes user roles, session management, and secure authentication.

## User Roles

### 1. **SPSA (Supervisory PSA Admin)**
- **Username**: `spsa_admin`
- **Password**: `YourStrongPassword1!`
- **Permissions**: Full write access, can manage all data
- **Agency**: CISA Region 4

### 2. **PSA (Protective Security Advisor)**
- **Username**: `psa_field`
- **Password**: `YourStrongPassword2!`
- **Permissions**: Write access to questions, vulnerabilities, and OFCs
- **Agency**: CISA Region 4

### 3. **Validator**
- **Username**: `validator_user`
- **Password**: `YourStrongPassword3!`
- **Permissions**: Can validate staging records
- **Agency**: N/A

## Database Schema

### Tables Created:
- `vofc_users` - User accounts and profiles
- `user_sessions` - Active user sessions
- `user_permissions` - Role-based permissions

### Key Functions:
- `authenticate_user(username, password)` - User authentication
- `create_user_session(user_id, token, expires)` - Session creation
- `validate_session(token)` - Session validation

## Setup Instructions

### 1. Install Dependencies
```bash
npm install bcryptjs dotenv
```

### 2. Create Database Schema
Run the SQL schema file in your Supabase database:
```sql
-- Run vofc-viewer/sql/user_schema.sql
```

### 3. Seed Initial Users
```bash
npm run seed-users
```

### 4. Environment Variables
Ensure your `.env.local` includes:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/validate` - Session validation

### Usage Examples

#### Login Request:
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'spsa_admin',
    password: 'YourStrongPassword1!'
  })
});
```

#### Session Validation:
```javascript
const response = await fetch('/api/auth/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_token: 'your_session_token'
  })
});
```

## Security Features

### Password Security
- Passwords are hashed using bcryptjs with salt rounds of 10
- No plain text passwords stored in database

### Session Management
- Session tokens are cryptographically secure (32 bytes)
- Sessions expire after 24 hours
- Automatic cleanup of expired sessions

### Row Level Security (RLS)
- Users can only access their own data
- Admins have access to all user data
- Proper permission checks on all operations

## Integration with Validation System

The user management system integrates with the validation system:

```javascript
// Example validation with user context
supabase.rpc('update_validation_status', {
  p_record_id: record.id,
  p_new_status: 'Validated',
  p_validator: currentUser.full_name, // From authenticated user
  p_comments: 'Validated per FEMA 426 p.32'
});
```

## Frontend Integration

### Login Component
The `LoginForm` component provides:
- Username/password authentication
- Session token storage
- User profile display
- Logout functionality

### User Context
User information is stored in localStorage:
- `session_token` - For API authentication
- `user` - User profile data

## Testing

### Test Users Available:
1. **SPSA Admin**: Full administrative access
2. **PSA Field**: Field advisor access
3. **Validator**: Validation-only access

### Test the System:
1. Navigate to the main page
2. Use the login form with test credentials
3. Verify user role and permissions
4. Test session persistence across page refreshes

## Troubleshooting

### Common Issues:
1. **Database Connection**: Ensure Supabase credentials are correct
2. **User Creation**: Check service role key permissions
3. **Session Issues**: Verify session token format and expiration
4. **RLS Policies**: Ensure proper row-level security setup

### Debug Steps:
1. Check browser console for API errors
2. Verify database schema is created correctly
3. Test user authentication in Supabase dashboard
4. Validate session tokens are being generated correctly

## Security Considerations

### Production Deployment:
1. Change default passwords immediately
2. Use strong, unique passwords
3. Enable HTTPS for all communications
4. Regularly rotate session tokens
5. Monitor authentication logs
6. Implement rate limiting on login attempts

### Best Practices:
1. Never log passwords or session tokens
2. Use secure session storage
3. Implement proper error handling
4. Regular security audits
5. Keep dependencies updated
