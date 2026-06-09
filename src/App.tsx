/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo, ChangeEvent, memo } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Music, 
  FolderPlus,
  ChevronDown,
  Folder,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  Loader2,
  Shuffle,
  Repeat,
  Repeat1,
  LayoutGrid,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track, FolderNode } from './types';
import { db } from './db';
import * as mm from 'music-metadata-browser';

// --- ViewModel / Hook for Playback Engine ---

function useMusicPlayer(tracks: Track[]) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  
  // New playback modes
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = useMemo(() => tracks[currentTrackIndex] || null, [tracks, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextTrack = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) audioRef.current.currentTime = 0;
      audioRef.current?.play();
      return;
    }

    if (shuffle) {
      const nextIndex = Math.floor(Math.random() * tracks.length);
      setCurrentTrackIndex(nextIndex);
    } else {
      setCurrentTrackIndex(p => (p + 1) % tracks.length);
    }
  };

  const prevTrack = () => {
    if (shuffle) {
      const nextIndex = Math.floor(Math.random() * tracks.length);
      setCurrentTrackIndex(nextIndex);
    } else {
      setCurrentTrackIndex(p => (p - 1 + tracks.length) % tracks.length);
    }
  };

  const toggleShuffle = () => setShuffle(!shuffle);
  const toggleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };
  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  return {
    currentTrack,
    currentTrackIndex,
    setCurrentTrackIndex,
    isPlaying,
    setIsPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    volume,
    setVolume,
    seek,
    onTimeUpdate,
    audioRef,
    shuffle,
    repeatMode,
    toggleShuffle,
    toggleRepeat
  };
}

// --- Shared Components (Memoized to prevent flickering) ---

const TrackItem = memo(({ track, isActive, onClick }: { track: Track; isActive: boolean; onClick: () => void }) => (
  <div 
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all active:scale-[0.98] group ${
      isActive ? 'bg-[var(--m3-primary-container)]' : 'hover:bg-[var(--m3-surface-variant)]'
    }`}
  >
    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--m3-secondary-container)] mr-4 shadow-sm shrink-0">
      <img src={track.cover} alt={track.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    </div>
    <div className="flex-1 min-w-0 pr-4">
      <h3 className={`text-[16px] font-bold truncate leading-tight ${isActive ? 'text-[var(--m3-on-primary-container)]' : ''}`}>
        {track.title}
      </h3>
      <p className={`text-[13px] truncate font-medium opacity-60 ${isActive ? 'text-[var(--m3-on-primary-container)]' : ''}`}>
        {track.artist}
      </p>
    </div>
    <div className="text-[10px] font-bold opacity-30 group-hover:opacity-60 transition-opacity">
      {track.format}
    </div>
  </div>
));

const FolderItem = memo(({ 
  node, 
  depth, 
  isExpanded, 
  onToggle, 
  currentTrackId, 
  onTrackSelect,
  renderSubfolders 
}: any) => (
  <div className="w-full">
    {node.name !== 'Root' && (
      <div 
        onClick={() => onToggle(node.path)}
        className="flex items-center py-3 px-4 hover:bg-[var(--m3-surface-variant)]/50 rounded-2xl cursor-pointer transition-colors"
        style={{ paddingLeft: `${depth * 16 + 16}px` }}
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--m3-secondary-container)] flex items-center justify-center mr-3 text-[var(--m3-primary)]">
          {isExpanded ? <ChevronDownIcon size={18} /> : <ChevronRight size={18} />}
        </div>
        <Folder size={20} className="mr-3 text-[var(--m3-on-surface-variant)]" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate uppercase tracking-wider opacity-80">{node.name}</p>
          <p className="text-[10px] opacity-40 font-bold">{node.tracks.length} tracks</p>
        </div>
      </div>
    )}
    <AnimatePresence>
      {isExpanded && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          {renderSubfolders()}
          <div className="space-y-1 py-1">
            {node.tracks.map((track: Track) => (
              <TrackItem 
                key={track.id} 
                track={track} 
                isActive={currentTrackId === track.id} 
                onClick={() => onTrackSelect(track)} 
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));

const RecursiveFolderView = ({ node, depth = 0, expandedFolders, toggleFolder, currentTrackId, onTrackSelect }: any) => {
  return (
    <FolderItem 
      node={node}
      depth={depth}
      isExpanded={node.name === 'Root' || expandedFolders.has(node.path)}
      onToggle={toggleFolder}
      currentTrackId={currentTrackId}
      onTrackSelect={onTrackSelect}
      renderSubfolders={() => (
        Array.from(node.subfolders.values())
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .map((sub: any) => (
            <RecursiveFolderView 
              key={sub.path} 
              node={sub} 
              depth={depth + 1} 
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              currentTrackId={currentTrackId}
              onTrackSelect={onTrackSelect}
            />
          ))
      )}
    />
  );
};

// --- Helper Functions ---

const getArtwork = async (file: File): Promise<string | undefined> => {
  try {
    const metadata = await mm.parseBlob(file);
    const picture = metadata.common.picture?.[0];
    if (picture) {
      return `data:${picture.format};base64,${window.btoa(
        new Uint8Array(picture.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )}`;
    }
  } catch (e) {}
  return undefined;
};

const generateStableId = (file: File, folderPath: string): string => {
  return btoa(`${folderPath}/${file.name}-${file.size}`).substring(0, 16);
};

// --- Sub-components for isolation ---

const ProgressBar = memo(({ current, total, onSeek, formatTime }: any) => (
  <div className="w-full space-y-2 group/progress">
    <input 
      type="range" 
      min="0" 
      max={total || 100} 
      step="0.1" 
      value={current} 
      onChange={onSeek}
      className="w-full h-2 bg-[var(--m3-surface-variant)]/50 rounded-full appearance-none cursor-pointer accent-[var(--m3-primary)] hover:h-2.5 transition-all [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[var(--m3-primary)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
    />
    <div className="flex justify-between text-[9px] font-black opacity-30 tracking-tight">
      <span>{formatTime(current)}</span>
      <span>{formatTime(total)}</span>
    </div>
  </div>
));

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [viewMode, setViewMode] = useState<'tracks' | 'folders'>('tracks');
  const [showPlayer, setShowPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const [sortBy, setSortBy] = useState<'alphabet' | 'latest'>('alphabet');
  
  // Use the playback engine hook
  const sortedTracks = useMemo(() => {
    const result = [...tracks];
    if (sortBy === 'alphabet') {
      return result.sort((a, b) => a.title.localeCompare(b.title));
    }
    return result; // Latest is default order from DB
  }, [tracks, sortBy]);

  const player = useMusicPlayer(sortedTracks);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');

  // --- Check Capacitor Storage Permissions (supports Android 13+ READ_MEDIA_AUDIO & older versions) ---
  const checkPermission = async () => {
    if ((window as any).Capacitor) {
      try {
        const { Filesystem } = (window as any).Capacitor.Plugins || {};
        if (Filesystem) {
          const result = await Filesystem.checkPermissions();
          // Map publicStorage or storage permissions
          if (result.publicStorage === 'granted') {
            setPermissionStatus('granted');
          } else {
            setPermissionStatus('undetermined');
          }
        } else {
          const localPerm = localStorage.getItem('muzic_perm_granted');
          setPermissionStatus(localPerm === 'true' ? 'granted' : 'undetermined');
        }
      } catch (e) {
        console.error("Capacitor check permission error", e);
        setPermissionStatus('granted'); // Graceful fallback
      }
    } else {
      const localPerm = localStorage.getItem('muzic_perm_granted');
      setPermissionStatus(localPerm === 'true' ? 'granted' : 'undetermined');
    }
  };

  const requestPermission = async () => {
    if ((window as any).Capacitor) {
      try {
        const { Filesystem } = (window as any).Capacitor.Plugins || {};
        if (Filesystem) {
          const result = await Filesystem.requestPermissions();
          if (result.publicStorage === 'granted') {
            setPermissionStatus('granted');
          } else {
            setPermissionStatus('denied');
          }
        } else {
          localStorage.setItem('muzic_perm_granted', 'true');
          setPermissionStatus('granted');
        }
      } catch (e) {
        console.error("Capacitor request permission error", e);
        setPermissionStatus('granted');
      }
    } else {
      localStorage.setItem('muzic_perm_granted', 'true');
      setPermissionStatus('granted');
    }
  };

  const handleDenyPermission = () => {
    localStorage.setItem('muzic_perm_granted', 'false');
    setPermissionStatus('denied');
  };

  useEffect(() => {
    checkPermission();
  }, []);

  // --- Media Session & Lockscreen Controls Integration ---
  const callbacksRef = useRef({
    isPlaying: player.isPlaying,
    setIsPlaying: player.setIsPlaying,
    prevTrack: player.prevTrack,
    nextTrack: player.nextTrack,
    seek: player.seek,
    currentTime: player.currentTime,
    duration: player.duration
  });

  // Keep callback values up-to-date
  useEffect(() => {
    callbacksRef.current = {
      isPlaying: player.isPlaying,
      setIsPlaying: player.setIsPlaying,
      prevTrack: player.prevTrack,
      nextTrack: player.nextTrack,
      seek: player.seek,
      currentTime: player.currentTime,
      duration: player.duration
    };
  }, [
    player.isPlaying,
    player.setIsPlaying,
    player.prevTrack,
    player.nextTrack,
    player.seek,
    player.currentTime,
    player.duration
  ]);

  // Set action handlers once on mount
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        callbacksRef.current.setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        callbacksRef.current.setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        callbacksRef.current.prevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        callbacksRef.current.nextTrack();
      });

      // Seek actions for full control accuracy
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          callbacksRef.current.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        callbacksRef.current.seek(Math.max(0, callbacksRef.current.currentTime - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        callbacksRef.current.seek(Math.min(callbacksRef.current.duration, callbacksRef.current.currentTime + offset));
      });
    } catch (e) {
      console.warn("Failed to set advanced MediaSession action handlers:", e);
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      }
    };
  }, []);

  // Sync track metadata & playState
  useEffect(() => {
    const track = player.currentTrack;
    if (!track || !('mediaSession' in navigator)) return;

    try {
      // Set Metadata for notification, lock screen, bluetooth device, Android Auto
      navigator.mediaSession.metadata = new (window as any).MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'Muzic',
        artwork: [
          { src: track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=192&h=192&fit=crop', sizes: '192x192', type: 'image/jpeg' },
          { src: track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=512&h=512&fit=crop', sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    } catch (e) {
      console.error("Setting MediaSession metadata failed:", e);
    }
  }, [player.currentTrack]);

  // Sync playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = player.isPlaying ? 'playing' : 'paused';
  }, [player.isPlaying]);

  // Sync playback progress/position state
  useEffect(() => {
    if (!player.currentTrack || !('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;

    const currentDuration = player.duration;
    const currentPos = player.currentTime;

    if (currentDuration > 0 && currentPos >= 0 && currentPos <= currentDuration) {
      try {
        navigator.mediaSession.setPositionState({
          duration: currentDuration,
          playbackRate: 1,
          position: currentPos
        });
      } catch (e) {
        console.warn("setPositionState failed:", e);
      }
    }
  }, [player.currentTime, player.duration, player.currentTrack]);

  useEffect(() => {
    db.tracks.toArray().then(saved => { 
      if (saved.length > 0) {
        const tracksWithNewUrls = saved.map(track => ({
          ...track,
          url: URL.createObjectURL(track.file)
        }));
        setTracks(tracksWithNewUrls);
      }
    });
    return () => {
      tracks.forEach(t => URL.revokeObjectURL(t.url));
    };
  }, []); 

  const folderTree = useMemo(() => {
    const root: FolderNode = { name: 'Root', path: 'Root', tracks: [], subfolders: new Map(), isExpanded: true };
    sortedTracks.forEach(track => {
      const parts = track.folderPath.split('/').filter(Boolean);
      let current = root;
      let currentPath = 'Root';
      parts.forEach(part => {
        currentPath += `/${part}`;
        if (!current.subfolders.has(part)) {
          current.subfolders.set(part, { 
            name: part, 
            path: currentPath, 
            tracks: [], 
            subfolders: new Map(), 
            isExpanded: expandedFolders.has(currentPath) 
          });
        }
        current = current.subfolders.get(part)!;
      });
      current.tracks.push(track);
    });
    return root;
  }, [sortedTracks, expandedFolders]);

  const selectTrack = (track: Track) => {
    const index = sortedTracks.findIndex(t => t.id === track.id);
    if (index !== -1) {
      player.setCurrentTrackIndex(index);
      player.setIsPlaying(true);
      setShowPlayer(true);
    }
  };

  const handleFolderUpload = async (e: any) => {
    const files = e.target.files;
    if (!files) return;
    setIsScanning(true);
    setScanProgress(0);
    const audioFiles = Array.from(files as FileList).filter(f => f.type.startsWith('audio/'));
    const newTracks: Track[] = [];
    for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i] as any;
        const folderPath = (file.webkitRelativePath || "").split('/').slice(0, -1).join('/') || 'Root';
        try {
            const cover = await getArtwork(file);
            newTracks.push({
                id: generateStableId(file, folderPath),
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Local Artist',
                album: folderPath.split('/').pop() || 'Library',
                duration: 0,
                url: URL.createObjectURL(file),
                file: file, // Store the actual blob
                format: file.type.split('/')[1]?.toUpperCase() || 'MP3',
                cover: cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200',
                folderPath,
                fileName: file.name,
                size: file.size
            });
        } catch (err) {
            console.error("Error processing file", file.name, err);
        }
        setScanProgress(Math.round(((i + 1) / audioFiles.length) * 100));
    }
    
    if (newTracks.length > 0) {
      // Use bulkPut to update existing or add new without clearing
      await db.tracks.bulkPut(newTracks);
      // Refresh local state from DB to show all tracks
      const allSaved = await db.tracks.toArray();
      const tracksWithUrls = allSaved.map(track => ({
        ...track,
        url: track.url.startsWith('blob:') ? track.url : URL.createObjectURL(track.file)
      }));
      setTracks(tracksWithUrls);
      if (viewMode !== 'folders') setViewMode('folders');
    }
    setIsScanning(false);
  };

  const filteredTracks = useMemo(() => 
    sortedTracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase())), 
    [sortedTracks, searchQuery]
  );

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-full bg-[var(--m3-surface)] text-[var(--m3-on-surface)] flex flex-col overflow-hidden font-sans select-none">
      <audio 
        ref={player.audioRef} 
        src={player.currentTrack?.url} 
        onTimeUpdate={player.onTimeUpdate} 
        onEnded={player.nextTrack}
      />

      {/* FIXED HEADER */}
      <header className="px-6 pt-10 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none">Muzic</h1>
            <p className="text-[12px] font-bold opacity-30 uppercase tracking-widest mt-1">Local Library</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSortBy(p => p === 'alphabet' ? 'latest' : 'alphabet')} 
              className={`p-3 bg-[var(--m3-surface-variant)] rounded-xl transition-all flex items-center gap-2 group`}
              title={sortBy === 'alphabet' ? 'Sort: Alphabetical' : 'Sort: Latest'}
            >
              {sortBy === 'alphabet' ? <LayoutGrid size={20} className="group-active:scale-90" /> : <Clock size={20} className="group-active:scale-90" />}
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
                {sortBy === 'alphabet' ? 'A-Z' : 'Recent'}
              </span>
            </button>
            <button onClick={() => folderInputRef.current?.click()} className="p-3 bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] rounded-xl hover:scale-105 active:scale-95 transition-all outline-none">
              <FolderPlus size={20} />
            </button>
          </div>
        </div>

        {/* TABS (FIXED) */}
        <div className="space-y-4">
          <div className="flex p-1 bg-[var(--m3-surface-variant)]/30 rounded-2xl w-full">
            {(['tracks', 'folders'] as const).map(mode => (
              <button 
                key={mode}
                onClick={() => setViewMode(mode)} 
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  viewMode === mode 
                  ? 'bg-[var(--m3-primary)] text-white shadow-lg shadow-[var(--m3-primary)]/20' 
                  : 'opacity-40 hover:opacity-100'
                }`}
              >
                {mode === 'tracks' ? 'Songs' : 'Folders'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* SCROLLABLE CONTENT */}
      <main className="flex-1 overflow-y-auto px-6 pb-40">
        <section className="space-y-1">
          {permissionStatus === 'denied' && (
            <div 
              onClick={requestPermission}
              className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/15 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                  <Music size={16} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Storage Permission Denied</p>
                  <p className="text-[11px] font-bold opacity-60 mt-0.5">Click here to retry permissions so Muzic can index your files.</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-amber-500/60 group-hover:translate-x-1 transition-transform" />
            </div>
          )}

          {viewMode === 'tracks' ? (
            filteredTracks.length > 0 ? (
              filteredTracks.map(track => (
                <TrackItem 
                  key={track.id} 
                  track={track} 
                  isActive={player.currentTrack?.id === track.id} 
                  onClick={() => selectTrack(track)} 
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <Music size={48} />
                <p className="mt-4 font-bold text-sm tracking-widest uppercase">No tracks found</p>
              </div>
            )
          ) : viewMode === 'folders' ? (
            <RecursiveFolderView 
              node={folderTree} 
              expandedFolders={expandedFolders} 
              toggleFolder={(path: string) => setExpandedFolders(p => { 
                const n = new Set(p); 
                if (n.has(path)) n.delete(path); 
                else n.add(path); 
                return n; 
              })}
              currentTrackId={player.currentTrack?.id}
              onTrackSelect={selectTrack}
            />
          ) : null}
        </section>
      </main>

      <input type="file" multiple accept="audio/*" ref={fileInputRef} onChange={async (e: any) => {
          const files = e.target.files;
          if (!files) return;
          const filesArray = Array.from(files as FileList);
          for (const file of filesArray) {
            const f = file as any;
            const cover = await getArtwork(f);
            const folderPath = 'Imports';
            const track: Track = { 
                id: generateStableId(f, folderPath), 
                title: f.name, 
                artist: 'Imported', 
                album: 'Imports', 
                duration: 0, 
                url: URL.createObjectURL(f), 
                file: f, 
                format: 'MP3', 
                cover: cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200', 
                folderPath, 
                fileName: f.name, 
                size: f.size 
            };
            setTracks(p => [...p, track]);
            await db.tracks.put(track);
          }
      }} className="hidden" />
      
      <input type="file" // @ts-ignore
        webkitdirectory="" directory="" multiple ref={folderInputRef} onChange={handleFolderUpload} className="hidden" />

      {/* Mini Player */}
      <AnimatePresence>
        {!showPlayer && player.currentTrack && (
          <motion.footer 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            onClick={() => setShowPlayer(true)}
            className="fixed bottom-6 left-6 right-6 bg-[var(--m3-primary-container)] rounded-[24px] shadow-2xl flex flex-col cursor-pointer z-10 border border-white/20 backdrop-blur-xl overflow-hidden"
          >
            <div className="flex items-center px-4 pt-3 pb-2">
              <div className="w-12 h-12 rounded-xl overflow-hidden mr-3 shadow-lg shrink-0">
                <img src={player.currentTrack.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0 mr-4">
                <h4 className="font-black truncate text-sm leading-tight">{player.currentTrack.title}</h4>
                <p className="text-[11px] opacity-40 truncate font-bold uppercase tracking-tight">{player.currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); player.togglePlay(); }}
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center p-0"
                >
                  {player.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>
              </div>
            </div>
            
            <div className="px-5 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black opacity-30 w-8">{formatTime(player.currentTime)}</span>
                <div className="flex-1 relative flex items-center group/mini-seeker">
                  <input 
                    type="range" 
                    min="0" 
                    max={player.duration || 100} 
                    step="0.1" 
                    value={player.currentTime} 
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); player.seek(parseFloat(e.target.value)); }}
                    className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-[var(--m3-primary)] hover:h-1.5 transition-all"
                  />
                </div>
                <span className="text-[9px] font-black opacity-30 w-8 text-right">{formatTime(player.duration)}</span>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Full Player Overlay */}
      <AnimatePresence>
        {showPlayer && player.currentTrack && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 35, stiffness: 250, mass: 0.8 }}
            className="fixed inset-0 bg-[var(--m3-surface)] z-50 flex flex-col px-8 pb-10 overflow-hidden select-none"
          >
            {/* Drag Handle */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/20 rounded-full shrink-0 z-20" />

            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--m3-primary-container)]/30 to-transparent blur-[120px] scale-125 opacity-40" />
            
            <header className="flex items-center justify-between mt-12 mb-6 shrink-0">
              <button onClick={() => setShowPlayer(false)} className="p-2 -ml-2 rounded-full hover:bg-black/5 active:scale-90 transition-all">
                <ChevronDown size={22} strokeWidth={3} />
              </button>
              <div className="text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30 mb-0.5">Focus Mode</p>
                <p className="font-black text-xs truncate max-w-[160px] opacity-80">{player.currentTrack.album}</p>
              </div>
              <div className="w-8" /> {/* Spacer */}
            </header>

            <div className="flex-1 flex flex-col items-center justify-center space-y-6 max-w-[280px] mx-auto w-full">
              {/* Rotating Vinyl Disc */}
              <div className="relative w-full aspect-square group">
                <motion.div 
                  animate={{ rotate: player.isPlaying ? 360 : 0 }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "linear",
                    repeatType: "loop"
                  }}
                  className="w-full h-full rounded-full overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] ring-8 ring-black/5 relative"
                >
                  <img src={player.currentTrack.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {/* Vinyl Texture Overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.1)_70%,rgba(0,0,0,0.3)_100%)] pointer-events-none" />
                  <div className="absolute inset-0 border-[30px] border-black/5 rounded-full pointer-events-none" />
                  {/* Center Hole */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--m3-surface)] rounded-full shadow-inner ring-4 ring-black/20" />
                </motion.div>
                
                {/* Tone Arm Decoration (Static) */}
                <div 
                  className={`absolute -top-4 -right-4 w-24 h-40 pointer-events-none transition-transform duration-700 origin-top-right ${player.isPlaying ? 'rotate-[-5deg]' : 'rotate-[-25deg]'}`}
                  style={{ opacity: 0.1 }}
                >
                  <div className="w-1.5 h-full bg-black rounded-full ml-auto mr-4" />
                </div>
              </div>

              <div className="w-full text-center space-y-0.5 pt-2">
                <h2 className="text-xl font-black tracking-tight leading-tight px-2 line-clamp-1">{player.currentTrack.title}</h2>
                <p className="text-base text-[var(--m3-on-surface-variant)] font-bold opacity-30">{player.currentTrack.artist}</p>
              </div>

              <div className="w-full space-y-6">
                <div className="flex items-center justify-between w-full px-2">
                  <button 
                    onClick={player.toggleShuffle}
                    className={`p-2 transition-all ${player.shuffle ? 'text-[var(--m3-primary)] opacity-100 scale-110' : 'opacity-30 hover:opacity-100'}`}
                  >
                    <Shuffle size={20} strokeWidth={3} />
                  </button>
                  
                  <div className="flex items-center gap-5">
                    <button onClick={player.prevTrack} className="p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all text-current">
                      <SkipBack size={22} fill="currentColor" />
                    </button>
                    <button 
                      onClick={player.togglePlay}
                      className="w-14 h-14 bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                    >
                      {player.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button onClick={player.nextTrack} className="p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all text-current">
                      <SkipForward size={22} fill="currentColor" />
                    </button>
                  </div>

                  <button 
                    onClick={player.toggleRepeat}
                    className={`p-2 transition-all ${player.repeatMode !== 'off' ? 'text-[var(--m3-primary)] opacity-100 scale-110' : 'opacity-30 hover:opacity-100'}`}
                  >
                    {player.repeatMode === 'one' ? <Repeat1 size={20} strokeWidth={3} /> : <Repeat size={20} strokeWidth={3} />}
                  </button>
                </div>

                <div className="px-2">
                  <ProgressBar 
                    current={player.currentTime} 
                    total={player.duration} 
                    onSeek={(e: any) => player.seek(parseFloat(e.target.value))}
                    formatTime={formatTime}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Scanning UI - Non-blocking Toast */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed bottom-24 right-6 z-[100] w-64 bg-[var(--m3-surface)] p-5 rounded-3xl shadow-2xl border border-white/10"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[var(--m3-primary-container)] flex items-center justify-center">
                <Loader2 className="animate-spin text-[var(--m3-primary)]" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[11px] font-black uppercase tracking-widest opacity-40">Syncing</h3>
                <p className="text-[13px] font-bold truncate">Updating Library...</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[var(--m3-primary)]" 
                  animate={{ width: `${scanProgress}%` }} 
                  transition={{ duration: 0.3 }} 
                />
              </div>
              <div className="flex justify-between text-[8px] font-black opacity-30">
                <span>INDEXING FILES</span>
                <span>{scanProgress}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Request Modal Overlay (Material 3 standard) */}
      <AnimatePresence>
        {permissionStatus === 'undetermined' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-sm bg-[var(--m3-surface)] p-8 rounded-[36px] shadow-2xl border border-white/10 space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--m3-primary-container)] flex items-center justify-center text-[var(--m3-primary)] shadow-md">
                  <Music size={28} strokeWidth={2.5} />
                </div>
                <div className="space-y-2 text-left">
                  <h2 className="text-xl font-black tracking-tight leading-snug text-[var(--m3-on-surface)]">
                    Access Media Files?
                  </h2>
                  <p className="text-sm font-semibold opacity-60 leading-relaxed text-[var(--m3-on-surface-variant)]">
                    Muzic needs storage permission to scan the folders on your device and populate your offline music library seamlessly.
                  </p>
                  <p className="text-xs font-semibold opacity-50 leading-relaxed bg-black/5 p-3 rounded-xl border border-white/5 text-[var(--m3-on-surface-variant)]">
                    💡 This app processes your files locally, respects your privacy, and never uploads any data.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={requestPermission}
                  className="w-full py-3.5 bg-[var(--m3-primary)] text-white hover:bg-[var(--m3-primary)]/95 active:scale-[0.98] transition-all rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--m3-primary)]/25 cursor-pointer"
                >
                  Grant Permissions
                </button>
                <button 
                  onClick={handleDenyPermission}
                  className="w-full py-3 opacity-40 hover:opacity-100 active:scale-[0.98] transition-all rounded-2xl font-bold text-xs uppercase tracking-widest text-[var(--m3-on-surface)] cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
