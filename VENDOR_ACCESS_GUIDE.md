# Vendor Portal Access Guide

## How Vendors Log In

Vendors use the **SAME login** as customers, but the system automatically shows them the Vendor Portal instead of the customer interface based on their role.

## Access Flow

### Step 1: Vendor Application
1. Vendor visits the website
2. Clicks **"Sign In"** button (top right)
3. Creates a regular account with email/password
4. After signing in, they can apply to become a vendor

### Step 2: Vendor Application Process

**Option A: Through Profile**
1. Sign in as a regular user
2. Click profile icon (top right)
3. Look for "Become a Vendor" option
4. Fill out vendor application form

**Option B: Admin Approval**
1. Admin logs in
2. Goes to **Admin Panel** → **Vendor Management** tab
3. Reviews pending vendor applications
4. Approves or rejects applications

### Step 3: Automatic Role Switch

Once approved:
```sql
-- Admin sets user role to 'vendor'
UPDATE user_profiles
SET role = 'vendor'
WHERE user_id = '[user-id]';
```

**Next Login:**
- User logs in with same email/password
- System checks: `userRole === 'vendor'`
- Automatically shows **Vendor Portal** instead of customer interface

## Current Implementation

### Login Detection
```typescript
// src/App.tsx - Line 56-69
const loadUserRole = async () => {
  if (!user) return;

  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  setUserRole(data?.role || 'customer');
};

// Line 326-328
if (userRole === 'vendor') {
  return <VendorPortal />;
}
```

### What Vendors See
```
✅ Vendor Dashboard (replaces customer homepage)
✅ Deal Management (create/edit deals)
✅ Order Management
✅ Analytics
✅ Request Insights
✅ Reviews
✅ Performance Metrics
```

### What Vendors DON'T See
```
❌ Customer homepage with deal browsing
❌ Shopping cart
❌ Customer checkout
❌ Customer discussion groups
❌ Spin the wheel
```

## Setting Up Vendor Accounts

### Method 1: Admin Panel (Recommended)

**For Admins:**
1. Log in as admin
2. Go to **Admin Panel** (click profile → Admin Panel)
3. Click **Vendor Management** tab
4. See list of vendor applications
5. Click "Approve" on pending applications
6. User role automatically changes to 'vendor'

### Method 2: Direct Database (Development Only)

**Using Supabase Dashboard:**
```sql
-- Check existing users
SELECT id, email FROM auth.users;

-- Set a user as vendor
INSERT INTO user_profiles (user_id, role, display_name)
VALUES ('[user-id]', 'vendor', 'Vendor Name')
ON CONFLICT (user_id)
DO UPDATE SET role = 'vendor';
```

**Or update existing:**
```sql
UPDATE user_profiles
SET role = 'vendor'
WHERE user_id = '[user-id]';
```

### Method 3: Vendor Application Component

There should be a `VendorApplication` component that customers can use to apply:

```typescript
// Component: VendorApplication.tsx
// Shows a form for:
- Business name
- Business type
- Contact information
- Business license/registration
- Description of products/services
- Bank details (for payouts)
```

## Testing Vendor Access

### Create a Test Vendor Account:

1. **Sign up as new user:**
   - Email: `vendor@test.com`
   - Password: `Test123!`

2. **Promote to vendor (admin required):**
   ```sql
   -- In Supabase SQL Editor:
   INSERT INTO user_profiles (user_id, role, display_name)
   SELECT id, 'vendor', 'Test Vendor'
   FROM auth.users
   WHERE email = 'vendor@test.com';
   ```

3. **Log in:**
   - Sign out
   - Sign in with vendor@test.com
   - System automatically shows Vendor Portal

4. **Verify access:**
   - Should see Vendor Dashboard
   - Can create deals
   - Can view analytics
   - Can manage orders

## User Roles

The system supports 3 roles:

```typescript
type UserRole = 'customer' | 'vendor' | 'admin';

// Default: customer
// Permissions:
- customer: Browse deals, purchase, reviews
- vendor: All customer + create deals, manage inventory, analytics
- admin: All vendor + user management, platform settings, all analytics
```

## Common Issues

### Issue: User logs in but sees customer interface
**Solution:** Check role in database
```sql
SELECT role FROM user_profiles WHERE user_id = '[user-id]';
-- Should return 'vendor', not 'customer'
```

### Issue: Vendor application not visible
**Solution:**
- Check if VendorApplication component is integrated
- Check if user is already approved
- Check if button is in ProfileModal or Header

### Issue: Can't approve vendor applications
**Solution:**
- User must have 'admin' role
- Check VendorManagement component in AdminPanel

## Security Notes

### Row Level Security (RLS)

**Vendors can only:**
```sql
✅ Create their own deals
✅ View their own deals
✅ View orders for their deals
✅ Update their own deals
✅ View their own analytics
✅ See their own reviews
✅ View customer requests (all vendors can see)
```

**Vendors CANNOT:**
```sql
❌ View/edit other vendors' deals
❌ View other vendors' sales data
❌ Modify orders after completion
❌ Access admin functions
❌ Change their own role
❌ Access customer personal data
```

## Next Steps

To complete vendor login flow, you may want to add:

### 1. Vendor Application Button
Add to Header or ProfileModal:
```typescript
{user && userRole === 'customer' && (
  <button onClick={() => setShowVendorApplication(true)}>
    Become a Vendor
  </button>
)}
```

### 2. Vendor Application Form
Create prominent vendor onboarding:
- Business information
- Verification documents
- Terms acceptance
- Banking details

### 3. Vendor Login Page (Optional)
Create a dedicated `/vendor` route:
- Custom login page for vendors
- "Sign in as Vendor" branding
- Quick links to vendor resources

### 4. Role Switcher (Optional)
If a user can be both customer and vendor:
```typescript
<button onClick={() => toggleView()}>
  {isVendorView ? 'Switch to Shopping' : 'Switch to Vendor Portal'}
</button>
```

## Summary

**Vendors access the portal through:**
1. ✅ Regular sign-in (same as customers)
2. ✅ System automatically detects role
3. ✅ Shows Vendor Portal instead of customer interface

**No separate login page needed!** The role in the `user_profiles` table determines what interface the user sees.

---

**Quick Test:**
```bash
# 1. Sign up: vendor@example.com
# 2. In Supabase SQL Editor:
UPDATE user_profiles
SET role = 'vendor'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'vendor@example.com');
# 3. Sign in again
# 4. See Vendor Portal! 🎉
```
