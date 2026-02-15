# Build APK Instructions

## Quick Method: Using EAS Build (Recommended)

### Step 1: Create/Login to Expo Account
1. Go to: https://expo.dev/signup
2. Create a free account or login

### Step 2: Build APK via EAS

Run these commands in terminal:

```bash
cd /Users/yusuf/Documents/falcon/tech-tracker/tech-tracker-mobile

# Login to EAS (use your expo account)
eas login

# Build APK (first build is free!)
eas build --platform android --profile preview
```

### Step 3: Download APK
- EAS will build your app in the cloud (~10-15 minutes)
- You'll get a link to download the APK
- Download and transfer to your phone
- Install the APK

---

## Alternative: Local Build (Requires Android Studio)

### Prerequisites
- Install Android Studio: https://developer.android.com/studio
- Install Java JDK 17

### Steps:

```bash
cd /Users/yusuf/Documents/falcon/tech-tracker/tech-tracker-mobile

# Update backend URL in the app first
# Edit src/services/api.js
# Edit src/services/location.js
# Change to your production backend URL

# Build APK locally
npx expo run:android --variant release

# APK will be in:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## Current Backend URLs to Update:

Before building, update these files with your production backend:

**File: `src/services/api.js`**
```javascript
const API_BASE_URL = 'https://tech-tracker-backend.onrender.com/api';
```

**File: `src/services/location.js`**
```javascript
const SOCKET_URL = 'https://tech-tracker-backend.onrender.com';
```

Then rebuild the app.

---

## Quick Test (Development APK)

For testing, you can use Expo Go app:
1. Install "Expo Go" from Play Store
2. Run `expo start` on your computer
3. Scan QR code with Expo Go
4. Test the app

But for a standalone APK (works without Expo Go), use EAS Build method above.
