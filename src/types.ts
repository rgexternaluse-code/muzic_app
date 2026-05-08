export interface Track {
  id: string; // Stable ID: path + filename + size hash
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
  file: Blob; // Persisted file blob for playback across sessions
  cover?: string;
  format: string;
  folderPath: string;
  fileName: string;
  size: number;
}

export interface FolderNode {
  name: string;
  path: string;
  tracks: Track[];
  subfolders: Map<string, FolderNode>;
  isExpanded: boolean;
}

export type PlaybackStatus = 'playing' | 'paused' | 'stopped' | 'buffering';

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // 0 to 100
  volume: number; // 0 to 1
  queue: Track[];
  repeatMode: 'none' | 'one' | 'all';
  isShuffle: boolean;
}
