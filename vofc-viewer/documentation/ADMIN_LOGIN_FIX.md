# Admin Login Debugging Guide

## 🐛 **Issue: Admin Not Seeing Admin Functions**

### **Root Cause**
There are **two different authentication systems** that aren't properly connected:

1. **Supabase Auth** - Used in `/login/page.jsx`
2. **JWT Cookie Auth** - Used in `/api/auth/login/route.js` and expected by admin pages

### **Solution Options**

#### **Option 1: Use JWT Cookie Login (Recommended for Quick Fix)**

**Login Route:** `/api/auth/login` (not the Supabase login page)

**Credentials:**
- Email: `admin@vofc.gov`
- Password: `Admin123!`

**Test Steps:**
```javascript
// In browser console or Postman
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'admin@vofc.gov',
    password: 'Admin123!'
  })
})
.then(r => r.json())
.then(data => console.log('Login result:', data));
```

Then navigate to `/admin` - it should work.

#### **Option 2: Fix Admin Page to Use Supabase Auth (Better Long-term)**

Update `app/admin/page.jsx` to use Supabase auth instead of JWT cookies.

### **Quick Fix Applied**

✅ Fixed `app/admin/page.jsx`:
- Corrected `canAccessAdmin()` call (removed incorrect parameter)
- Fixed `getUserProfile()` usage
- Added better error messages
- Added console logging for debugging

### **Testing Admin Access**

1. **Clear cookies/storage:**
   ```javascript
   // In browser console
   document.cookie.split(";").forEach(function(c) { 
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
   });
   ```

2. **Login with JWT endpoint:**
   - POST to `/api/auth/login`
   - Email: `admin@vofc.gov`
   - Password: `Admin123!`

3. **Verify cookie is set:**
   ```javascript
   // In browser console
   console.log('Auth cookie:', document.cookie);
   ```

4. **Check admin access:**
   ```javascript
   // In browser console
   fetch('/api/auth/verify', { credentials: 'include' })
     .then(r => r.json())
     .then(data => console.log('Verification:', data));
   ```

5. **Navigate to `/admin`** - should now see admin functions

### **Required Roles for Admin Access**

The `canAccessAdmin()` function allows these roles:
- `admin`
- `spsa`
- `psa`
- `analyst`

### **Debug Console Logs**

After fix, check browser console for:
```
Admin access granted: { email: "admin@vofc.gov", role: "admin", canAccess: true }
```

If you see "You do not have admin access" alert, check:
1. Cookie is set correctly
2. User role is one of: admin, spsa, psa, analyst
3. JWT token is valid and not expired

### **Next Steps**

1. **Test the fix** - Try logging in again
2. **Unify auth systems** - Choose either Supabase OR JWT, not both
3. **Fix login page** - Make it use the correct auth method for admin
