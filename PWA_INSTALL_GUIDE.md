# Kokaa PWA - Installation Guide for iOS

## How to Install on iPhone/iPad

1. **Open Safari** - The PWA only works in Safari on iOS
2. **Visit your website** - Navigate to your Kokaa website
3. **Tap the Share button** - Look for the share icon at the bottom of Safari
4. **Scroll down and tap "Add to Home Screen"**
5. **Tap "Add"** in the top-right corner
6. **Done!** - The Kokaa app icon will appear on your home screen

## Features

Your Kokaa app now includes:

### PWA Features
- Install directly to iPhone/iPad home screen
- Works offline with cached content
- Fast loading times
- Native app-like experience
- iOS Safari optimizations

### Analytics Tracking
The app automatically tracks 7 essential user events:
1. **view_deal** - When users see deals
2. **click_buy_now** - When users click to purchase
3. **checkout_start** - When checkout begins
4. **complete_purchase** - When purchase completes
5. **add_to_wishlist** - When users save deals
6. **notify_me** - When users request notifications
7. **conversation_query** - AI chat searches

### Smart Deal Scoring
Deals are automatically sorted by Smart Score:
- View Rate + Click Rate + Purchase Rate
- Shows best performing deals first
- Updates in real-time based on user behavior

### Admin Analytics Dashboard
Access via Admin Panel > Analytics tab:
- Total views, clicks, purchases, wishlists
- Conversion rate tracking
- Top performing deals by Smart Score
- Unmet customer requests (for vendor intelligence)
- Last 24 hours metrics

## Next Steps

1. **Test PWA Installation** - Install on your iPhone
2. **Add Real Deals** - Create deals through Admin Panel
3. **Monitor Analytics** - Check the Analytics tab daily
4. **Add Deal Translations** - Use the Translations button for Greek support
5. **Calculate Metrics** - Run this SQL to update metrics:
   ```sql
   SELECT update_deal_metrics();
   ```

## Publishing to App Stores

### Google Play Store (Easy)
Use TWA (Trusted Web Activity) wrapper:
- Minimal configuration needed
- Wraps your PWA as native Android app
- Enables push notifications

### Apple App Store (Complex)
Requires native Swift development or:
- React Native wrapper
- Capacitor/Ionic wrapper
- Contact mobile development agency

## Technical Details

### Files Added
- `/public/manifest.json` - PWA configuration
- `/public/sw.js` - Service worker for offline support
- `/src/services/analytics.ts` - Event tracking system
- `/src/components/AnalyticsDashboard.tsx` - Analytics UI
- Database tables: `events`, `unmet_requests`, `deal_metrics`

### Performance Optimizations
- iOS safe area support
- Touch optimization
- Prevents zoom on input focus
- Tap highlight removal
- Smart deal scoring for faster sorting
