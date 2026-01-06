# Android TWA Setup Guide - Kokaa PWA

## What is TWA (Trusted Web Activity)?

TWA wraps your PWA in a native Android app shell, allowing you to publish to Google Play Store with minimal effort.

## Benefits

- Publish to Google Play Store
- Native app appearance (no browser UI)
- Push notifications support
- Better discoverability
- Enhanced credibility
- Share same cookies/storage as PWA

## Quick Setup (Recommended Tool)

### Using Bubblewrap CLI

```bash
# Install Bubblewrap globally
npm install -g @bubblewrap/cli

# Initialize TWA project
bubblewrap init --manifest https://yourdomain.com/manifest.json

# Build the Android app
bubblewrap build

# Generate signed APK for Play Store
bubblewrap build --release
```

### Configuration Inputs

When running `bubblewrap init`, provide:

1. **Domain**: Your production domain (e.g., kokaa.co)
2. **Name**: Kokaa
3. **Launch URL**: https://yourdomain.com
4. **Theme Color**: #2563eb
5. **Background Color**: #ffffff
6. **Display Mode**: standalone
7. **Icon**: Your icon URLs from manifest.json

## Manual Setup (Alternative)

### Prerequisites

- Android Studio installed
- Java JDK 8 or higher
- Your domain must serve HTTPS

### Steps

1. **Create Android Project**
   ```bash
   # In Android Studio: New Project > Empty Activity
   ```

2. **Add Dependencies** (build.gradle)
   ```gradle
   dependencies {
       implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
   }
   ```

3. **Configure Manifest** (AndroidManifest.xml)
   ```xml
   <activity
       android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
       android:label="@string/app_name"
       android:exported="true">
       <meta-data
           android:name="android.support.customtabs.trusted.DEFAULT_URL"
           android:value="https://yourdomain.com" />
       <intent-filter>
           <action android:name="android.intent.action.MAIN" />
           <category android:name="android.intent.category.LAUNCHER" />
       </intent-filter>
   </activity>
   ```

4. **Digital Asset Links**

   Create `.well-known/assetlinks.json` on your server:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "co.kokaa.app",
       "sha256_cert_fingerprints": [
         "YOUR_SHA256_FINGERPRINT"
       ]
     }
   }]
   ```

   Get fingerprint:
   ```bash
   keytool -list -v -keystore your-key.keystore
   ```

## Publishing to Google Play

### 1. Prepare Assets

Required assets:
- App icon: 512x512 PNG
- Feature graphic: 1024x500 PNG
- Screenshots: At least 2 (phone + tablet)
- Privacy policy URL

### 2. Create Developer Account

- Cost: $25 one-time fee
- Sign up: https://play.google.com/console

### 3. Create App Listing

- App name: Kokaa - Smart Daily Deals
- Category: Shopping
- Content rating: Complete questionnaire
- Target audience: 18+

### 4. Upload APK/AAB

```bash
# Generate signed bundle
./gradlew bundleRelease

# Upload to Play Console
# File located at: app/build/outputs/bundle/release/app-release.aab
```

### 5. Complete Store Listing

Write compelling descriptions highlighting:
- Daily flash sales in Cyprus
- Up to 70% discounts
- Hotels, spas, dining, experiences
- Secure checkout
- Loyalty points

## Push Notifications Setup

### 1. Firebase Configuration

```bash
# Install Firebase
npm install firebase

# Add Firebase SDK to your PWA
```

### 2. Update Service Worker

```javascript
// In sw.js
self.addEventListener('push', event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  });
});
```

### 3. Request Permission

```javascript
// In your app
if ('Notification' in window) {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      // Subscribe to push notifications
    }
  });
}
```

## Testing

### Before Publishing

1. **Test on Android Device**
   ```bash
   # Install debug APK
   adb install app-debug.apk
   ```

2. **Verify Digital Asset Links**
   - Visit: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://yourdomain.com

3. **Test Offline Mode**
   - Enable airplane mode
   - App should still load cached content

## Performance Checklist

- [ ] Manifest.json configured correctly
- [ ] Service worker caching assets
- [ ] Icons (192x192, 512x512) present
- [ ] HTTPS enabled on domain
- [ ] Digital Asset Links verified
- [ ] App loads in <3 seconds
- [ ] Offline mode works
- [ ] Push notifications functional

## Estimated Timeline

- **Bubblewrap Setup**: 30 minutes
- **Testing**: 1 hour
- **Play Store Submission**: 2 hours
- **Review Time**: 1-3 days

## Cost Summary

- Google Play Developer Account: $25 (one-time)
- App development: $0 (using Bubblewrap)
- Maintenance: Minimal (PWA updates auto-sync)

## Next Steps

1. Deploy your PWA to production domain
2. Install Bubblewrap CLI
3. Run `bubblewrap init`
4. Build and test locally
5. Sign up for Play Console
6. Upload APK and complete listing
7. Submit for review

## Resources

- Bubblewrap: https://github.com/GoogleChromeLabs/bubblewrap
- TWA Guide: https://developers.google.com/web/android/trusted-web-activity
- Play Console: https://play.google.com/console
- Digital Asset Links Tool: https://developers.google.com/digital-asset-links/tools/generator

## Support

For TWA issues, check:
- Stack Overflow: [android-trusted-web-activity]
- Chrome Developers Forum
- Play Console Help Center
