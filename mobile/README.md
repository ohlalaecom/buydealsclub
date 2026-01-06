# Kokaa Mobile App

A React Native mobile application for the Kokaa daily deals platform, built with Expo.

## Features

- User authentication (sign up, login, sign out)
- Browse daily deals by category
- Shopping cart management
- Order tracking
- User profile with loyalty points
- Real-time deal updates
- Secure checkout flow

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Studio for Android emulator
- Expo Go app on your physical device (optional)

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the mobile directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from your Supabase project settings at https://supabase.com/dashboard

### 3. Install AsyncStorage

The app requires AsyncStorage for secure token storage:

```bash
npx expo install @react-native-async-storage/async-storage
```

### 4. Start Development Server

```bash
npm start
```

This will open Expo DevTools in your browser.

### 5. Run on Device/Emulator

Choose one of the following options:

**Option A: Physical Device**
1. Install Expo Go app from App Store or Google Play
2. Scan the QR code from the terminal or Expo DevTools
3. The app will load on your device

**Option B: iOS Simulator (Mac only)**
1. Press `i` in the terminal
2. Or click "Run on iOS simulator" in Expo DevTools

**Option C: Android Emulator**
1. Start Android emulator from Android Studio
2. Press `a` in the terminal
3. Or click "Run on Android device/emulator" in Expo DevTools

## Project Structure

```
mobile/
├── app/                      # Expo Router screens
│   ├── (auth)/              # Authentication screens
│   │   ├── welcome.tsx      # Welcome/landing screen
│   │   ├── login.tsx        # Login screen
│   │   └── signup.tsx       # Sign up screen
│   ├── (tabs)/              # Main app tabs
│   │   ├── home.tsx         # Home/deals screen
│   │   ├── cart.tsx         # Shopping cart
│   │   ├── orders.tsx       # Order history
│   │   └── profile.tsx      # User profile
│   ├── _layout.tsx          # Root layout
│   └── index.tsx            # Entry point
├── src/
│   ├── components/          # Reusable components
│   │   └── DealCard.tsx     # Deal card component
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx  # Authentication context
│   ├── services/            # API services
│   │   └── supabase.ts      # Supabase client
│   ├── types/               # TypeScript types
│   │   └── index.ts         # Type definitions
│   └── utils/               # Utility functions
│       └── colors.ts        # Design system (colors, spacing, etc.)
├── assets/                  # Images, fonts, etc.
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── tsconfig.json           # TypeScript configuration
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (Mac only)
- `npm run web` - Run in web browser

## Key Features Implementation

### Authentication
- Email/password authentication via Supabase Auth
- Automatic session management with AsyncStorage
- Protected routes with AuthContext

### Deal Browsing
- Real-time deal updates from Supabase
- Category filtering
- Pull-to-refresh functionality
- Countdown timers for deal expiration

### Shopping Cart
- Add/remove items
- Update quantities
- Real-time total calculation
- Persistent cart across sessions

### User Profile
- View user information
- Display loyalty points and tier
- Account settings
- Sign out functionality

## Design System

The app uses a consistent design system defined in `src/utils/colors.ts`:

- **Colors**: Primary blue, success green, error red, etc.
- **Spacing**: 8px base unit (xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px)
- **Typography**: Consistent font sizes from xs (12px) to xxxl (30px)
- **Border Radius**: Consistent rounding (sm: 4px, md: 8px, lg: 12px, xl: 16px)

## Building for Production

### iOS (requires Mac and Apple Developer account)

1. Configure app.json with your bundle identifier
2. Run: `expo build:ios`
3. Follow prompts to provide credentials
4. Download and submit to App Store Connect

### Android

1. Configure app.json with your package name
2. Run: `expo build:android`
3. Choose APK or App Bundle
4. Download and upload to Google Play Console

### Using EAS Build (Recommended)

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Build: `eas build --platform all`

## Troubleshooting

### App won't start
- Clear Expo cache: `expo start -c`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

### Supabase connection issues
- Verify .env file has correct credentials
- Check Supabase project is active
- Ensure API keys are not expired

### iOS build issues
- Ensure Xcode is installed and up to date
- Clear derived data
- Check bundle identifier is unique

### Android build issues
- Ensure Android SDK is properly installed
- Check ANDROID_HOME environment variable
- Verify package name is unique

## Next Steps

1. Add push notifications for deal alerts
2. Implement offline mode with local storage
3. Add biometric authentication
4. Integrate payment providers (Stripe, PayPal)
5. Add social sharing features
6. Implement deep linking
7. Add analytics tracking

## Support

For issues or questions:
- Check the documentation
- Review existing GitHub issues
- Create a new issue with detailed information

## License

Private - All rights reserved
