package com.example.muzic;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
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
                settings.setAllowContentAccess(true);
                settings.setAllowFileAccess(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error configuring WebView audio settings: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event != null && MediaPlaybackService.isMediaKeyCode(event.getKeyCode())) {
            MediaPlaybackService service = MediaPlaybackService.getInstance();
            if (service != null) {
                if (service.handleMediaKeyEvent(event)) {
                    return true;
                }
            } else if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                String action = MediaButtonReceiver.mapKeyCodeToAction(event.getKeyCode());
                if (action != null) {
                    try {
                        Intent serviceIntent = new Intent(this, MediaPlaybackService.class);
                        serviceIntent.setAction(action);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(serviceIntent);
                        } else {
                            startService(serviceIntent);
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Failed forwarding foreground media key: " + e.getMessage());
                    }
                    return true;
                }
            } else {
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
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

    @Override
    public void onStop() {
        super.onStop();
        try {
            if (MediaPlaybackService.getInstance() != null && this.getBridge() != null && this.getBridge().getWebView() != null) {
                this.getBridge().getWebView().resumeTimers();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        if (isFinishing()) {
            try {
                MediaPlaybackService svc = MediaPlaybackService.getInstance();
                if (svc != null) {
                    svc.stopPlayback();
                }
            } catch (Exception ignored) {}
        }
        super.onDestroy();
    }
}
