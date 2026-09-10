package com.example.muzic;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
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

    @Override
    public void load() {
        super.load();
        MediaPlaybackService.setActionListener((action, position) -> {
            JSObject data = new JSObject();
            data.put("action", action);
            if (position != null) {
                data.put("position", position);
            }
            notifyListeners("mediaAction", data);
        });
        Log.d(TAG, "SystemMediaPlayerPlugin loaded and listener registered");
    }

    private void ensureServiceStarted() {
        Context context = getContext();
        if (MediaPlaybackService.getInstance() == null) {
            Intent intent = new Intent(context, MediaPlaybackService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
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

        long durationMs = Math.round(durationSec * 1000);
        long positionMs = Math.round(positionSec * 1000);

        ensureServiceStarted();

        // If service instance already created, call update directly; otherwise post after short delay
        MediaPlaybackService service = MediaPlaybackService.getInstance();
        if (service != null) {
            service.updateTrack(title, artist, album, durationMs, artwork, isPlaying, positionMs);
        } else {
            getActivity().getWindow().getDecorView().postDelayed(() -> {
                MediaPlaybackService svc = MediaPlaybackService.getInstance();
                if (svc != null) {
                    svc.updateTrack(title, artist, album, durationMs, artwork, isPlaying, positionMs);
                }
            }, 100);
        }

        call.resolve();
    }

    @PluginMethod
    public void updatePlaybackState(PluginCall call) {
        Boolean isPlaying = call.getBoolean("isPlaying", false);
        Double positionSec = call.getDouble("position", 0.0);
        Double durationSec = call.getDouble("duration", 0.0);

        long positionMs = Math.round(positionSec * 1000);
        long durationMs = Math.round(durationSec * 1000);

        MediaPlaybackService service = MediaPlaybackService.getInstance();
        if (service != null) {
            service.updatePlaybackState(isPlaying, positionMs, durationMs);
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
