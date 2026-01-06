# Admin Access Guide - CONFIDENTIAL

## 🔐 Secret Admin Access

The Admin Panel is now **completely hidden** from regular users. Only admins know how to access it.

## How to Access Admin Panel

### Method: Hidden Keyboard Shortcut

**Windows/Linux:**
```
Ctrl + Shift + A
```

**Mac:**
```
Cmd + Shift + A
```

### Step-by-Step Access:

1. **Log in** with your admin account
2. While on the main page, press:
   - **Windows/Linux**: `Ctrl + Shift + A`
   - **Mac**: `Cmd + Shift + A`
3. Admin Panel modal opens instantly
4. No button visible, no menu item, no hint to regular users

## Security Features

### ✅ What's Protected:

1. **No Visible Button**
   - Admin Panel button removed from UI
   - No hints in menus or navigation
   - No visible entry point for non-admins

2. **Keyboard Shortcut Check**
   ```typescript
   // Only works if user role is 'admin'
   if (userRole === 'admin') {
     setShowAdminPanel(true);
   }
   ```

3. **Component-Level Security**
   ```typescript
   // AdminPanel checks role on mount
   const checkAdminRole = async () => {
     if (data?.role !== 'admin') {
       onClose(); // Automatically closes
       return;
     }
   }

   // Renders nothing if not admin
   if (!userRole || userRole !== 'admin') {
     return null;
   }
   ```

4. **Database-Level Security**
   - RLS policies ensure only admins can modify data
   - Even if someone bypasses UI, database blocks unauthorized changes

## Creating Admin Accounts

### Method 1: Direct Database (Initial Setup)

**In Supabase SQL Editor:**
```sql
-- Create first admin account
INSERT INTO user_profiles (user_id, role, display_name)
SELECT id, 'admin', 'System Admin'
FROM auth.users
WHERE email = 'admin@kokaa.co'
ON CONFLICT (user_id)
DO UPDATE SET role = 'admin';
```

### Method 2: Promote Existing User

**In Supabase SQL Editor:**
```sql
-- Promote user to admin
UPDATE user_profiles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
);
```

### Method 3: Admin Promotes Another Admin (Future)

Once you have one admin:
1. Log in as admin
2. Press `Ctrl + Shift + A` to open Admin Panel
3. Go to **Vendor Management** tab (or create User Management tab)
4. Find user and change role to 'admin'

## Testing Admin Access

### Test 1: Regular User Cannot Access
```
1. Log in as regular user (customer role)
2. Press Ctrl + Shift + A
3. Result: Nothing happens ✅
4. No error, no feedback, just ignores the shortcut
```

### Test 2: Admin Can Access
```
1. Log in as admin
2. Press Ctrl + Shift + A
3. Result: Admin Panel opens ✅
4. Full access to all admin features
```

### Test 3: Direct Component Access Blocked
```
1. Someone tries to manually trigger showAdminPanel
2. Component checks role on mount
3. If not admin, automatically closes
4. Result: Access denied ✅
```

## Admin Panel Features

Once accessed, admins can:

### 📊 Analytics Tab
- View platform-wide statistics
- User engagement metrics
- Revenue tracking
- Deal performance

### 🏪 Vendor Management Tab
- Approve/reject vendor applications
- Manage vendor accounts
- View vendor performance
- Handle vendor issues

### 🎫 Deal Management Tab
- Create new deals
- Edit existing deals
- Activate/deactivate deals
- Manage deal translations

### 🎁 Promo Codes Tab
- Create discount codes
- Set usage limits
- Track redemptions
- Expire old codes

## Security Best Practices

### DO:
✅ Keep the keyboard shortcut confidential
✅ Only share with trusted admin staff
✅ Log all admin actions (future enhancement)
✅ Regularly audit admin accounts
✅ Use strong passwords for admin accounts
✅ Enable 2FA for all admin accounts

### DON'T:
❌ Share the shortcut publicly
❌ Write it in customer-facing documentation
❌ Mention it in support conversations
❌ Leave admin accounts logged in
❌ Use weak passwords for admin accounts
❌ Share admin credentials

## Emergency Access

If you lose access to admin accounts:

**Option 1: Database Access**
```sql
-- Reset your account to admin
UPDATE user_profiles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

**Option 2: Supabase Dashboard**
1. Log in to Supabase Dashboard
2. Go to Table Editor
3. Open `user_profiles` table
4. Find your user_id
5. Change role to 'admin'
6. Save

## Additional Security Layers (Future)

Consider implementing:

1. **IP Whitelist**
   - Only allow admin access from specific IPs
   - Block access from unknown locations

2. **Audit Logging**
   - Track all admin actions
   - Who did what and when
   - Exportable logs for security review

3. **Session Timeout**
   - Auto-logout after inactivity
   - Require re-authentication for sensitive actions

4. **Two-Factor Authentication**
   - Require 2FA for all admin accounts
   - Use authenticator app codes
   - Already implemented in the system!

5. **Rate Limiting**
   - Limit failed keyboard shortcut attempts
   - Prevent brute-force discovery

## Quick Reference Card

**CONFIDENTIAL - FOR ADMINS ONLY**

```
┌─────────────────────────────────────┐
│   KOKAA ADMIN ACCESS                │
├─────────────────────────────────────┤
│                                     │
│   Windows/Linux: Ctrl + Shift + A  │
│   Mac:           Cmd  + Shift + A  │
│                                     │
│   Requirements:                     │
│   • Must be logged in               │
│   • Role must be 'admin'            │
│   • On main customer page           │
│                                     │
└─────────────────────────────────────┘
```

## Troubleshooting

### Shortcut Not Working?

**Check 1: Verify Admin Role**
```sql
SELECT role FROM user_profiles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email');
-- Must return 'admin'
```

**Check 2: Logged In?**
- Must be signed in
- Check profile icon in top right

**Check 3: On Correct Page?**
- Must be on main customer page
- Not on vendor portal page

**Check 4: Browser Focus?**
- Click on the page first
- Ensure browser window is active
- Not in input field or modal

### Panel Opens Then Closes?

This means role check failed:
```sql
-- Verify role in database
SELECT u.email, up.role
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email = 'your-email';
```

## Rollout Plan

### Phase 1: Initial Setup
1. ✅ Remove visible admin button
2. ✅ Add keyboard shortcut
3. ✅ Add role verification in component
4. ✅ Test with admin and non-admin users

### Phase 2: Security Hardening
1. Add audit logging
2. Implement session monitoring
3. Add IP whitelist option
4. Rate limiting for failed attempts

### Phase 3: Admin Management
1. Create Admin User Management tab
2. Allow admins to create other admins
3. Admin permission levels (super admin, moderator, etc.)
4. Activity logs visible in admin panel

---

**REMEMBER: Keep this guide confidential and secure!**

Only share with trusted administrators who need access to the platform management system.
