package com.example.muzic;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import android.view.KeyEvent;

public class MediaButtonReceiver extends BroadcastReceiver {
    private static final String TAG = "MediaButtonReceiver";

    @Override
    @SuppressWarnings("deprecation")
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {
            return;
        }

        KeyEvent event = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            event = intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT, KeyEvent.class);
        } else {
            event = intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
        }

        if (event == null) {
            return;
        }

        Log.d(TAG, "Received MEDIA_BUTTON keyCode=" + event.getKeyCode() + " action=" + event.getAction());

        MediaPlaybackService service = MediaPlaybackService.getInstance();
        if (service != null) {
            boolean handled = service.handleMediaKeyEvent(event);
            if (handled && isOrderedBroadcast()) {
                abortBroadcast();
            }
            return;
        }

        // If service is not currently running, only act on initial ACTION_DOWN
        if (event.getAction() != KeyEvent.ACTION_DOWN || event.getRepeatCount() > 0) {
            return;
        }

        String serviceAction = mapKeyCodeToAction(event.getKeyCode());
        if (serviceAction == null || context == null) {
            return;
        }

        try {
            Intent serviceIntent = new Intent(context, MediaPlaybackService.class);
            serviceIntent.setAction(serviceAction);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            if (isOrderedBroadcast()) {
                abortBroadcast();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to dispatch media button to service: " + e.getMessage(), e);
        }
    }

    public static String mapKeyCodeToAction(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_HEADSETHOOK:
                return MediaPlaybackService.ACTION_TOGGLE;
            case KeyEvent.KEYCODE_MEDIA_PLAY:
                return MediaPlaybackService.ACTION_PLAY;
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                return MediaPlaybackService.ACTION_PAUSE;
            case KeyEvent.KEYCODE_MEDIA_NEXT:
                return MediaPlaybackService.ACTION_NEXT;
            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                return MediaPlaybackService.ACTION_PREV;
            case KeyEvent.KEYCODE_MEDIA_STOP:
                return MediaPlaybackService.ACTION_STOP;
            default:
                return null;
        }
    }
}
