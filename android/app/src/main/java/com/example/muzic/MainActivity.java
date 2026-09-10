package com.example.muzic;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeAudioScannerPlugin.class);
        registerPlugin(SystemMediaPlayerPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Retrieve the Capacitor WebView engine and optimize it for audio
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            // Allow media playback without explicit physical user gestures in the background
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Ensure webview timers keep running for continuous background playback
        try {
            WebView webView = this.getBridge().getWebView();
            if (webView != null) {
                webView.resumeTimers();
            }
        } catch (Exception ignored) {}
    }
}
