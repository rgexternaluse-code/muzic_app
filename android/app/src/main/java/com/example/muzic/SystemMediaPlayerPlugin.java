package com.example.muzic;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "SystemMediaPlayer",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class SystemMediaPlayerPlugin extends Plugin {
    private static final String TAG = "SystemMediaPlayerPlugin";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        super.load();
        try {
            MediaPlaybackService.setActionListener((action, position) -> {
                JSObject data = new JSObject();
                data.put("action", action);
                if (position != null) {
                    data.put("position", position);
                }
                mainHandler.post(() -> notifyListeners("mediaAction", data, true));
            });
            Log.d(TAG, "SystemMediaPlayerPlugin loaded and listener registered");
        } catch (Exception e) {
            Log.e(TAG, "Error in SystemMediaPlayerPlugin.load: " + e.getMessage(), e);
        }
    }

    private void ensureServiceStarted() {
        try {
            Context context = getContext();
            if (context != null && MediaPlaybackService.getInstance() == null) {
                Intent intent = new Intent(context, MediaPlaybackService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent);
                } else {
                    context.startService(intent);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start MediaPlaybackService: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void updateTrack(PluginCall call) {
        String title = call.getString("title", "Unknown Title");
        String artist = call.getString("artist", "Unknown Artist");
        String album = call.getString("album", "Muzic");
        Double durationSec = call.getDouble("duration", 0.0);
        String artwork = call.getString("artwork", null);
        Boolean isPlaying = call.getBoolean("isPlaying", false);
        Double positionSec = call.getDouble("position", 0.0);

        long durationMs = Math.round((durationSec != null ? durationSec : 0.0) * 1000);
        long positionMs = Math.round((positionSec != null ? positionSec : 0.0) * 1000);
        boolean playing = Boolean.TRUE.equals(isPlaying);

        MediaPlaybackService service = MediaPlaybackService.getInstance();
        if (service != null) {
            service.updateTrack(title, artist, album, durationMs, artwork, playing, positionMs);
        } else {
            MediaPlaybackService.setPendingTrack(title, artist, album, durationMs, artwork, playing, positionMs);
            ensureServiceStarted();
            mainHandler.postDelayed(() -> {
                MediaPlaybackService svc = MediaPlaybackService.getInstance();
                if (svc != null) {
                    svc.updateTrack(title, artist, album, durationMs, artwork, playing, positionMs);
                }
            }, 150);
        }

        call.resolve();
    }

    @PluginMethod
    public void updatePlaybackState(PluginCall call) {
        Boolean isPlaying = call.getBoolean("isPlaying", false);
        Double positionSec = call.getDouble("position", 0.0);
        Double durationSec = call.getDouble("duration", 0.0);

        boolean playing = Boolean.TRUE.equals(isPlaying);
        long positionMs = Math.round((positionSec != null ? positionSec : 0.0) * 1000);
        long durationMs = Math.round((durationSec != null ? durationSec : 0.0) * 1000);

        MediaPlaybackService service = MediaPlaybackService.getInstance();
        if (service != null) {
            service.updatePlaybackState(playing, positionMs, durationMs);
        } else if (playing) {
            MediaPlaybackService.setPendingPlaybackState(playing, positionMs, durationMs);
            ensureServiceStarted();
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        MediaPlaybackService service = MediaPlaybackService.getInstance();
        if (service != null) {
            service.stopPlayback();
        }
        call.resolve();
    }
}
