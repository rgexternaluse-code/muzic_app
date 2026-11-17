package com.example.muzic;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Base64;
import android.util.Log;
import android.view.KeyEvent;

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

    private static final long HEADSET_HOOK_MULTI_TAP_DELAY_MS = 380L;

    public interface MediaActionListener {
        void onMediaAction(String action, Double position);
    }

    private static MediaActionListener actionListener;
    private static MediaPlaybackService instance;

    // Pending buffers so updates issued before onCreate() finishes are never dropped
    private static boolean hasPendingTrack = false;
    private static String pendingTitle = null;
    private static String pendingArtist = null;
    private static String pendingAlbum = null;
    private static long pendingDurationMs = 0L;
    private static String pendingArtworkUrl = null;
    private static boolean pendingTrackIsPlaying = false;
    private static long pendingTrackPositionMs = 0L;

    private static boolean hasPendingPlaybackState = false;
    private static boolean pendingStateIsPlaying = false;
    private static long pendingStatePositionMs = 0L;
    private static long pendingStateDurationMs = 0L;

    private MediaSession mediaSession;
    private NotificationManager notificationManager;
    private PowerManager.WakeLock wakeLock;
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
    private boolean noisyReceiverRegistered = false;

    private int headsetHookTapCount = 0;
    private final Runnable headsetHookTapRunnable = () -> {
        int taps = headsetHookTapCount;
        headsetHookTapCount = 0;
        if (taps <= 0) {
            return;
        }
        Log.d(TAG, "Headset hook resolved taps=" + taps);
        if (taps == 1) {
            togglePlayPauseFromHardware();
        } else if (taps == 2) {
            triggerAction("next", null);
        } else {
            triggerAction("previous", null);
        }
    };

    private final BroadcastReceiver becomingNoisyReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent != null && AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                Log.d(TAG, "Audio becoming noisy (Bluetooth/headphone disconnected) - pausing playback");
                if (isPlaying) {
                    updatePlaybackState(false, currentPositionMs, currentDurationMs);
                    triggerAction("pause", null);
                }
            }
        }
    };

    public static void setActionListener(MediaActionListener listener) {
        actionListener = listener;
    }

    public static MediaPlaybackService getInstance() {
        return instance;
    }

    public static synchronized void setPendingTrack(
        String title,
        String artist,
        String album,
        long durationMs,
        String artworkUrl,
        boolean playing,
        long positionMs
    ) {
        hasPendingTrack = true;
        pendingTitle = title;
        pendingArtist = artist;
        pendingAlbum = album;
        pendingDurationMs = durationMs;
        pendingArtworkUrl = artworkUrl;
        pendingTrackIsPlaying = playing;
        pendingTrackPositionMs = positionMs;
    }

    public static synchronized void setPendingPlaybackState(boolean playing, long positionMs, long durationMs) {
        hasPendingPlaybackState = true;
        pendingStateIsPlaying = playing;
        pendingStatePositionMs = positionMs;
        pendingStateDurationMs = durationMs;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        initWakeLock();
        createNotificationChannel();
        setupMediaSession();
        registerNoisyReceiver();

        // Flush any buffered track / state sent before onCreate() completed
        synchronized (MediaPlaybackService.class) {
            if (hasPendingTrack) {
                hasPendingTrack = false;
                updateTrack(
                    pendingTitle,
                    pendingArtist,
                    pendingAlbum,
                    pendingDurationMs,
                    pendingArtworkUrl,
                    pendingTrackIsPlaying,
                    pendingTrackPositionMs
                );
            }
            if (hasPendingPlaybackState) {
                hasPendingPlaybackState = false;
                updatePlaybackState(pendingStateIsPlaying, pendingStatePositionMs, pendingStateDurationMs);
            }
        }

        try {
            Notification notification = buildNotification();
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
        } catch (Exception e) {
            Log.e(TAG, "Initial foreground start exception: " + e.getMessage(), e);
        }
        Log.d(TAG, "MediaPlaybackService created");
    }

    private void initWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "muzic:MediaPlaybackWakeLock");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception e) {
            Log.w(TAG, "WakeLock init failed: " + e.getMessage());
        }
    }

    private void syncWakeLock(boolean playing) {
        try {
            if (wakeLock == null) return;
            if (playing) {
                if (!wakeLock.isHeld()) {
                    // Hold wake lock while playing so Bluetooth background skips stay responsive
                    wakeLock.acquire(4 * 60 * 60 * 1000L);
                }
            } else {
                if (wakeLock.isHeld()) {
                    wakeLock.release();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "WakeLock sync failed: " + e.getMessage());
        }
    }

    private void pulseWakeLockBriefly() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(3000L);
            }
        } catch (Exception ignored) {}
    }

    private void registerNoisyReceiver() {
        if (noisyReceiverRegistered) return;
        try {
            IntentFilter filter = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(becomingNoisyReceiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                registerReceiver(becomingNoisyReceiver, filter);
            }
            noisyReceiverRegistered = true;
        } catch (Exception e) {
            Log.w(TAG, "Failed to register becomingNoisyReceiver: " + e.getMessage());
        }
    }

    private void unregisterNoisyReceiver() {
        if (!noisyReceiverRegistered) return;
        try {
            unregisterReceiver(becomingNoisyReceiver);
        } catch (Exception ignored) {}
        noisyReceiverRegistered = false;
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

    private long getSupportedActions() {
        return PlaybackState.ACTION_PLAY
            | PlaybackState.ACTION_PAUSE
            | PlaybackState.ACTION_PLAY_PAUSE
            | PlaybackState.ACTION_SKIP_TO_NEXT
            | PlaybackState.ACTION_SKIP_TO_PREVIOUS
            | PlaybackState.ACTION_SEEK_TO
            | PlaybackState.ACTION_FAST_FORWARD
            | PlaybackState.ACTION_REWIND
            | PlaybackState.ACTION_STOP;
    }

    private void setupMediaSession() {
        mediaSession = new MediaSession(this, "MuzicMediaSession");
        mediaSession.setFlags(
            MediaSession.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build();
        mediaSession.setPlaybackToLocal(audioAttributes);

        try {
            Intent mbrIntent = new Intent(this, MediaButtonReceiver.class);
            mbrIntent.setAction(Intent.ACTION_MEDIA_BUTTON);
            int mbrFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                mbrFlags |= PendingIntent.FLAG_MUTABLE;
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                mbrFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent mbrPendingIntent = PendingIntent.getBroadcast(this, 100, mbrIntent, mbrFlags);
            mediaSession.setMediaButtonReceiver(mbrPendingIntent);
        } catch (Exception e) {
            Log.w(TAG, "Failed setting MediaButtonReceiver on session: " + e.getMessage());
        }

        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            @SuppressWarnings("deprecation")
            public boolean onMediaButtonEvent(Intent mediaButtonIntent) {
                if (mediaButtonIntent != null && Intent.ACTION_MEDIA_BUTTON.equals(mediaButtonIntent.getAction())) {
                    KeyEvent keyEvent = null;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        keyEvent = mediaButtonIntent.getParcelableExtra(Intent.EXTRA_KEY_EVENT, KeyEvent.class);
                    } else {
                        keyEvent = mediaButtonIntent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                    }
                    if (keyEvent != null && handleMediaKeyEvent(keyEvent)) {
                        return true;
                    }
                }
                return super.onMediaButtonEvent(mediaButtonIntent);
            }

            @Override
            public void onPlay() {
                Log.d(TAG, "MediaSession: onPlay");
                updatePlaybackState(true, currentPositionMs, currentDurationMs);
                triggerAction("play", null);
            }

            @Override
            public void onPause() {
                Log.d(TAG, "MediaSession: onPause");
                updatePlaybackState(false, currentPositionMs, currentDurationMs);
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
            public void onFastForward() {
                Log.d(TAG, "MediaSession: onFastForward");
                long targetMs = currentPositionMs + 10000L;
                if (currentDurationMs > 0) {
                    targetMs = Math.min(currentDurationMs, targetMs);
                }
                currentPositionMs = targetMs;
                updatePlaybackState(isPlaying, targetMs, currentDurationMs);
                triggerAction("seekTo", targetMs / 1000.0);
            }

            @Override
            public void onRewind() {
                Log.d(TAG, "MediaSession: onRewind");
                long targetMs = Math.max(0L, currentPositionMs - 10000L);
                currentPositionMs = targetMs;
                updatePlaybackState(isPlaying, targetMs, currentDurationMs);
                triggerAction("seekTo", targetMs / 1000.0);
            }

            @Override
            public void onSeekTo(long pos) {
                Log.d(TAG, "MediaSession: onSeekTo " + pos);
                currentPositionMs = Math.max(0L, pos);
                updatePlaybackState(isPlaying, currentPositionMs, currentDurationMs);
                triggerAction("seekTo", currentPositionMs / 1000.0);
            }

            @Override
            public void onStop() {
                Log.d(TAG, "MediaSession: onStop");
                triggerAction("stop", null);
                stopPlayback();
            }
        }, mainHandler);

        // Publish an initial PlaybackState immediately so Android routes hardware media buttons here
        PlaybackState initialState = new PlaybackState.Builder()
            .setActions(getSupportedActions())
            .setState(PlaybackState.STATE_PAUSED, 0L, 0.0f, SystemClock.elapsedRealtime())
            .build();
        mediaSession.setPlaybackState(initialState);
        mediaSession.setActive(true);
    }

    private void togglePlayPauseFromHardware() {
        if (isPlaying) {
            updatePlaybackState(false, currentPositionMs, currentDurationMs);
            triggerAction("pause", null);
        } else {
            updatePlaybackState(true, currentPositionMs, currentDurationMs);
            triggerAction("play", null);
        }
    }

    public boolean handleMediaKeyEvent(KeyEvent event) {
        if (event == null) {
            return false;
        }
        int keyCode = event.getKeyCode();
        if (!isMediaKeyCode(keyCode)) {
            return false;
        }

        // Consume both ACTION_DOWN and ACTION_UP so WebView does not drop or double-handle events
        if (event.getAction() != KeyEvent.ACTION_DOWN || event.getRepeatCount() > 0) {
            return true;
        }

        Log.d(TAG, "handleMediaKeyEvent keyCode=" + keyCode);
        pulseWakeLockBriefly();

        switch (keyCode) {
            case KeyEvent.KEYCODE_HEADSETHOOK:
                headsetHookTapCount++;
                mainHandler.removeCallbacks(headsetHookTapRunnable);
                if (headsetHookTapCount >= 3) {
                    headsetHookTapCount = 0;
                    triggerAction("previous", null);
                } else {
                    mainHandler.postDelayed(headsetHookTapRunnable, HEADSET_HOOK_MULTI_TAP_DELAY_MS);
                }
                return true;

            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                togglePlayPauseFromHardware();
                return true;

            case KeyEvent.KEYCODE_MEDIA_PLAY:
                updatePlaybackState(true, currentPositionMs, currentDurationMs);
                triggerAction("play", null);
                return true;

            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                updatePlaybackState(false, currentPositionMs, currentDurationMs);
                triggerAction("pause", null);
                return true;

            case KeyEvent.KEYCODE_MEDIA_NEXT:
                triggerAction("next", null);
                return true;

            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                triggerAction("previous", null);
                return true;

            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD: {
                long targetMs = currentPositionMs + 10000L;
                if (currentDurationMs > 0) {
                    targetMs = Math.min(currentDurationMs, targetMs);
                }
                currentPositionMs = targetMs;
                updatePlaybackState(isPlaying, targetMs, currentDurationMs);
                triggerAction("seekTo", targetMs / 1000.0);
                return true;
            }

            case KeyEvent.KEYCODE_MEDIA_REWIND: {
                long targetMs = Math.max(0L, currentPositionMs - 10000L);
                currentPositionMs = targetMs;
                updatePlaybackState(isPlaying, targetMs, currentDurationMs);
                triggerAction("seekTo", targetMs / 1000.0);
                return true;
            }

            case KeyEvent.KEYCODE_MEDIA_STOP:
                triggerAction("stop", null);
                stopPlayback();
                return true;

            default:
                return false;
        }
    }

    public static boolean isMediaKeyCode(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_HEADSETHOOK:
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_PLAY:
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_NEXT:
            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
            case KeyEvent.KEYCODE_MEDIA_STOP:
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
            case KeyEvent.KEYCODE_MEDIA_REWIND:
                return true;
            default:
                return false;
        }
    }

    private void triggerAction(final String action, final Double position) {
        pulseWakeLockBriefly();
        mainHandler.post(() -> {
            if (actionListener != null) {
                actionListener.onMediaAction(action, position);
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            Log.d(TAG, "onStartCommand action: " + action);
            switch (action) {
                case ACTION_TOGGLE:
                    togglePlayPauseFromHardware();
                    break;
                case ACTION_PLAY:
                    updatePlaybackState(true, currentPositionMs, currentDurationMs);
                    triggerAction("play", null);
                    break;
                case ACTION_PAUSE:
                    updatePlaybackState(false, currentPositionMs, currentDurationMs);
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
        return START_NOT_STICKY;
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
        this.currentDurationMs = Math.max(0L, durationMs);
        this.isPlaying = playing;
        this.currentPositionMs = Math.max(0L, positionMs);
        syncWakeLock(playing);

        if (mediaSession != null && !mediaSession.isActive()) {
            mediaSession.setActive(true);
        }

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
        this.currentPositionMs = Math.max(0L, positionMs);
        if (durationMs > 0) {
            this.currentDurationMs = durationMs;
        }
        syncWakeLock(playing);

        if (mediaSession != null) {
            if (!mediaSession.isActive()) {
                mediaSession.setActive(true);
            }
            PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                .setActions(getSupportedActions())
                .setState(
                    playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                    this.currentPositionMs,
                    playing ? 1.0f : 0.0f,
                    SystemClock.elapsedRealtime()
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

            PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                .setActions(getSupportedActions())
                .setState(
                    isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                    currentPositionMs,
                    isPlaying ? 1.0f : 0.0f,
                    SystemClock.elapsedRealtime()
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

        // Stop/Dismiss Action (Delete Intent)
        Intent stopIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_STOP);
        PendingIntent deletePendingIntent = PendingIntent.getService(this, 4, stopIntent, pendingIntentFlags);

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
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText(currentAlbum)
            .setContentIntent(contentPendingIntent)
            .setDeleteIntent(deletePendingIntent)
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
        Log.d(TAG, "stopPlayback called - clearing notification and releasing session");
        isPlaying = false;
        mainHandler.removeCallbacks(headsetHookTapRunnable);
        headsetHookTapCount = 0;
        syncWakeLock(false);

        try {
            if (mediaSession != null) {
                mediaSession.setActive(false);
                mediaSession.release();
                mediaSession = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error releasing mediaSession: " + e.getMessage());
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping foreground: " + e.getMessage());
        }

        try {
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
                notificationManager.cancelAll();
            }
            isForeground = false;
        } catch (Exception e) {
            Log.e(TAG, "Error canceling notification: " + e.getMessage());
        }

        stopSelf();
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "MediaPlaybackService onDestroy called");
        mainHandler.removeCallbacks(headsetHookTapRunnable);
        unregisterNoisyReceiver();
        syncWakeLock(false);

        try {
            if (mediaSession != null) {
                mediaSession.setActive(false);
                mediaSession.release();
                mediaSession = null;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
                notificationManager.cancelAll();
            }
        } catch (Exception ignored) {}

        executor.shutdown();
        instance = null;
        super.onDestroy();
        Log.d(TAG, "MediaPlaybackService destroyed completely");
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        Log.d(TAG, "onTaskRemoved: User cleared app from recent running apps list. Removing all controls.");
        stopPlayback();
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
