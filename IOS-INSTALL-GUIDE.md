# iOS Installation Guide

## ✅ Yes, the app works on iOS!

The Tech Tracker app is built with Expo and React Native, which fully supports both iOS and Android.

---

## 📱 Installation Methods for iOS

### Method 1: Development Testing (Easiest - No Build Required)

#### Using Expo Go App (Recommended for Testing)

1. **Install Expo Go on your iPhone**
   - Open App Store on your iPhone
   - Search for "Expo Go"
   - Install the app

2. **Start the development server**
   ```bash
   cd tech-tracker-mobile
   npx expo start
   ```

3. **Connect your iPhone**
   - Make sure your iPhone and Mac are on the **same WiFi network**
   - Open the Camera app on your iPhone
   - Scan the QR code shown in the terminal
   - It will open in Expo Go

#### Using Tunnel Mode (Works from Anywhere)

If you're on different networks:
```bash
cd tech-tracker-mobile
npx expo start --tunnel
```
Then scan the QR code from your iPhone's Camera app.

---

### Method 2: iOS Simulator (For Testing on Mac)

If you have a Mac with Xcode installed:

1. **Install Xcode** (if not already installed)
   - Download from Mac App Store
   - Install Command Line Tools: `xcode-select --install`

2. **Run in iOS Simulator**
   ```bash
   cd tech-tracker-mobile
   npx expo start
   ```
   - Press `i` to open iOS simulator
   - The app will run in a virtual iPhone

---

### Method 3: Build Installable iOS App (TestFlight)

To install on physical iPhones without Expo Go:

#### Prerequisites
- Apple Developer Account ($99/year) **required** for iOS
- Mac computer (required for iOS builds)

#### Step 1: Build for iOS
```bash
cd tech-tracker-mobile
eas build --platform ios --profile preview
```

This creates a **Simulator build** (free, no Apple account needed) OR:

For real device installation:
```bash
eas build --platform ios --profile production
```

#### Step 2: Install via TestFlight

1. **After build completes**, EAS will give you options:
   - Upload to TestFlight (recommended)
   - Download IPA file

2. **Using TestFlight** (Recommended):
   ```bash
   eas submit --platform ios
   ```
   - This uploads to App Store Connect
   - You can then invite testers via TestFlight
   - Testers install TestFlight app and get your app

3. **Manual Installation** (Advanced):
   - Download the `.ipa` file from EAS
   - Use Xcode or Apple Configurator to install
   - Device must be registered in Apple Developer account

---

### Method 4: Ad-Hoc Distribution (Without App Store)

For installing on specific devices without TestFlight:

1. **Register devices** in Apple Developer Portal
2. **Build with ad-hoc provisioning**:
   ```bash
   eas build --platform ios --profile preview
   ```
3. **Distribute the IPA** to registered devices
4. Install using Xcode or over-the-air (OTA) installation

---

## 🚀 Quick Start (Recommended for Now)

Since building for iOS requires an Apple Developer account ($99/year), the **easiest way** to test on iPhone is:

### Option A: Expo Go (Free)
```bash
cd tech-tracker-mobile
npx expo start --tunnel
```
- Scan QR code with iPhone Camera
- Opens in Expo Go app
- Works from anywhere (no same network needed)

### Option B: iOS Simulator (Free, Mac only)
```bash
cd tech-tracker-mobile
npx expo start
# Press 'i' when it starts
```

---

## 📝 Notes

### Differences: Android vs iOS Installation

| Feature | Android | iOS |
|---------|---------|-----|
| **Development Testing** | Expo Go (free) | Expo Go (free) |
| **Build APK/IPA** | Free, instant | Requires Apple Developer ($99/year) |
| **Install on Device** | Direct APK install | Need TestFlight or Xcode |
| **Simulator** | Android Emulator (any OS) | iOS Simulator (Mac only) |
| **Distribution** | APK direct download | TestFlight or App Store |

### Why iOS Needs Apple Developer Account?

- Apple requires **code signing** for all iOS apps
- Cannot install apps on physical iPhones without Apple certificate
- Simulator builds are free but only work in Xcode iOS Simulator
- TestFlight requires developer account but makes distribution easy

---

## 🎯 Recommended Approach

**For Development/Testing:**
- Use **Expo Go** with tunnel mode (works on any iPhone, no cost)

**For Production:**
1. Get Apple Developer account ($99/year)
2. Build with EAS: `eas build -p ios`
3. Submit to TestFlight: `eas submit -p ios`
4. Share TestFlight link with users

---

## 🔧 Current App Configuration

The app is already configured for iOS with:
- ✅ Location permissions (background tracking)
- ✅ Bundle identifier: `com.techtracker.mobile`
- ✅ Dark mode support
- ✅ Tablet support (iPad)
- ✅ Production backend URLs configured

You can use it on iOS right now with Expo Go!
