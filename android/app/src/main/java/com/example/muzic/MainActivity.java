package com.example.muzic;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            SplashScreen.installSplashScreen(this);
        } catch (Exception e) {
            Log.w(TAG, "SplashScreen installation fallback: " + e.getMessage());
        }

        registerPlugin(NativeAudioScannerPlugin.class);
        registerPlugin(SystemMediaPlayerPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Retrieve the Capacitor WebView engine and optimize it for audio
        try {
            if (this.getBridge() != null && this.getBridge().getWebView() != null) {
                WebView webView = this.getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                // Allow media playback without explicit physical user gestures in the background
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error configuring WebView audio settings: " + e.getMessage(), e);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Ensure webview timers keep running for continuous background playback
        try {
            if (this.getBridge() != null && this.getBridge().getWebView() != null) {
                this.getBridge().getWebView().resumeTimers();
            }
        } catch (Exception ignored) {}
    }
}
