# Two-Factor Authentication (2FA) Guide - Kokaa Admin Panel

## Overview

Two-Factor Authentication (2FA) has been implemented for the Kokaa Admin Panel to provide enterprise-grade security for administrator accounts. This uses TOTP (Time-based One-Time Password) authentication compatible with Google Authenticator, Microsoft Authenticator, and other authenticator apps.

## Admin Panel vs Vendor Portal - Important Distinction

### Current Admin Panel (2FA Enabled)
**Purpose**: Platform super-admin dashboard
**Users**: You (the platform operator/owner)
**Access Level**: Full platform control

**Features Available**:
- Deal Management (create/edit/delete ALL deals)
- Platform Analytics (ALL user behavior across entire platform)
- Vendor Intelligence (aggregated market demand data for recruiting vendors)
- System configuration

**Security**: 2FA is ENABLED and recommended for all admin users

### Future Vendor Portal (Separate System)
**Purpose**: Individual vendor dashboard
**Users**: Business owners who list deals on your platform
**Access Level**: Only their own deals and performance

**Features They Should See**:
- Their own deal creation/editing
- Their own sales metrics
- Their conversion rates
- Customer searches related to their category
- Pricing recommendations for their market

**Security**: Standard email/password authentication is sufficient (2FA optional)

### Recommendation

**Current Setup** ✅:
- Admin Panel = Super admin with 2FA
- Used by platform operators only

**Phase 3 TODO** ⏳:
- Build separate Vendor Portal
- Give vendors limited dashboard with only their data
- Remove vendor access from current Admin Panel
- Keep Admin Panel internal

## 2FA Features

### TOTP Authentication
- 30-second rotating codes
- Works with any TOTP-compatible app:
  - Google Authenticator (iOS/Android)
  - Microsoft Authenticator (iOS/Android)
  - Authy (iOS/Android)
  - 1Password, LastPass, Bitwarden (password managers)

### Backup Codes
- 10 single-use backup codes generated during setup
- Use if you lose access to your authenticator app
- Each code works only once
- Download and store securely

### Security Features
- Codes verified on server-side
- All 2FA events logged for audit trail
- Protection against brute force (rate limiting via Supabase)
- Secrets stored encrypted in database

## Setup Instructions

### Enabling 2FA (Admin Users)

1. **Access Settings**
   ```
   Click profile icon → My Profile → Security tab
   ```

2. **Start Setup**
   - Click "Enable Two-Factor Authentication"
   - System generates QR code and secret

3. **Install Authenticator App**
   - Download Google Authenticator or Microsoft Authenticator
   - Open app and tap "Add account"

4. **Scan QR Code**
   - Point camera at QR code on screen
   - Or manually enter the secret code shown

5. **Save Backup Codes**
   - Click "Download Backup Codes"
   - Store file in secure location (NOT on same device)
   - Print and keep in safe place

6. **Verify Setup**
   - Enter 6-digit code from authenticator app
   - Click "Verify and Enable"

7. **Done!**
   - 2FA is now active on your account
   - You'll need both password AND code to login

### Login with 2FA

1. Enter email and password as usual
2. After password verified, 2FA screen appears
3. Open authenticator app
4. Enter current 6-digit code
5. Access granted

### Using Backup Codes

If you lose your phone or authenticator app:

1. On 2FA verification screen
2. Click "Use backup code instead"
3. Enter one of your 8-character backup codes
4. Access granted (code is consumed)
5. Remaining codes: Check Profile → Security

### Disabling 2FA

**Warning**: Only disable if absolutely necessary

1. Go to Profile → Security tab
2. Enter current 6-digit code from authenticator
3. Click "Disable 2FA"
4. 2FA removed from account

## Database Schema

### Tables Created

#### `user_2fa_secrets`
```sql
- id: UUID primary key
- user_id: References auth.users (unique)
- secret: Encrypted TOTP secret
- backup_codes: Array of backup codes
- is_enabled: Boolean status
- verified_at: Timestamp when first verified
- created_at, updated_at
```

#### `user_2fa_logs`
```sql
- id: UUID primary key
- user_id: References auth.users
- action: enum (enabled, disabled, verified, failed, backup_used)
- ip_address, user_agent: For audit trail
- success: Boolean
- created_at: Timestamp
```

### Security Policies (RLS)

- Users can only view/modify their own 2FA settings
- Admins can view 2FA status (not secrets) for audit
- All secrets are server-side only
- No client-side exposure of secrets

## Technical Implementation

### Key Files

```
src/services/twoFactorAuth.ts
  - setupTwoFactor(): Generate secret & QR code
  - verifyAndEnable2FA(): Verify and activate
  - verifyTwoFactorToken(): Login verification
  - verifyBackupCode(): Backup code validation
  - disable2FA(): Remove 2FA from account
  - get2FAStatus(): Check if enabled

src/components/TwoFactorSetup.tsx
  - QR code display with react-qrcode
  - Backup code generation and download
  - Enable/disable interface

src/components/TwoFactorVerification.tsx
  - Login 2FA prompt
  - Backup code entry
  - Real-time verification

src/components/AuthModal.tsx
  - Updated to check 2FA status after password
  - Redirects to verification if enabled

src/components/ProfileModal.tsx
  - Added "Security" tab
  - Shows TwoFactorSetup component
```

### Dependencies Added

```json
{
  "otplib": "^12.0.1",        // TOTP generation/verification
  "qrcode.react": "^4.2.0"     // QR code display
}
```

## Security Best Practices

### For Admins

1. **Enable 2FA immediately** on all admin accounts
2. **Store backup codes securely**:
   - Print and keep in safe/lockbox
   - Store in password manager
   - DO NOT keep on same device
3. **Use strong passwords** in addition to 2FA
4. **Don't screenshot QR codes** (digital copies are risky)
5. **Monitor 2FA logs** periodically for suspicious activity

### For Platform

1. **Require 2FA** for all admin-level accounts (enforce via policy)
2. **Regular security audits** of 2FA logs
3. **Backup admin account** with 2FA as recovery
4. **Document recovery procedures** for lost 2FA access
5. **Consider requiring 2FA** for high-value operations

## Troubleshooting

### "Invalid code" Error

**Causes**:
- Time sync issue on phone
- Entered code expired (codes change every 30 seconds)
- Wrong account selected in authenticator

**Solutions**:
- Check phone time is set to automatic
- Wait for new code to generate
- Verify correct account in authenticator app
- Use backup code if persistent issues

### Lost Authenticator Access

**Solution**:
1. Click "Use backup code instead" on login
2. Enter one of your backup codes
3. Setup 2FA again with new QR code
4. Generate new backup codes

**No backup codes?**
- Contact another admin to disable your 2FA
- Or access database directly to disable

### Codes Not Working After Phone Change

**Cause**: Authenticator not transferred to new phone

**Solution**:
1. Use backup code to login
2. Disable 2FA
3. Re-enable with QR code on new phone
4. Download new backup codes

## Recovery Procedures

### Admin Locked Out (No Backup Codes)

**Database Recovery** (last resort):

```sql
-- Check 2FA status
SELECT user_id, is_enabled, backup_codes
FROM user_2fa_secrets
WHERE user_id = 'admin-user-id';

-- Disable 2FA for user
UPDATE user_2fa_secrets
SET is_enabled = false
WHERE user_id = 'admin-user-id';

-- Log the recovery action
INSERT INTO user_2fa_logs (user_id, action, success)
VALUES ('admin-user-id', 'disabled', true);
```

### Backup Admin Account

**Best Practice**: Create secondary admin account with 2FA as backup:
1. Different email
2. Independent 2FA setup
3. Stored credentials in company safe
4. Use only for recovery

## Audit & Compliance

### Viewing 2FA Logs

```sql
SELECT
  u.email,
  l.action,
  l.success,
  l.created_at,
  l.ip_address
FROM user_2fa_logs l
JOIN auth.users u ON l.user_id = u.id
WHERE l.created_at > NOW() - INTERVAL '30 days'
ORDER BY l.created_at DESC;
```

### Key Metrics to Monitor

- 2FA enable rate among admins
- Failed verification attempts
- Backup code usage frequency
- Disable events (should be rare)

### Compliance

2FA implementation helps meet:
- **PCI DSS**: Payment security requirements
- **SOC 2**: Access control standards
- **GDPR**: Data protection measures
- **ISO 27001**: Information security

## FAQ

**Q: Should vendors have 2FA?**
A: Not necessary initially. Vendors should have separate portal with standard auth. 2FA is for platform admins only.

**Q: Can I use SMS instead of authenticator app?**
A: Not currently. TOTP (app-based) is more secure than SMS and doesn't require phone integration.

**Q: What if I lose all backup codes?**
A: Another admin must disable your 2FA, or database access required. Keep codes secure!

**Q: Can I have multiple devices with same 2FA?**
A: Yes! Scan same QR code on multiple devices, or manually enter same secret.

**Q: Is 2FA required or optional?**
A: Currently optional but STRONGLY recommended for all admin accounts. Consider making it mandatory.

**Q: How do I force all admins to use 2FA?**
A: Add application-level check that prevents admin actions unless 2FA enabled. Would need custom implementation.

## Next Steps

1. ✅ Enable 2FA on your admin account
2. ✅ Download and secure backup codes
3. ⏳ Enable 2FA for all admin users
4. ⏳ Document internal recovery procedures
5. ⏳ Plan separate Vendor Portal (Phase 3)
6. ⏳ Consider mandating 2FA for admins

## Support

For implementation questions or issues:
- Check 2FA logs in database
- Review Supabase auth logs
- Test with new test account first
- Keep backup admin account ready

Your Kokaa Admin Panel is now protected with enterprise-grade two-factor authentication!
