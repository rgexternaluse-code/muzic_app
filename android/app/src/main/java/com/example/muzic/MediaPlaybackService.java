package com.example.muzic;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MediaPlaybackService extends Service {
    private static final String TAG = "MediaPlaybackService";
    public static final String CHANNEL_ID = "muzic_playback_channel";
    public static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_PLAY = "com.example.muzic.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.example.muzic.ACTION_PAUSE";
    public static final String ACTION_TOGGLE = "com.example.muzic.ACTION_TOGGLE";
    public static final String ACTION_PREV = "com.example.muzic.ACTION_PREV";
    public static final String ACTION_NEXT = "com.example.muzic.ACTION_NEXT";
    public static final String ACTION_STOP = "com.example.muzic.ACTION_STOP";

    public interface MediaActionListener {
        void onMediaAction(String action, Double position);
    }

    private static MediaActionListener actionListener;
    private static MediaPlaybackService instance;

    private MediaSession mediaSession;
    private NotificationManager notificationManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private String currentTitle = "Muzic";
    private String currentArtist = "Playing";
    private String currentAlbum = "Muzic";
    private long currentDurationMs = 0;
    private long currentPositionMs = 0;
    private boolean isPlaying = false;
    private String currentArtworkUrl = null;
    private Bitmap currentArtworkBitmap = null;
    private boolean isForeground = false;

    public static void setActionListener(MediaActionListener listener) {
        actionListener = listener;
    }

    public static MediaPlaybackService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
        setupMediaSession();
        Log.d(TAG, "MediaPlaybackService created");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Music Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background audio playback and system media controls");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void setupMediaSession() {
        mediaSession = new MediaSession(this, "MuzicMediaSession");
        mediaSession.setFlags(
            MediaSession.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                Log.d(TAG, "MediaSession: onPlay");
                triggerAction("play", null);
            }

            @Override
            public void onPause() {
                Log.d(TAG, "MediaSession: onPause");
                triggerAction("pause", null);
            }

            @Override
            public void onSkipToNext() {
                Log.d(TAG, "MediaSession: onSkipToNext");
                triggerAction("next", null);
            }

            @Override
            public void onSkipToPrevious() {
                Log.d(TAG, "MediaSession: onSkipToPrevious");
                triggerAction("previous", null);
            }

            @Override
            public void onSeekTo(long pos) {
                Log.d(TAG, "MediaSession: onSeekTo " + pos);
                currentPositionMs = pos;
                updatePlaybackState(isPlaying, pos, currentDurationMs);
                triggerAction("seekTo", pos / 1000.0);
            }

            @Override
            public void onStop() {
                Log.d(TAG, "MediaSession: onStop");
                triggerAction("stop", null);
                stopPlayback();
            }
        });

        mediaSession.setActive(true);
    }

    private void triggerAction(String action, Double position) {
        if (actionListener != null) {
            actionListener.onMediaAction(action, position);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            Log.d(TAG, "onStartCommand action: " + action);
            switch (action) {
                case ACTION_TOGGLE:
                    if (isPlaying) {
                        triggerAction("pause", null);
                    } else {
                        triggerAction("play", null);
                    }
                    break;
                case ACTION_PLAY:
                    triggerAction("play", null);
                    break;
                case ACTION_PAUSE:
                    triggerAction("pause", null);
                    break;
                case ACTION_PREV:
                    triggerAction("previous", null);
                    break;
                case ACTION_NEXT:
                    triggerAction("next", null);
                    break;
                case ACTION_STOP:
                    triggerAction("stop", null);
                    stopPlayback();
                    break;
            }
        }
        return START_STICKY;
    }

    public void updateTrack(
        String title,
        String artist,
        String album,
        long durationMs,
        String artworkUrl,
        boolean playing,
        long positionMs
    ) {
        this.currentTitle = (title != null && !title.isEmpty()) ? title : "Unknown Title";
        this.currentArtist = (artist != null && !artist.isEmpty()) ? artist : "Unknown Artist";
        this.currentAlbum = (album != null && !album.isEmpty()) ? album : "Muzic";
        this.currentDurationMs = durationMs;
        this.isPlaying = playing;
        this.currentPositionMs = positionMs;

        // Check if artwork changed
        boolean artworkChanged = (artworkUrl != null && !artworkUrl.equals(currentArtworkUrl)) ||
                                 (artworkUrl == null && currentArtworkUrl != null);

        if (artworkChanged) {
            this.currentArtworkUrl = artworkUrl;
            loadArtworkAsync(artworkUrl);
        } else {
            publishMetadataAndNotification();
        }
    }

    public void updatePlaybackState(boolean playing, long positionMs, long durationMs) {
        this.isPlaying = playing;
        this.currentPositionMs = positionMs;
        if (durationMs > 0) {
            this.currentDurationMs = durationMs;
        }

        if (mediaSession != null) {
            long actions = PlaybackState.ACTION_PLAY
                | PlaybackState.ACTION_PAUSE
                | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT
                | PlaybackState.ACTION_SKIP_TO_PREVIOUS
                | PlaybackState.ACTION_SEEK_TO
                | PlaybackState.ACTION_STOP;

            PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                .setActions(actions)
                .setState(
                    playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                    positionMs,
                    playing ? 1.0f : 0.0f
                );

            mediaSession.setPlaybackState(stateBuilder.build());
        }

        // Update notification controls (Play vs Pause icon)
        updateNotification();
    }

    private void loadArtworkAsync(final String artworkUrl) {
        if (artworkUrl == null || artworkUrl.trim().isEmpty()) {
            currentArtworkBitmap = getDefaultArtwork();
            publishMetadataAndNotification();
            return;
        }

        executor.execute(() -> {
            Bitmap bmp = null;
            try {
                if (artworkUrl.startsWith("data:image/")) {
                    int commaIndex = artworkUrl.indexOf(",");
                    if (commaIndex != -1) {
                        String base64Data = artworkUrl.substring(commaIndex + 1);
                        byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
                        bmp = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                    }
                } else if (artworkUrl.startsWith("content://")) {
                    Uri uri = Uri.parse(artworkUrl);
                    InputStream inputStream = getContentResolver().openInputStream(uri);
                    if (inputStream != null) {
                        bmp = BitmapFactory.decodeStream(inputStream);
                        inputStream.close();
                    }
                } else if (artworkUrl.startsWith("http://") || artworkUrl.startsWith("https://")) {
                    URL url = new URL(artworkUrl);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setDoInput(true);
                    connection.setConnectTimeout(4000);
                    connection.setReadTimeout(4000);
                    connection.connect();
                    InputStream input = connection.getInputStream();
                    bmp = BitmapFactory.decodeStream(input);
                    input.close();
                }

                if (bmp != null) {
                    // Resize to a maximum of 512x512 to avoid Binder IPC memory overflow
                    int maxDim = 512;
                    if (bmp.getWidth() > maxDim || bmp.getHeight() > maxDim) {
                        float ratio = Math.min((float) maxDim / bmp.getWidth(), (float) maxDim / bmp.getHeight());
                        int width = Math.round(ratio * bmp.getWidth());
                        int height = Math.round(ratio * bmp.getHeight());
                        bmp = Bitmap.createScaledBitmap(bmp, width, height, true);
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Error decoding artwork: " + e.getMessage());
            }

            final Bitmap finalBitmap = (bmp != null) ? bmp : getDefaultArtwork();
            mainHandler.post(() -> {
                currentArtworkBitmap = finalBitmap;
                publishMetadataAndNotification();
            });
        });
    }

    private Bitmap getDefaultArtwork() {
        try {
            return BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
        } catch (Exception e) {
            return null;
        }
    }

    private void publishMetadataAndNotification() {
        if (mediaSession != null) {
            MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, currentAlbum)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, currentDurationMs);

            if (currentArtworkBitmap != null) {
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, currentArtworkBitmap);
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ART, currentArtworkBitmap);
            }

            mediaSession.setMetadata(metaBuilder.build());

            // Also set playback state
            long actions = PlaybackState.ACTION_PLAY
                | PlaybackState.ACTION_PAUSE
                | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT
                | PlaybackState.ACTION_SKIP_TO_PREVIOUS
                | PlaybackState.ACTION_SEEK_TO
                | PlaybackState.ACTION_STOP;

            PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                .setActions(actions)
                .setState(
                    isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                    currentPositionMs,
                    isPlaying ? 1.0f : 0.0f
                );

            mediaSession.setPlaybackState(stateBuilder.build());
        }

        updateNotification();
    }

    private Notification buildNotification() {
        int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        // Open MainActivity when tapping notification
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            pendingIntentFlags
        );

        // Previous Action
        Intent prevIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_PREV);
        PendingIntent prevPendingIntent = PendingIntent.getService(this, 1, prevIntent, pendingIntentFlags);
        Notification.Action prevAction = new Notification.Action.Builder(
            android.R.drawable.ic_media_previous,
            "Previous",
            prevPendingIntent
        ).build();

        // Play/Pause Action
        Intent toggleIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_TOGGLE);
        PendingIntent togglePendingIntent = PendingIntent.getService(this, 2, toggleIntent, pendingIntentFlags);
        int playPauseIcon = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String playPauseTitle = isPlaying ? "Pause" : "Play";
        Notification.Action playPauseAction = new Notification.Action.Builder(
            playPauseIcon,
            playPauseTitle,
            togglePendingIntent
        ).build();

        // Next Action
        Intent nextIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_NEXT);
        PendingIntent nextPendingIntent = PendingIntent.getService(this, 3, nextIntent, pendingIntentFlags);
        Notification.Action nextAction = new Notification.Action.Builder(
            android.R.drawable.ic_media_next,
            "Next",
            nextPendingIntent
        ).build();

        // Build notification
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        Notification.MediaStyle mediaStyle = new Notification.MediaStyle();
        if (mediaSession != null) {
            mediaStyle.setMediaSession(mediaSession.getSessionToken());
        }
        mediaStyle.setShowActionsInCompactView(0, 1, 2);

        builder.setStyle(mediaStyle)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText(currentAlbum)
            .setContentIntent(contentPendingIntent)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)
            .addAction(prevAction)
            .addAction(playPauseAction)
            .addAction(nextAction);

        if (currentArtworkBitmap != null) {
            builder.setLargeIcon(currentArtworkBitmap);
        }

        return builder.build();
    }

    private void updateNotification() {
        try {
            Notification notification = buildNotification();
            if (!isForeground) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                    );
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
                isForeground = true;
            } else {
                if (notificationManager != null) {
                    notificationManager.notify(NOTIFICATION_ID, notification);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating notification: " + e.getMessage(), e);
        }
    }

    public void stopPlayback() {
        isPlaying = false;
        try {
            if (mediaSession != null) {
                mediaSession.setActive(false);
            }
            stopForeground(true);
            isForeground = false;
        } catch (Exception e) {
            Log.e(TAG, "Error stopping foreground: " + e.getMessage());
        }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        executor.shutdown();
        instance = null;
        super.onDestroy();
        Log.d(TAG, "MediaPlaybackService destroyed");
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        if (!isPlaying) {
            stopPlayback();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return new LocalBinder();
    }

    public class LocalBinder extends Binder {
        public MediaPlaybackService getService() {
            return MediaPlaybackService.this;
        }
    }
}
