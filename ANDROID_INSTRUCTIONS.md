# Android Configuration Guide for Muzic

Since this is a hybrid Capacitor application, the React frontend source runs inside an Android WebView. In modern versions of Android, standard Web APIs (like standard HTML5 `<audio>` and the **Web Media Session API**) automatically bridge natively into Android's native system audio engines!

To ensure optimal playback behavior, persistent lockscreen, notification controls, and background execution in the native compiled APK, follow these simple configurations in your **Android Studio** project directory.

---

## 1. Android Permissions (`AndroidManifest.xml`)

Open your native project's Android Manifest located at:
`android/app/src/main/AndroidManifest.xml`

Ensure the following media permissions and service declarations are defined:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions for standard file scanning -->
    <!-- For modern Android 13+ devices -->
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <!-- For older Android 12 and below devices -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    
    <!-- Permissions for persistent background audio and wake locks -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <application
        ...
        android:allowBackup="false"
        android:usesCleartextTraffic="false"
        android:networkSecurityConfig="@xml/network_security_config">

        ...
        
    </application>
</manifest>
```

---

## 2. Release & Production APK Builds

To build the production-ready non-debuggable APK:
- **Default Build (Release / APKLint compliant, non-debuggable)**:
  ```bash
  npm run android:build
  # or on Windows:
  npm run android:build-win
  ```
- **Explicit Release Build**:
  ```bash
  npm run android:build-release
  # or on Windows:
  npm run android:build-release-win
  ```
- **Debug Variant (with debug symbols, non-debuggable)**:
  ```bash
  npm run android:build-debug
  # or on Windows:
  npm run android:build-debug-win
  ```

---

## 2. Lock screen & Background Audio Stabilization

To prevent Android's aggressive battery optimizer or doze mode from shutting down the WebView audio stream when the user turns the screen off, configure your native WebView container to support media playback without user gestures and use a CPU wake lock.

In your native Java file at `android/app/src/main/java/.../MainActivity.java`:

```java
package com.example.muzic; // Use your actual package name

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Retrieve the Capacitor WebView engine and optimize it for audio
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            // Allow media playback without explicit physical user gestures in the background
            settings.setMediaPlaybackRequiresUserGesture(false);
        }
    }
}
```

---

## 3. Bluetooth and Hardware Controller Integration

Because the application is fully integrated with the standards-based **W3C Media Session API** in the React layer:
1. Bluetooth headset playback keys (Play, Pause, Next, Previous) are captured natively by your Android WebView container.
2. The WebView translates these events into standard Javascript MediaSession actions which are triggered inside `App.tsx`!
3. The system lock screen and notification media widgets automatically align with these actions out-of-the-box.

---

## 4. Best Practices for Background Audio Releases

Always encourage users to:
1. Grant the file access permission prompted on first launch so that directories can be indexed.
2. Exclude the **Muzic** application from Android Battery Optimization (Doze Mode) in the Android device system settings if they experience any mid-track pausing when the device screen is off for long periods (this is standard behavior for all native storage-bound players).

---

## 5. Resolving the Gradle Error (API Level 36 Upgrade)

If you see a Gradle error during build regarding `checkDebugAarMetadata` or `CheckAarMetadataWorkAction`:
This is because Capacitor 8 and AndroidX libraries (such as `androidx.core:core:1.17.0` and `androidx.activity:activity:1.11.0`) require `compileSdkVersion 36`.

### The Fix:

1. Open `/android/variables.gradle` in your project root of the Android build and verify values match:
```groovy
ext {
    minSdkVersion = 24
    compileSdkVersion = 36
    targetSdkVersion = 36
    androidxActivityVersion = '1.11.0'
    androidxAppCompatVersion = '1.7.1'
    androidxCoordinatorLayoutVersion = '1.3.0'
    androidxCoreVersion = '1.17.0'
    androidxFragmentVersion = '1.8.9'
    coreSplashScreenVersion = '1.2.0'
    androidxWebkitVersion = '1.14.0'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.3.0'
    androidxEspressoCoreVersion = '3.7.0'
    cordovaAndroidVersion = '14.0.1'
}
```

2. Sync Gradle in Android Studio (`File` -> `Sync Project with Gradle Files`) and run clean build (`Build` -> `Clean Project` then `Build` -> `Rebuild Project`). This resolves all AAR metadata check errors and permissions constraints.

