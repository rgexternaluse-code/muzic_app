# Muzic iOS Setup & Build Instructions

This project is fully configured for **cross-platform dual-OS support** (Android + iOS). The codebase shares the same React frontend and audio engine, with native platform integrations tailored for both operating systems.

---

## 🎵 iOS Features Configured

1. **Background Audio Playback**:
   - `UIBackgroundModes` with `audio` is configured in `ios/App/App/Info.plist`.
   - Music continues playing uninterrupted when the device screen locks or when switching apps.

2. **Silent Switch / Mute Bypass**:
   - Configured in `AppDelegate.swift` using `AVAudioSession.sharedInstance().setCategory(.playback)`.
   - Audio plays through the speaker or headphones even when the iPhone's physical Ring/Silent switch or Action Button is set to Silent.

3. **Lock Screen & Control Center Controls**:
   - Full playback controls (Play, Pause, Skip, Previous, Seek) and track metadata/artwork are integrated via WebKit's native Media Session API.
   - Works with iOS Lock Screen, Control Center, Apple Watch, AirPods pinch/stem gestures, and Dynamic Island (iOS 16.1+).

4. **iOS Files App & iCloud Drive Support**:
   - `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace` are enabled.
   - Users can transfer MP3, M4A, FLAC, and WAV files directly into the **On My iPhone > Muzic** folder via Mac Finder/iTunes or the iOS Files app.
   - The native Document Picker (`@capawesome/capacitor-file-picker`) filters using the Apple Uniform Type Identifier `public.audio`.

5. **Edge-to-Edge Display & Safe Area Support**:
   - `viewport-fit=cover` enabled to support the iPhone notch, Dynamic Island, and home indicator.

---

## 🛠️ Prerequisites for Building iOS

To compile and package the native iOS app (`.ipa`), Apple requires:
- **macOS** (MacBook, Mac mini, Mac Studio, or iMac)
- **Xcode** (free download from Mac App Store)
- **Apple Developer Account** (Free for local development on your personal iPhone/iPad; Paid $99/year for TestFlight and App Store distribution)
- **Node.js 18+** & **npm**

*(If you are developing on Windows or Linux, you can run the Android build locally or use CI services such as GitHub Actions, Bitrise, or Ionic Appflow to compile the iOS binary).*

---

## 🚀 Step-by-Step iOS Build Guide

### 1. Build and Sync Web Assets to iOS

In the root of the project, run:
```bash
npm run ios:sync
```
*(This builds the React app and copies assets, plugins, and configurations into the `ios/` native Xcode project).*

### 2. Open the Project in Xcode

Run:
```bash
npm run ios:open
```
*Or manually open `ios/App/App.xcworkspace` in Xcode.*

### 3. Configure Signing (One-time setup)

1. In Xcode's left sidebar, click the top-level **App** project.
2. Select the **App** target.
3. Click the **Signing & Capabilities** tab.
4. Under **Team**, select your Apple ID or Developer Account Team.
5. If necessary, adjust the **Bundle Identifier** (e.g., `com.example.muzic` or your custom domain identifier).

### 4. Run on iOS Simulator or Physical iPhone

- **To run on Simulator**: Select an iPhone simulator (e.g. *iPhone 16 Pro*) from the target device dropdown at the top of Xcode, then click the **Play (Run)** button or press `Cmd + R`.
- **To run on your personal iPhone**:
  1. Connect your iPhone via USB cable or Wi-Fi.
  2. Select your iPhone in Xcode's target device dropdown.
  3. Click **Run** (`Cmd + R`).
  4. On your iPhone: Go to **Settings > General > VPN & Device Management**, tap your developer certificate, and tap **Trust**.

### 5. Build `.ipa` for TestFlight / App Store Distribution

1. In Xcode, select **Any iOS Device (arm64)** in the scheme selector.
2. In the top menu, choose **Product > Archive**.
3. Once the archive completes, the Organizer window will open.
4. Click **Distribute App** to upload directly to **TestFlight** or export an `.ipa` file.

---

## ⚡ Available NPM Commands Summary

| Command | Description |
| :--- | :--- |
| `npm run ios:sync` | Builds web assets & synchronizes iOS native project |
| `npm run ios:copy` | Quick copy of web build to iOS folder without plugin update |
| `npm run ios:open` | Launches the iOS project directly in Apple Xcode |
| `npm run cap:sync` | Synchronizes both Android and iOS projects in one command |
| `npm run android:build` | Generates compliant, non-debuggable Android release APK |
| `npm run dev` | Starts local web development server on port 3000 |
