import { registerPlugin, Capacitor } from '@capacitor/core';
import { Track } from '../types';

export interface NativeTrackRaw {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  path: string;
  contentUri: string;
  fileName: string;
  folderPath: string;
  size: number;
  format: string;
  cover?: string | null;
}

export interface NativeAudioScannerPlugin {
  checkAudioPermissions(): Promise<{ granted: boolean }>;
  requestAudioPermissions(): Promise<{ granted: boolean }>;
  scanAudioFiles(): Promise<{ tracks: NativeTrackRaw[]; count: number }>;
}

export const NativeAudioScanner = registerPlugin<NativeAudioScannerPlugin>('NativeAudioScanner');

export async function isNativePlatform(): Promise<boolean> {
  return Capacitor.isNativePlatform();
}

export async function scanDeviceAudioFiles(): Promise<Track[]> {
  if (!Capacitor.isNativePlatform()) {
    return [];
  }

  try {
    const permResult = await NativeAudioScanner.requestAudioPermissions();
    if (!permResult.granted) {
      console.warn("Audio permission was not granted by the user");
      return [];
    }

    const scanResult = await NativeAudioScanner.scanAudioFiles();
    if (!scanResult || !scanResult.tracks || scanResult.tracks.length === 0) {
      return [];
    }

    return scanResult.tracks.map((raw): Track => {
      // Capacitor.convertFileSrc creates a local HTTP URL (_capacitor_file_) that WebView audio element can play and seek seamlessly
      const audioUrl = raw.path 
        ? Capacitor.convertFileSrc(raw.path)
        : (raw.contentUri ? Capacitor.convertFileSrc(raw.contentUri) : '');

      return {
        id: raw.id || `dev_${raw.fileName}_${raw.size}`,
        title: raw.title || raw.fileName,
        artist: raw.artist || 'Unknown Artist',
        album: raw.album || 'Device Music',
        duration: raw.duration || 0,
        url: audioUrl,
        folderPath: raw.folderPath || 'Music',
        fileName: raw.fileName || raw.title,
        size: raw.size,
        format: raw.format,
        cover: raw.cover || undefined
      };
    });
  } catch (error) {
    console.error("Failed to scan native audio files:", error);
    throw error;
  }
}
