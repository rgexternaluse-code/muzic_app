import { registerPlugin, Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Track } from '../types';

export interface MediaActionEvent {
  action: 'play' | 'pause' | 'next' | 'previous' | 'seekTo' | 'stop';
  position?: number;
}

export interface UpdateTrackOptions {
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork?: string | null;
  isPlaying: boolean;
  position: number;
}

export interface UpdatePlaybackStateOptions {
  isPlaying: boolean;
  position: number;
  duration: number;
}

export interface SystemMediaPlayerPluginInterface {
  updateTrack(options: UpdateTrackOptions): Promise<void>;
  updatePlaybackState(options: UpdatePlaybackStateOptions): Promise<void>;
  stop(): Promise<void>;
  addListener(
    eventName: 'mediaAction',
    listenerFunc: (event: MediaActionEvent) => void
  ): Promise<PluginListenerHandle>;
}

export const SystemMediaPlayer = registerPlugin<SystemMediaPlayerPluginInterface>('SystemMediaPlayer');

let actionListenerHandle: PluginListenerHandle | null = null;
let hasRequestedNotificationPermission = false;

export async function requestNotificationPermissionIfNeeded(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }
  if (hasRequestedNotificationPermission) {
    return true;
  }
  hasRequestedNotificationPermission = true;

  try {
    const plugin = SystemMediaPlayer as any;
    if (typeof plugin.checkPermissions === 'function') {
      const status = await plugin.checkPermissions();
      if (status?.notifications === 'granted') {
        return true;
      }
      if (typeof plugin.requestPermissions === 'function') {
        const res = await plugin.requestPermissions();
        return res?.notifications === 'granted';
      }
    }
  } catch (e) {
    console.warn('Could not request notification permissions:', e);
  }
  return true;
}

export async function setupSystemMediaActionListener(
  onAction: (event: MediaActionEvent) => void
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  try {
    if (actionListenerHandle) {
      await actionListenerHandle.remove();
      actionListenerHandle = null;
    }

    actionListenerHandle = await SystemMediaPlayer.addListener('mediaAction', (event) => {
      onAction(event);
    });

    return () => {
      if (actionListenerHandle) {
        actionListenerHandle.remove();
        actionListenerHandle = null;
      }
    };
  } catch (err) {
    console.warn('Could not register SystemMediaPlayer action listener:', err);
    return () => {};
  }
}

export async function syncTrackToSystemMedia(
  track: Track | null,
  isPlaying: boolean,
  position: number,
  duration: number
): Promise<void> {
  if (!Capacitor.isNativePlatform() || !track) {
    return;
  }

  requestNotificationPermissionIfNeeded().catch(() => {});

  try {
    await SystemMediaPlayer.updateTrack({
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'Muzic',
      duration: duration > 0 ? duration : (track.duration || 0),
      artwork: track.cover || null,
      isPlaying,
      position: Math.max(0, position)
    });
  } catch (err) {
    console.warn('SystemMediaPlayer updateTrack error:', err);
  }
}

let lastSyncedState = {
  isPlaying: false,
  position: -1,
  duration: 0,
  timestamp: 0
};

export async function syncPlaybackStateToSystemMedia(
  isPlaying: boolean,
  position: number,
  duration: number,
  force: boolean = false
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  const now = Date.now();
  const stateChanged = lastSyncedState.isPlaying !== isPlaying;
  const seekJumped = Math.abs(position - lastSyncedState.position) > 2;
  const timeElapsed = now - lastSyncedState.timestamp >= 1000;

  if (!force && !stateChanged && !seekJumped && !timeElapsed) {
    return;
  }

  lastSyncedState = {
    isPlaying,
    position,
    duration,
    timestamp: now
  };

  try {
    await SystemMediaPlayer.updatePlaybackState({
      isPlaying,
      position: Math.max(0, position),
      duration: Math.max(0, duration)
    });
  } catch (err) {
    console.warn('SystemMediaPlayer updatePlaybackState error:', err);
  }
}

export async function stopSystemMedia(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await SystemMediaPlayer.stop();
  } catch (err) {
    console.warn('SystemMediaPlayer stop error:', err);
  }
}
