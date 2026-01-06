# Google OAuth Setup Guide

Your application now supports Google OAuth login! Follow these steps to configure it in your Supabase project.

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose **External** user type
   - Fill in required fields (App name, User support email, Developer email)
   - Add scopes: `email` and `profile`
   - Save and continue

6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `Buy Deals Club` (or your app name)
   - Authorized JavaScript origins:
     - `https://tfalmfpasmwggilxpkir.supabase.co`
     - Your production domain (e.g., `https://yourdomain.com`)
     - For local testing: `http://localhost:5173`
   - Authorized redirect URIs:
     - `https://tfalmfpasmwggilxpkir.supabase.co/auth/v1/callback`
     - Your production callback URL

7. Click **Create** and copy:
   - Client ID
   - Client Secret

## Step 2: Configure Google OAuth in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **tfalmfpasmwggilxpkir**
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list and enable it
5. Paste your Google Client ID and Client Secret
6. Click **Save**

## Step 3: Update Redirect URLs (if needed)

If you're deploying to production:

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Add your production domain to **Site URL**
3. Add redirect URLs to **Redirect URLs** list

## Testing

1. Open your application
2. Click the **Sign In** button
3. You should see a "Sign in with Google" button
4. Click it to test the Google OAuth flow

## Features

- One-click Google authentication
- Automatic user profile creation
- Seamless integration with existing email/password authentication
- Works with both sign-up and sign-in flows
- Automatic role detection (Vendor/Consumer)

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Make sure the redirect URI in Google Cloud Console matches exactly: `https://tfalmfpasmwggilxpkir.supabase.co/auth/v1/callback`

**Error: "Invalid OAuth Client"**
- Verify your Client ID and Client Secret are correctly entered in Supabase
- Make sure the OAuth consent screen is published (not in testing mode)

**Google login not appearing**
- Clear your browser cache
- Check browser console for errors
- Verify Google provider is enabled in Supabase

## Production Checklist

Before going live:
- [ ] OAuth consent screen is published
- [ ] Production domain added to authorized origins
- [ ] Production callback URL added to redirect URIs
- [ ] Supabase site URL updated with production domain
- [ ] Test Google login on production environment
