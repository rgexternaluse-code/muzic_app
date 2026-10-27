/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo, useCallback, ChangeEvent, memo, ReactNode } from 'react';
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
  Clock,
  Search,
  Globe,
  Heart,
  ListMusic,
  Settings as SettingsIcon,
  Trash2,
  Plus,
  Moon,
  Sun,
  AudioLines,
  MoreVertical,
  Volume2,
  ArrowLeft,
  SlidersHorizontal,
  ExternalLink,
  Laptop,
  X,
  Lock,
  Activity,
  ShieldCheck,
  Smartphone,
  Mic,
  Crown,
  HardDrive,
  Radio,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { scanDeviceAudioFiles } from './services/nativeAudioScanner';
import { Track, FolderNode } from './types';
import { db } from './db';
import * as mm from 'music-metadata-browser';
import appLogo from './assets/images/muzic_app_logo_1786456453207.jpg';
import { TrackContextMenu } from './components/TrackContextMenu';
import { PlaylistsView } from './components/PlaylistsView';
import { SettingsView } from './components/SettingsView';
import { SingingStudioView } from './components/SingingStudioView';
import { TrackThumbnail } from './components/TrackThumbnail';
import { EqualizerModal, EQ_PRESETS, EqPresetKey, FREQ_BANDS } from './components/EqualizerModal';
import { 
  setupSystemMediaActionListener, 
  syncTrackToSystemMedia, 
  syncPlaybackStateToSystemMedia, 
  stopSystemMedia,
  requestNotificationPermissionIfNeeded
} from './services/systemMediaPlayer';
import { TUM_HI_HO_LYRICS, LUTT_LE_GAYA_LYRICS } from './data/instrumentals';

export const TUM_HI_HO_ONLINE_TRACK: Track = {
  id: 'online_tum_hi_ho',
  title: 'Tum Hi Ho (Learn & Sing Along)',
  artist: 'Arijit Singh / Mithoon (Aashiqui 2)',
  album: 'Aashiqui 2 Karaoke & Studio Demo',
  duration: 262,
  url: '/assets/aistudio/TUM_HI_HO_-_Aashiqui_2_Karaoke_with_Lyrics_AlgoRhythm_Studio_17e2284d.mp3',
  cover: appLogo,
  format: 'KARAOKE',
  fileName: 'Tum_Hi_Ho_Aashiqui_2.mp3',
  size: 6300000,
  lyrics: TUM_HI_HO_LYRICS
};

export const LUTT_LE_GAYA_ONLINE_TRACK: Track = {
  id: 'online_lutt_le_gaya',
  title: 'Lutt Le Gaya (Dhurandhar Karaoke)',
  artist: 'Simran Choudhary • Shashwat Sachdev',
  album: 'Dhurandhar Movie Soundtrack',
  duration: 255,
  url: '/assets/aistudio/Lutt_Le_Gaya_Dhurandhar_320_Kbps_0ceffc43.mp3',
  cover: appLogo,
  format: 'KARAOKE',
  fileName: 'Lutt_Le_Gaya_Dhurandhar.mp3',
  size: 7800000,
  lyrics: LUTT_LE_GAYA_LYRICS
};

// --- Lightweight JSONP Client to bypass CORS on the client side ---
function fetchJSONP(url: string, callbackParam: string = 'callback'): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_cb_${Math.round(100000 * Math.random())}`;
    
    // Assign global callback
    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const cleanup = () => {
      delete (window as any)[callbackName];
      const script = document.getElementById(callbackName);
      if (script) {
        document.body.removeChild(script);
      }
    };

    // Construct final JSONP URL
    const hasQuery = url.indexOf('?') !== -1;
    const separator = hasQuery ? '&' : '?';
    const finalUrl = `${url}${separator}${callbackParam}=${callbackName}`;

    // Create script tag
    const script = document.createElement('script');
    script.id = callbackName;
    script.src = finalUrl;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error(`JSONP request loading failed for: ${url}`));
    };

    document.body.appendChild(script);
  });
}

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
      syncPlaybackStateToSystemMedia(isPlaying, time, duration, true);
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

const SoundWaveIndicator = ({ isPlaying = true }: { isPlaying?: boolean }) => (
  <div className="flex items-end gap-[3px] h-3.5 w-4 shrink-0 mx-1.5 pb-[1px]">
    {[...Array(4)].map((_, i) => (
      <motion.span
        key={i}
        className="w-[2.5px] rounded-full shadow-[0_0_6px_#6355FE]"
        animate={isPlaying ? {
          height: ["25%", "100%", "25%"]
        } : {
          height: "35%"
        }}
        transition={isPlaying ? {
          duration: 0.45 + i * 0.1,
          repeat: Infinity,
          ease: "easeInOut",
          repeatType: "reverse"
        } : {}}
        style={{
          transformOrigin: "bottom",
          backgroundColor: "#8E7CFF"
        }}
      />
    ))}
  </div>
);

const TrackItem = memo(({ 
  track, 
  isActive, 
  isPlaying, 
  isFavorite,
  isDark = true,
  onClick, 
  onToggleFavorite, 
  onOpenMenu 
}: { 
  track: Track; 
  isActive: boolean; 
  isPlaying?: boolean; 
  isFavorite?: boolean;
  isDark?: boolean;
  onClick: () => void;
  onToggleFavorite?: () => void;
  onOpenMenu?: () => void;
}) => (
  <motion.div 
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    whileHover={{ scale: 1.012, transition: { duration: 0.15 } }}
    whileTap={{ scale: 0.985 }}
    className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all duration-300 group border ${
      isActive 
        ? isDark
          ? 'bg-[#6355FE]/20 border-[#6355FE]/40 shadow-xl shadow-[#6355FE]/10' 
          : 'bg-[#6355FE]/15 border-[#6355FE]/40 shadow-xl shadow-[#6355FE]/10'
        : isDark
          ? 'bg-[#14122B]/40 hover:bg-[#1B183A]/80 border-white/5 hover:border-white/10'
          : 'bg-white hover:bg-[#F4F1FD] border-[#6355FE]/12 hover:border-[#6355FE]/25 shadow-sm shadow-[#120F26]/5'
    }`}
  >
    {/* Cover Art Image */}
    <div className={`w-12 h-12 rounded-xl overflow-hidden mr-3.5 shadow-md shrink-0 relative border transition-all ${
      isDark ? 'border-white/10 group-hover:shadow-lg' : 'border-[#6355FE]/12 group-hover:shadow-lg'
    }`}>
      <TrackThumbnail
        cover={track.cover}
        title={track.title}
        artist={track.artist}
        alt={track.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      {isActive && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-[2px]">
          {isPlaying && <div className="w-3 h-3 bg-[#6355FE] rounded-full animate-ping shadow-[0_0_8px_#6355FE]" />}
        </div>
      )}
    </div>

    {/* Metadata Text Box */}
    <div className="flex-1 min-w-0 pr-2">
      <h3 className={`text-[13.5px] font-black truncate leading-tight transition-colors duration-200 ${
        isActive 
          ? isDark ? 'text-white font-black' : 'text-[#6355FE] font-black'
          : isDark ? 'text-slate-100 group-hover:text-white' : 'text-[#120F26] group-hover:text-[#6355FE]'
      }`}>
        {track.title}
      </h3>
      <p className={`text-[11px] truncate font-bold mt-1 transition-colors duration-200 ${
        isActive 
          ? isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'
          : isDark ? 'text-[#8F8E9C]' : 'text-[#585474]'
      }`}>
        {track.artist}
      </p>
    </div>

    {/* Action buttons and format capsules */}
    <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
      {isActive && <SoundWaveIndicator isPlaying={isPlaying} />}
      
      {/* Format Badge (e.g., MP3 or Stream) */}
      <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md transition-colors ${
        isDark 
          ? 'bg-white/5 border border-white/5 text-[#8F8E9C] group-hover:text-white'
          : 'bg-[#6355FE]/8 border border-[#6355FE]/15 text-[#5B4AE6] group-hover:text-[#6355FE]'
      }`}>
        {track.format || 'MP3'}
      </span>

      {/* Quick Favorite Heart Button */}
      {onToggleFavorite && (
        <motion.button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          whileTap={{ scale: 0.8 }}
          type="button"
          className={`p-1.5 rounded-full transition-all cursor-pointer ${
            isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
          } ${
            isFavorite 
              ? 'text-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.3)]' 
              : isDark ? 'text-[#8F8E9C]/40 hover:text-pink-400' : 'text-[#7A7596] hover:text-pink-500'
          }`}
        >
          <Heart size={15} fill={isFavorite ? "currentColor" : "none"} />
        </motion.button>
      )}

      {/* Action Popover Context Trigger button */}
      {onOpenMenu && (
        <motion.button
          onClick={(e) => { e.stopPropagation(); onOpenMenu(); }}
          whileTap={{ scale: 0.85 }}
          type="button"
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            isDark 
              ? 'text-[#8F8E9C]/60 hover:text-white hover:bg-white/10' 
              : 'text-[#7A7596] hover:text-[#120F26] hover:bg-black/5'
          }`}
        >
          <MoreVertical size={16} />
        </motion.button>
      )}
    </div>
  </motion.div>
));

const FolderItem = memo(({ 
  node, 
  depth, 
  isExpanded, 
  isDark = true,
  onToggle, 
  currentTrackId, 
  isPlaying,
  favoriteTrackIds,
  onToggleFavorite,
  onOpenMenu,
  onTrackSelect, 
  renderSubfolders 
}: any) => (
  <div className="w-full">
    {node.name !== 'Root' && (
      <motion.div 
        onClick={() => onToggle(node.path)}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center py-3 px-4 rounded-2xl cursor-pointer transition-colors ${
          isDark ? 'hover:bg-[var(--m3-surface-variant)]/50' : 'hover:bg-[#EFEAFE]'
        }`}
        style={{ paddingLeft: `${depth * 16 + 16}px` }}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
          isDark ? 'bg-[var(--m3-secondary-container)] text-[var(--m3-primary)]' : 'bg-[#EFEAFE] text-[#6355FE]'
        }`}>
          {isExpanded ? <ChevronDownIcon size={18} /> : <ChevronRight size={18} />}
        </div>
        <Folder size={20} className={`mr-3 ${isDark ? 'text-[var(--m3-on-surface-variant)]' : 'text-[#585474]'}`} />
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm truncate uppercase tracking-wider ${isDark ? 'text-white opacity-80' : 'text-[#120F26]'}`}>{node.name}</p>
          <p className={`text-[10px] font-bold ${isDark ? 'opacity-40 text-white' : 'text-[#585474]'}`}>{node.tracks.length} tracks</p>
        </div>
      </motion.div>
    )}
    <AnimatePresence>
      {isExpanded && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1, transition: { type: "spring", damping: 30, stiffness: 350 } }}
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
                isPlaying={currentTrackId === track.id && isPlaying}
                isFavorite={favoriteTrackIds?.includes(track.id)}
                isDark={isDark}
                onToggleFavorite={() => onToggleFavorite?.(track.id)}
                onOpenMenu={() => onOpenMenu?.(track)}
                onClick={() => onTrackSelect(track)} 
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));

const RecursiveFolderView = ({ 
  node, 
  depth = 0, 
  expandedFolders, 
  isDark = true,
  toggleFolder, 
  currentTrackId, 
  isPlaying, 
  favoriteTrackIds, 
  onToggleFavorite,
  onOpenMenu,
  onTrackSelect 
}: any) => {
  return (
    <FolderItem 
      node={node}
      depth={depth}
      isExpanded={node.name === 'Root' || expandedFolders.has(node.path)}
      isDark={isDark}
      onToggle={toggleFolder}
      currentTrackId={currentTrackId}
      isPlaying={isPlaying}
      favoriteTrackIds={favoriteTrackIds}
      onToggleFavorite={onToggleFavorite}
      onOpenMenu={onOpenMenu}
      onTrackSelect={onTrackSelect}
      renderSubfolders={() => (
        Array.from(node.subfolders.values())
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .map((sub: any) => (
            <RecursiveFolderView 
              key={sub.path} 
              node={sub} 
              depth={depth + 1} 
              isDark={isDark}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              favoriteTrackIds={favoriteTrackIds}
              onToggleFavorite={onToggleFavorite}
              onOpenMenu={onOpenMenu}
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

const ProgressBar = memo(({ current, total, onSeek, formatTime, isDark = true }: any) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="w-full space-y-2 group/progress select-none">
      <div className="relative w-full h-2 flex items-center group">
        {/* Progress track background */}
        <div className={`absolute left-0 right-0 h-1.5 rounded-full overflow-hidden transition-all duration-200 group-hover:h-2 ${
          isDark ? 'bg-white/10' : 'bg-[#6355FE]/15'
        }`}>
          {/* Dynamic background progress fill */}
          <motion.div 
            className="h-full bg-[var(--m3-primary)] rounded-full mr-auto"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Invisible input range covering the track for perfect mouse clicking & dragging */}
        <input 
          type="range" 
          min="0" 
          max={total || 100} 
          step="0.1" 
          value={current} 
          onChange={onSeek}
          className="absolute z-10 w-full h-4 opacity-0 cursor-pointer appearance-none"
        />
        
        {/* Micro-designed Custom Thumb that scales up on hover */}
        <motion.div
          className="absolute w-3.5 h-3.5 bg-[var(--m3-primary)] rounded-full border-2 border-white shadow-lg pointer-events-none -ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ left: `${percentage}%` }}
          animate={{
            scale: percentage >= 0 ? 1 : 0.8
          }}
          whileHover={{ scale: 1.25 }}
        />
      </div>
      <div className={`flex justify-between text-[10px] font-black tracking-wider ${
        isDark ? 'text-white/40' : 'text-[#585474]'
      }`}>
        <span>{formatTime(current)}</span>
        <span>{formatTime(total)}</span>
      </div>
    </div>
  );
});

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  
  // --- BOTTOM NAV CHANNELS ---
  const [activeNavTab, setActiveNavTab] = useState<'library' | 'studio' | 'playlists' | 'favorites' | 'settings'>('library');
  
  // --- FAVORITES SAVER (CLIENT DB) ---
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('muzic_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (trackId: string) => {
    setFavoriteTrackIds(prev => {
      const isFav = prev.includes(trackId);
      const next = isFav ? prev.filter(id => id !== trackId) : [...prev, trackId];
      localStorage.setItem('muzic_favorites', JSON.stringify(next));
      return next;
    });
  };

  // --- PLAYLIST ENGINE ---
  const [playlists, setPlaylists] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('muzic_playlists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [playlistNameInput, setPlaylistNameInput] = useState('');

  const createPlaylist = (name: string) => {
    if (!name.trim()) return;
    const newPl = {
      id: `pl_${Date.now()}`,
      name: name.trim(),
      trackIds: [],
      createdAt: Date.now()
    };
    const next = [...playlists, newPl];
    setPlaylists(next);
    localStorage.setItem('muzic_playlists', JSON.stringify(next));
    setPlaylistNameInput('');
  };

  const deletePlaylist = (id: string) => {
    const next = playlists.filter(p => p.id !== id);
    setPlaylists(next);
    localStorage.setItem('muzic_playlists', JSON.stringify(next));
    if (activePlaylistId === id) setActivePlaylistId(null);
  };

  const addTrackToPlaylist = (playlistId: string, trackId: string) => {
    const next = playlists.map(pl => {
      if (pl.id === playlistId) {
        if (pl.trackIds.includes(trackId)) return pl;
        return { ...pl, trackIds: [...pl.trackIds, trackId] };
      }
      return pl;
    });
    setPlaylists(next);
    localStorage.setItem('muzic_playlists', JSON.stringify(next));
    setSelectedTrackForMenu(null);
  };

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    const next = playlists.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, trackIds: pl.trackIds.filter((id: string) => id !== trackId) };
      }
      return pl;
    });
    setPlaylists(next);
    localStorage.setItem('muzic_playlists', JSON.stringify(next));
  };

  // --- TRACK OPTIONS CONTEXT ---
  const [selectedTrackForMenu, setSelectedTrackForMenu] = useState<Track | null>(null);

  // --- PREMIUM SLEEP TIMER CONFIG (2.5s configuration window to increment duration) ---
  const SLEEP_PRESETS = [15, 30, 45, 60] as const;
  const [sleepTimerTime, setSleepTimerTime] = useState<number | null>(null); // Remaining seconds
  const timerIntervalRef = useRef<any>(null);
  const timerDelayTimeoutRef = useRef<any>(null);
  const lastSleepTimerClickRef = useRef<number>(0);
  const currentSleepPresetIndexRef = useRef<number>(-1);

  // --- PREMIUM EQUALIZER PRESETS & MODAL STATE ---
  const [currentEqPreset, setCurrentEqPreset] = useState<EqPresetKey>('bass-boost');
  const [customBands, setCustomBands] = useState<[number, number, number, number, number]>(() => [...EQ_PRESETS['bass-boost'].bands]);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);

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

  const [playbackQueue, setPlaybackQueue] = useState<Track[]>([]);
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('local');

  // Enhanced Toast Notification System (supports subtitle & high visibility)
  const [toast, setToast] = useState<{ id: number; message: string; icon?: React.ReactNode; subtitle?: string } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, icon?: React.ReactNode, subtitle?: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ id: Date.now(), message, icon, subtitle });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2500);
  }, []);

  // Theme Management (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('muzic_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    localStorage.setItem('muzic_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light', 'light');
      document.documentElement.classList.remove('theme-dark', 'dark');
    } else {
      document.documentElement.classList.add('theme-dark', 'dark');
      document.documentElement.classList.remove('theme-light', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast(
        next === 'dark' ? 'Dark theme enabled' : 'Light theme enabled',
        next === 'dark' ? <Moon size={16} className="text-[#8E7CFF]" /> : <Sun size={16} className="text-amber-400" />
      );
      return next;
    });
  };

  const handleToggleSort = () => {
    setSortBy(prev => {
      const next = prev === 'alphabet' ? 'latest' : 'alphabet';
      showToast(
        next === 'alphabet' ? 'Sorted alphabetically (A-Z)' : 'Sorted by recently added',
        next === 'alphabet' ? <LayoutGrid size={16} className="text-[#8E7CFF]" /> : <Clock size={16} className="text-[#8E7CFF]" />
      );
      return next;
    });
  };

  const handleImportMusicFolder = () => {
    showToast('Opening music folder picker...', <FolderPlus size={16} className="text-[#8E7CFF]" />);
    triggerDirectoryPicker();
  };
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [onlineTracks, setOnlineTracks] = useState<Track[]>([TUM_HI_HO_ONLINE_TRACK]);
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineEngine, setOnlineEngine] = useState<'itunes' | 'audius'>('itunes');

  // --- COMPREHENSIVE BACK NAVIGATION & SWIPE-TO-BACK SYSTEM ---
  const lastBackPressRef = useRef<number>(0);
  const lastActionTimeRef = useRef<number>(0);
  const navStateRef = useRef({
    isEqualizerOpen,
    selectedTrackForMenu,
    showPlayer,
    activePlaylistId,
    activeNavTab,
    searchQuery,
    onlineSearchQuery,
    activeTab,
  });

  // Keep navigation state snapshot fresh for async & event callbacks
  useEffect(() => {
    navStateRef.current = {
      isEqualizerOpen,
      selectedTrackForMenu,
      showPlayer,
      activePlaylistId,
      activeNavTab,
      searchQuery,
      onlineSearchQuery,
      activeTab,
    };
  }, [
    isEqualizerOpen,
    selectedTrackForMenu,
    showPlayer,
    activePlaylistId,
    activeNavTab,
    searchQuery,
    onlineSearchQuery,
    activeTab,
  ]);

  const handleBackNavigation = useCallback(() => {
    const now = Date.now();
    // Guard against instant duplicate event triggers (< 150ms)
    if (now - lastActionTimeRef.current < 150) return;
    lastActionTimeRef.current = now;

    const state = navStateRef.current;

    // 1. If Audio Equalizer Modal is open, close it
    if (state.isEqualizerOpen) {
      setIsEqualizerOpen(false);
      return;
    }

    // 2. If Track Options Bottom Sheet is open, dismiss it
    if (state.selectedTrackForMenu) {
      setSelectedTrackForMenu(null);
      return;
    }

    // 3. If Now Playing full-screen player is open, dismiss back to library
    if (state.showPlayer) {
      setShowPlayer(false);
      return;
    }

    // 4. If an individual playlist is open inside Playlists tab, go back to Playlists list
    if (state.activePlaylistId) {
      setActivePlaylistId(null);
      return;
    }

    // 5. If on any tab other than Library (Playlists, Favorites, Settings), return to Library
    if (state.activeNavTab !== 'library') {
      setActiveNavTab('library');
      return;
    }

    // 6. If inside Library and search query is entered, clear search
    if (state.searchQuery && state.searchQuery.trim() !== '') {
      setSearchQuery('');
      return;
    }

    // 7. If inside Library on the Online tab, reset search and switch back to Local library
    if (state.activeTab === 'online') {
      if (state.onlineSearchQuery && state.onlineSearchQuery.trim() !== '') {
        setOnlineSearchQuery('');
      }
      setActiveTab('local');
      return;
    }

    // 8. User is already on Library (main screen)! Handle double-press / double-swipe to exit
    const timeSinceLast = now - lastBackPressRef.current;
    if (timeSinceLast < 2000 && timeSinceLast > 200) {
      // Second back action within 2 seconds: Exit app!
      if (Capacitor.isNativePlatform()) {
        try {
          CapApp.exitApp();
        } catch (e) {
          console.warn("CapApp.exitApp error:", e);
        }
      } else {
        showToast("Exiting application...", <Smartphone size={16} className="text-[#8E7CFF]" />);
        try {
          window.close();
        } catch {
          // Ignore
        }
      }
    } else {
      // First back action: Update timestamp and display notification
      lastBackPressRef.current = now;
      showToast(
        "Press again to exit",
        <Smartphone size={16} className="text-[#8E7CFF]" />,
        "Do it again to exit"
      );
    }
  }, [showToast]);

  // Capacitor Android Hardware / Gesture Back Button Interceptor
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    try {
      const listenerPromise = CapApp.addListener('backButton', () => {
        handleBackNavigation();
      });
      listenerPromise.then(handle => {
        if (handle && typeof handle.remove === 'function') {
          removeListener = () => handle.remove();
        }
      }).catch(err => {
        console.warn("CapApp.addListener('backButton') initialization error:", err);
      });
    } catch (e) {
      console.warn("CapApp backButton registration failed:", e);
    }

    return () => {
      if (removeListener) removeListener();
    };
  }, [handleBackNavigation]);

  // Web Browser History / popstate Interceptor
  useEffect(() => {
    try {
      window.history.replaceState({ app: 'muzic_root' }, '');
      window.history.pushState({ app: 'muzic_ready' }, '');
    } catch {
      // Ignore
    }

    const handlePopState = () => {
      handleBackNavigation();
      try {
        window.history.pushState({ app: 'muzic_ready' }, '');
      } catch {
        // Ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleBackNavigation]);

  // Horizontal Swipe Left / Right to Back Gesture Handler
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isIgnoredTarget = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (!e.touches || e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();

      // Check whether touch began on interactive elements (e.g., seeker range sliders or text inputs)
      const target = e.target as HTMLElement | null;
      if (target) {
        const isRange = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range';
        const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        const isClassIgnored = target.closest('.no-back-swipe') !== null;
        isIgnoredTarget = isRange || (isTextInput && (target as HTMLInputElement).type !== 'range') || isClassIgnored;
      } else {
        isIgnoredTarget = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isIgnoredTarget) return;
      if (!e.changedTouches || e.changedTouches.length !== 1) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const duration = Date.now() - touchStartTime;

      // Swift swipe gesture duration (< 650ms)
      if (duration > 650) return;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Must be predominantly horizontal gesture (not vertical scrolling)
      if (absDeltaX < 45 || absDeltaX < absDeltaY * 1.4) return;

      const screenWidth = window.innerWidth || document.documentElement.clientWidth;
      const isLeftEdge = touchStartX <= 65;
      const isRightEdge = touchStartX >= screenWidth - 65;

      const state = navStateRef.current;
      const isAlreadyOnMainLibrary = 
        !state.isEqualizerOpen && 
        !state.selectedTrackForMenu && 
        !state.showPlayer && 
        !state.activePlaylistId && 
        state.activeNavTab === 'library' && 
        (!state.searchQuery || state.searchQuery.trim() === '') && 
        state.activeTab === 'local';

      // Edge swipes: Left edge swiping right inward OR right edge swiping left inward
      const isLeftEdgeSwipeInward = isLeftEdge && deltaX > 35;
      const isRightEdgeSwipeInward = isRightEdge && deltaX < -35;

      // On any subscreen / player / modal, any clear horizontal swipe (left or right) takes back to library
      const isSubscreenHorizontalSwipe = !isAlreadyOnMainLibrary && absDeltaX > 70;

      if (isLeftEdgeSwipeInward || isRightEdgeSwipeInward || isSubscreenHorizontalSwipe) {
        handleBackNavigation();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleBackNavigation]);

  // Sync playbackQueue with local sortedTracks initially when first loaded
  useEffect(() => {
    if (sortedTracks.length > 0 && playbackQueue.length === 0) {
      setPlaybackQueue(sortedTracks);
    }
  }, [sortedTracks]);

  const currentQueue = useMemo(() => {
    return playbackQueue.length > 0 ? playbackQueue : (sortedTracks.length > 0 ? sortedTracks : onlineTracks);
  }, [playbackQueue, sortedTracks, onlineTracks]);

  const player = useMusicPlayer(currentQueue);

  // Fetch online tracks from iTunes Search API via JSONP or Audius API
  const fetchOnlineTracks = async (queryVal?: string, forcedEngine?: 'itunes' | 'audius') => {
    setIsOnlineLoading(true);
    setOnlineError(null);
    const engine = forcedEngine || onlineEngine;
    try {
      const q = queryVal !== undefined ? queryVal : onlineSearchQuery;
      let term = q && q.trim() !== "" ? q.trim() : "trending";

      // Common spelling auto-correction map (under the hood) to maximize search hits!
      term = term
        .replace(/\btution\b/gi, "tuition")
        .replace(/\btutor\b/gi, "tuition") // Handle mobile keyboard autocorrect of "tution" -> "tutor"
        .replace(/\bmoosewala\b/gi, "moose wala")
        .replace(/\bshub\b/gi, "shubh")
        .replace(/\bbolywood\b/gi, "bollywood")
        .replace(/\bpunjabi\s+songs?\b/gi, "punjabi hits")
        .replace(/\bhindi\s+songs?\b/gi, "hindi hits");

      if (engine === 'itunes') {
        // If the query is just a tag, search with tag context
        if (term === "trending") {
          term = "top hits 2026";
        }
        
        // Use JSONP to search iTunes to COMPLETELY bypass CORS in all sandboxed frames/browsers!
        // Query both US/Global store and Indian store in parallel to combine regional catalog availability!
        const urlGlobal = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=40`;
        const urlIndia = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=40&country=in`;
        
        let resultsGlobal: any[] = [];
        let resultsIndia: any[] = [];
        
        try {
          const dataGlobal = await fetchJSONP(urlGlobal);
          if (dataGlobal && dataGlobal.results) {
            resultsGlobal = dataGlobal.results;
          }
        } catch (e) {
          console.error("Global iTunes search failed:", e);
        }
        
        try {
          const dataIndia = await fetchJSONP(urlIndia);
          if (dataIndia && dataIndia.results) {
            resultsIndia = dataIndia.results;
          }
        } catch (e) {
          console.error("India iTunes search failed:", e);
        }
        
        // Merge results and remove duplicates based on trackId
        const mergedResults = [...resultsGlobal];
        const existingTrackIds = new Set(mergedResults.map((item: any) => item.trackId).filter(Boolean));
        
        for (const item of resultsIndia) {
          if (item && item.trackId && !existingTrackIds.has(item.trackId)) {
            mergedResults.push(item);
            existingTrackIds.add(item.trackId);
          }
        }
        
        if (mergedResults.length > 0) {
          // Filter out results that don't have playables
          const results = mergedResults.filter((item: any) => item.previewUrl);
          
          const formatted = results.map((item: any) => {
            const rawArtwork = item.artworkUrl100 || item.artworkUrl60;
            const cover = rawArtwork ? rawArtwork.replace(/\/\d+x\d+bb?\./, '/500x500bb.') : undefined;

            return {
              id: `online_${item.trackId || Math.random()}`,
              title: item.trackName || "Unknown Title",
              artist: item.artistName || "Unknown Artist",
              album: item.collectionName || "Single",
              duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30, // preview is generally 30s
              url: item.previewUrl,
              cover: cover,
              format: "STREAM",
              fileName: `${item.trackName || 'stream'}.mp3`,
              size: 0
            };
          });
          setOnlineTracks([TUM_HI_HO_ONLINE_TRACK, ...formatted]);
        } else {
          setOnlineTracks([TUM_HI_HO_ONLINE_TRACK]);
        }
      } else {
        // --- AUDIUS (Full-length indie/commercial tracks with CORS) ---
        // Strip common "songs" noise so search queries retrieve accurate results
        const cleaned = term
          .toLowerCase()
          .replace(/\b(song|songs|music|mp3|track|tracks|playing|sound|stream|free|download)\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const searchKeywords = cleaned || term;
        
        // Use api.audius.co as the primary endpoint which auto-resolves dynamically to active, responsive hosts
        const backupNodes = [
          "https://api.audius.co",
          "https://discoveryprovider.audius.co",
          "https://discovery-us-01.audius.co",
          "https://discovery-us-02.audius.co"
        ];
        
        let data = null;
        let successNode = "https://api.audius.co";
        
        let apiEndpoint = `/v1/tracks/search?query=${encodeURIComponent(searchKeywords)}&app_name=muzicapp`;
        if (searchKeywords === "trending") {
          apiEndpoint = `/v1/tracks/trending?limit=30&app_name=muzicapp`;
        }

        for (const node of backupNodes) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6500); // Fail fast and switch nodes if one is slow
            const res = await fetch(`${node}${apiEndpoint}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
              data = await res.json();
              if (data && data.data && data.data.length > 0) {
                successNode = node;
                break;
              }
            }
          } catch (e) {
            console.warn(`Audius search failed at ${node}, trying next host...`, e);
          }
        }

        if (data && data.data && data.data.length > 0) {
          const formatted = data.data.map((item: any) => {
            const trackId = item.id;
            // Use successNode or standard redirector api.audius.co for reliable mp3 streaming
            const streamUrl = `${successNode}/v1/tracks/${trackId}/stream?app_name=muzicapp`;
            
            // Resolve cover artwork size
            let coverUrl: string | undefined = undefined;
            if (item.artwork) {
              coverUrl = item.artwork["480x480"] || item.artwork["150x150"] || item.artwork["1000x1000"] || undefined;
            }
            
            return {
              id: `online_${trackId}`,
              title: item.title || "Untitled Track",
              artist: item.user?.name || item.user?.handle || "Unknown Artist",
              album: item.genre || "Audius Stream",
              duration: item.duration ? Math.round(item.duration) : 180,
              url: streamUrl,
              cover: coverUrl,
              format: "STREAM",
              fileName: `${item.title || 'audius'}.mp3`,
              size: 0
            };
          });
          setOnlineTracks([TUM_HI_HO_ONLINE_TRACK, ...formatted]);
        } else {
          setOnlineTracks([TUM_HI_HO_ONLINE_TRACK]);
        }
      }
    } catch (err: any) {
      console.error("Online search error:", err);
      setOnlineTracks([TUM_HI_HO_ONLINE_TRACK]);
      setOnlineError(`Could not fetch online music. Showing featured demo track.`);
    } finally {
      setIsOnlineLoading(false);
    }
  };

  // Switch to online tab or search submit handler
  useEffect(() => {
    if (activeTab === 'online' && onlineTracks.length === 0) {
      fetchOnlineTracks("");
    }
  }, [activeTab]);

  const handleOnlineSearchSubmit = (e: any) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    fetchOnlineTracks(onlineSearchQuery);
  };

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
    requestNotificationPermissionIfNeeded().catch(() => {});
    if ((window as any).Capacitor) {
      try {
        const { Filesystem } = (window as any).Capacitor.Plugins || {};
        if (Filesystem) {
          const result = await Filesystem.requestPermissions();
          if (result.publicStorage === 'granted' || result.storage === 'granted') {
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

    setTimeout(() => {
      triggerDirectoryPicker();
    }, 200);
  };

  const handleDenyPermission = () => {
    localStorage.setItem('muzic_perm_granted', 'false');
    setPermissionStatus('denied');
  };

  useEffect(() => {
    checkPermission();
  }, []);

  // Screen Wake Lock & Background Audio Persistence (Runs automatically)
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (player.isPlaying && 'wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => {
        wakeLockRef.current = wl;
      }).catch(e => {
        console.warn("WakeLock request failed or unsupported:", e);
      });
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [player.isPlaying]);

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

  // Set action handlers once on mount (Native Android System Media + Web MediaSession)
  useEffect(() => {
    let removeNativeListener: (() => void) | undefined;

    // 1. Android Native System Media Player (Notification controls, Lock-screen, Headset buttons)
    setupSystemMediaActionListener((event) => {
      switch (event.action) {
        case 'play':
          callbacksRef.current.setIsPlaying(true);
          break;
        case 'pause':
          callbacksRef.current.setIsPlaying(false);
          break;
        case 'next':
          callbacksRef.current.nextTrack();
          break;
        case 'previous':
          callbacksRef.current.prevTrack();
          break;
        case 'seekTo':
          if (event.position !== undefined) {
            callbacksRef.current.seek(event.position);
          }
          break;
        case 'stop':
          callbacksRef.current.setIsPlaying(false);
          break;
      }
    }).then((cleanup) => {
      removeNativeListener = cleanup;
    });

    // 2. Web MediaSession API Fallback
    if ('mediaSession' in navigator) {
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
    }

    return () => {
      if (removeNativeListener) {
        removeNativeListener();
      }
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

  // Sync track metadata & playState to Android Native System Media and Web MediaSession
  useEffect(() => {
    const track = player.currentTrack;
    if (!track) {
      stopSystemMedia();
      return;
    }

    // Default high-quality cover if none provided
    const defaultCover = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=512&h=512&fit=crop';
    const artworkUrl = (track.cover && (track.cover.startsWith('http://') || track.cover.startsWith('https://') || track.cover.startsWith('data:') || track.cover.startsWith('content:'))) 
      ? track.cover 
      : defaultCover;

    // Web MediaSession
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new (window as any).MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || 'Muzic',
          artwork: [
            { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '384x384', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }
          ]
        });
      } catch (e) {
        console.error("Setting MediaSession metadata failed:", e);
      }
    }

    // Android Native System Media Player
    syncTrackToSystemMedia(track, player.isPlaying, player.currentTime, player.duration);
  }, [player.currentTrack]);

  // Sync playback state (Play/Pause)
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = player.isPlaying ? 'playing' : 'paused';
    }
    syncPlaybackStateToSystemMedia(player.isPlaying, player.currentTime, player.duration, true);
  }, [player.isPlaying]);

  // Sync playback progress/position state
  useEffect(() => {
    if (!player.currentTrack) return;

    const currentDuration = player.duration;
    const currentPos = player.currentTime;

    if (currentDuration > 0 && currentPos >= 0 && currentPos <= currentDuration) {
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
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
      syncPlaybackStateToSystemMedia(player.isPlaying, currentPos, currentDuration);
    }
  }, [player.currentTime, player.duration, player.currentTrack, player.isPlaying]);

  useEffect(() => {
    db.tracks.toArray().then(async saved => { 
      if (saved.length > 0) {
        const tracksWithNewUrls = saved.map(track => ({
          ...track,
          url: track.file ? URL.createObjectURL(track.file) : track.url
        }));
        setTracks(tracksWithNewUrls);
      } else if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        // Automatically scan native device storage on initial launch when library is empty on Android!
        await triggerAutoScanNative(false);
      }
    }).catch(err => {
      console.error("Error retrieving tracks from database:", err);
    });
    return () => {
      tracks.forEach(t => {
        if (t.url && t.url.startsWith('blob:')) {
          URL.revokeObjectURL(t.url);
        }
      });
    };
  }, []); 

  // --- SLEEP TIMER CLEANUP ON UNMOUNT ---
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (timerDelayTimeoutRef.current) clearTimeout(timerDelayTimeoutRef.current);
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
    setPlaybackQueue(sortedTracks);
    const index = sortedTracks.findIndex(t => t.id === track.id);
    if (index !== -1) {
      player.setCurrentTrackIndex(index);
      player.setIsPlaying(true);
      setShowPlayer(true);
    }
  };

  const selectOnlineTrack = (track: Track) => {
    let queue = onlineTracks;
    if (!queue.some(t => t.id === track.id)) {
      queue = [track, ...queue];
      setOnlineTracks(queue);
    }
    setPlaybackQueue(queue);
    const index = queue.findIndex(t => t.id === track.id);
    if (index !== -1) {
      player.setCurrentTrackIndex(index);
      player.setIsPlaying(true);
      setShowPlayer(true);
    }
  };

  const isAudioFile = (file: File): boolean => {
    if (file.type && file.type.startsWith('audio/')) return true;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus', 'wma', 'alac', 'aiff', 'mp4', 'm4b', 'webm', '3gp'].includes(ext);
  };

  const processAudioFile = async (file: File): Promise<Track> => {
    let title = file.name.replace(/\.[^/.]+$/, "");
    let artist = 'Local Artist';
    let album = 'Local Library';
    let duration = 0;
    let cover: string | undefined = undefined;

    const relPath = (file as any).webkitRelativePath || '';
    const folderPath = relPath ? relPath.split('/').slice(0, -1).join('/') || 'Root' : 'Root';
    if (folderPath !== 'Root') {
      album = folderPath.split('/').pop() || 'Local Library';
    }

    try {
      const metadata = await mm.parseBlob(file);
      if (metadata.common) {
        if (metadata.common.title && metadata.common.title.trim()) title = metadata.common.title.trim();
        if (metadata.common.artist && metadata.common.artist.trim()) artist = metadata.common.artist.trim();
        if (metadata.common.album && metadata.common.album.trim()) album = metadata.common.album.trim();
        if (metadata.common.picture?.[0]) {
          const picture = metadata.common.picture[0];
          try {
            const rawFormat = (picture.format || '').toLowerCase();
            const mime = rawFormat.startsWith('image/')
              ? rawFormat
              : `image/${rawFormat === 'jpg' ? 'jpeg' : (rawFormat || 'jpeg')}`;
            const blob = new Blob([picture.data], { type: mime });
            cover = URL.createObjectURL(blob);
          } catch (e) {
            console.warn("Could not generate picture object URL", e);
          }
        }
      }
      if (metadata.format?.duration) {
        duration = Math.round(metadata.format.duration);
      }
    } catch (err) {
      console.warn("Metadata parsing fallback for:", file.name, err);
    }

    return {
      id: generateStableId(file, folderPath),
      title,
      artist,
      album,
      duration,
      url: URL.createObjectURL(file),
      file: file,
      format: file.name.split('.').pop()?.toUpperCase() || 'MP3',
      cover: cover || undefined,
      folderPath,
      fileName: file.name,
      size: file.size
    };
  };

  const processAndSaveFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files as FileList | File[]);
    const audioFiles = fileArray.filter(isAudioFile);

    if (audioFiles.length === 0) {
      setIsScanning(false);
      alert("No audio files (.mp3, .m4a, .wav, .flac, etc.) were found in the selected location.");
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    const newTracks: Track[] = [];

    for (let i = 0; i < audioFiles.length; i++) {
      try {
        const track = await processAudioFile(audioFiles[i]);
        newTracks.push(track);
      } catch (err) {
        console.error("Error indexing audio file:", audioFiles[i].name, err);
      }
      setScanProgress(Math.round(((i + 1) / audioFiles.length) * 100));
    }

    if (newTracks.length > 0) {
      await db.tracks.bulkPut(newTracks);
      const allSaved = await db.tracks.toArray();
      const tracksWithUrls = allSaved.map(track => ({
        ...track,
        url: track.file ? (track.url && track.url.startsWith('blob:') ? track.url : URL.createObjectURL(track.file)) : track.url
      }));
      setTracks(tracksWithUrls);
      if (viewMode !== 'folders') setViewMode('folders');
    }

    setIsScanning(false);
  };

  const triggerAutoScanNative = async (showFeedback = false): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return false;

    setIsScanning(true);
    setScanProgress(15);

    try {
      setScanProgress(35);
      const scannedTracks = await scanDeviceAudioFiles();
      setScanProgress(75);

      if (scannedTracks && scannedTracks.length > 0) {
        await db.tracks.bulkPut(scannedTracks);
        const allSaved = await db.tracks.toArray();
        const tracksWithUrls = allSaved.map(track => ({
          ...track,
          url: track.file ? URL.createObjectURL(track.file) : track.url
        }));
        setTracks(tracksWithUrls);
        setScanProgress(100);
        setIsScanning(false);
        return true;
      } else {
        if (showFeedback) {
          alert("No audio files found in device storage. If you just copied music, please ensure audio permission is granted in device settings.");
        }
      }
    } catch (err: any) {
      console.warn("Device audio auto-scan error:", err);
      if (showFeedback) {
        alert("Audio scan error: " + (err.message || String(err)));
      }
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
    return false;
  };

  const pickAudioFilesNative = async (): Promise<File[]> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickFiles({
          // 'audio/*' for Android & web; 'public.audio' Uniform Type Identifier for iOS
          types: ['audio/*', 'public.audio'],
          limit: 0,
          readData: false
        });
        if (!result.files || result.files.length === 0) return [];

        const files: File[] = [];
        for (const f of result.files) {
          try {
            let blob: Blob;
            if (f.blob) {
              blob = f.blob;
            } else if (f.path) {
              const webPath = Capacitor.convertFileSrc(f.path);
              const res = await fetch(webPath);
              blob = await res.blob();
            } else if (f.data) {
              const res = await fetch(`data:${f.mimeType || 'audio/mpeg'};base64,${f.data}`);
              blob = await res.blob();
            } else {
              continue;
            }
            const file = new File([blob], f.name, { type: f.mimeType || 'audio/mpeg' });
            files.push(file);
          } catch (err) {
            console.error("Error loading native file:", f.name, err);
          }
        }
        return files;
      } catch (e: any) {
        if (e.name === 'AbortError' || e.message?.includes('canceled') || e.message?.includes('cancelled')) {
          return [];
        }
        console.warn("Native FilePicker error:", e);
        return [];
      }
    }
    return [];
  };

  const triggerDirectoryPicker = async () => {
    if (Capacitor.isNativePlatform()) {
      // If Android, attempt automatic MediaStore scan first
      if (Capacitor.getPlatform() === 'android') {
        setIsScanning(true);
        setScanProgress(10);
        try {
          const success = await triggerAutoScanNative(false);
          if (success) {
            if (viewMode !== 'folders') setViewMode('folders');
            return;
          }
        } catch (e) {
          console.warn("Native auto-scan fallback:", e);
        }
      }

      // iOS and Android fallback: Open native file picker (UIDocumentPicker on iOS)
      try {
        try {
          await FilePicker.requestPermissions();
        } catch (e) {
          console.warn("Permission request error:", e);
        }
        const nativeFiles = await pickAudioFilesNative();
        if (nativeFiles.length > 0) {
          await processAndSaveFiles(nativeFiles);
        } else {
          setIsScanning(false);
        }
      } catch (e) {
        console.error("Native scan error:", e);
        setIsScanning(false);
      }
      return;
    }

    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        setIsScanning(true);
        setScanProgress(0);
        const audioFiles: File[] = [];

        async function scanDirectory(handle: any, path: string) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              if (isAudioFile(file)) {
                Object.defineProperty(file, 'webkitRelativePath', {
                  value: `${path}/${file.name}`,
                  writable: true,
                  configurable: true
                });
                audioFiles.push(file);
              }
            } else if (entry.kind === 'directory') {
              await scanDirectory(entry, `${path}/${entry.name}`);
            }
          }
        }

        await scanDirectory(dirHandle, dirHandle.name);

        if (audioFiles.length > 0) {
          await processAndSaveFiles(audioFiles);
        } else {
          alert("No audio files (.mp3, .m4a, .wav, .flac, etc.) were found in the selected folder.");
          setIsScanning(false);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn("DirectoryPicker error fallback:", e);
          folderInputRef.current?.click();
        } else {
          setIsScanning(false);
        }
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  const handleFolderUpload = async (e: any) => {
    const files = e.target.files;
    if (!files) return;
    await processAndSaveFiles(files);
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

  const getFavoriteTracks = () => {
    const trackMap = new Map<string, Track>();
    tracks.forEach(t => trackMap.set(t.id, t));
    onlineTracks.forEach(t => trackMap.set(t.id, t));
    if (player.currentTrack) trackMap.set(player.currentTrack.id, player.currentTrack);
    
    return favoriteTrackIds.map(id => trackMap.get(id)).filter(Boolean) as Track[];
  };

  const activateEqPreset = useCallback((presetKey: EqPresetKey) => {
    setCurrentEqPreset(presetKey);
    if (presetKey !== 'custom' && EQ_PRESETS[presetKey]) {
      const preset = EQ_PRESETS[presetKey];
      setCustomBands([preset.bands[0], preset.bands[1], preset.bands[2], preset.bands[3], preset.bands[4]]);
      showToast(
        `Equalizer: ${preset.name} Activated`,
        <div className="w-5 h-5 rounded-full bg-[#6355FE]/30 flex items-center justify-center text-[#8E7CFF] border border-[#6355FE]/40">
          <SlidersHorizontal size={12} className="animate-pulse" />
        </div>,
        `${preset.badge} • ${preset.description}`
      );
    }
  }, [showToast]);

  const handleBandChange = useCallback((bandIndex: number, value: number) => {
    setCustomBands(prev => {
      const next: [number, number, number, number, number] = [prev[0], prev[1], prev[2], prev[3], prev[4]];
      next[bandIndex] = value;
      return next;
    });
    setCurrentEqPreset('custom');
    const bandInfo = FREQ_BANDS[bandIndex];
    showToast(
      `Equalizer: ${bandInfo.label} set to ${value > 0 ? '+' : ''}${value} dB`,
      <div className="w-5 h-5 rounded-full bg-[#6355FE]/30 flex items-center justify-center text-[#8E7CFF] border border-[#6355FE]/40">
        <AudioLines size={12} />
      </div>,
      `Custom Frequency Tuning (${bandInfo.name})`
    );
  }, [showToast]);

  const cycleEqPreset = useCallback(() => {
    const presetKeys: (keyof typeof EQ_PRESETS)[] = [
      'bass-boost',
      'vocal',
      'electronica',
      'lofi',
      'rock',
      'acoustic',
      'flat'
    ];
    const currentIndex = presetKeys.indexOf(currentEqPreset as any);
    const nextIdx = (currentIndex + 1) % presetKeys.length;
    activateEqPreset(presetKeys[nextIdx]);
  }, [currentEqPreset, activateEqPreset]);

  const cancelSleepTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (timerDelayTimeoutRef.current) {
      clearTimeout(timerDelayTimeoutRef.current);
      timerDelayTimeoutRef.current = null;
    }
    setSleepTimerTime(null);
    currentSleepPresetIndexRef.current = -1;
    lastSleepTimerClickRef.current = 0;
  }, []);

  const startSleepTimer = useCallback((minutes: number, presetIndex: number) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (timerDelayTimeoutRef.current) {
      clearTimeout(timerDelayTimeoutRef.current);
      timerDelayTimeoutRef.current = null;
    }

    currentSleepPresetIndexRef.current = presetIndex;
    lastSleepTimerClickRef.current = Date.now();
    setSleepTimerTime(minutes * 60);

    // Give user 2.5 seconds (2500ms) on each click to increase timer (15 -> 30 -> 45 -> 60 min)
    // The countdown ticker only begins after 2.5 seconds of inactivity.
    timerDelayTimeoutRef.current = setTimeout(() => {
      timerDelayTimeoutRef.current = null;
      timerIntervalRef.current = setInterval(() => {
        setSleepTimerTime(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            player.setIsPlaying(false);
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            currentSleepPresetIndexRef.current = -1;
            lastSleepTimerClickRef.current = 0;
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }, 2500);
  }, [player.setIsPlaying]);

  const cycleSleepTimer = () => {
    const now = Date.now();
    // 2.5-second window from the last click to increment the timer
    const isWithinGraceWindow = (now - lastSleepTimerClickRef.current) <= 2500;

    if (sleepTimerTime === null || !isWithinGraceWindow) {
      // If timer is already running and the 2.5s window has elapsed, clicking turns off the timer
      if (sleepTimerTime !== null && !isWithinGraceWindow) {
        cancelSleepTimer();
        showToast('Sleep timer disabled', <Moon size={15} className="text-[#8F8E9C]" />);
        return;
      }
      // First click: start at 15 minutes with a 2.5s window to increment
      startSleepTimer(15, 0);
      showToast('Sleep timer set to 15 min', <Moon size={15} className="text-amber-400" />);
    } else {
      // Within 2.5 seconds: cycle to the next duration
      const nextIndex = currentSleepPresetIndexRef.current + 1;
      if (nextIndex < SLEEP_PRESETS.length) {
        const nextMinutes = SLEEP_PRESETS[nextIndex];
        startSleepTimer(nextMinutes, nextIndex);
        showToast(`Sleep timer set to ${nextMinutes} min`, <Moon size={15} className="text-amber-400" />);
      } else {
        // Cycled past 60 min: disable timer
        cancelSleepTimer();
        showToast('Sleep timer disabled', <Moon size={15} className="text-[#8F8E9C]" />);
      }
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0818] text-white flex flex-col overflow-hidden font-sans select-none relative pb-20">
      <audio 
        ref={player.audioRef} 
        src={player.currentTrack?.url} 
        onTimeUpdate={player.onTimeUpdate} 
        onLoadedMetadata={player.onTimeUpdate}
        onEnded={player.nextTrack}
        onPlay={() => player.setIsPlaying(true)}
        onPause={() => player.setIsPlaying(false)}
      />

      {/* Decorative Blur Accent Dots */}
      <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-[#6355FE]/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-20 -right-12 w-64 h-64 rounded-full bg-pink-500/5 blur-[80px] pointer-events-none" />

      {/* LIBRARY TAB PORTAL */}
      {activeNavTab === 'library' && (
        <div className="flex-1 flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease-out]">
          {/* FIXED HEADER */}
          <header className="px-6 pt-10 pb-4 shrink-0 space-y-4">
            {/* Unified Top Branding & Mode Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-[#6355FE]/30 shrink-0 relative group">
                  <img src={appLogo} alt="Logo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#6355FE]/20 to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Quick Actions: Theme Switch, Sort & Import Music Folder */}
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={toggleTheme}
                  title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                  className={`p-3 rounded-2xl transition-all flex items-center justify-center cursor-pointer group active:scale-95 border ${
                    isDark
                      ? 'bg-[#14122B]/80 border-white/10 hover:border-[#6355FE]/40 text-[#8F8E9C] hover:text-white shadow-sm'
                      : 'bg-white border-[#6355FE]/15 hover:border-[#6355FE]/40 text-[#585474] hover:text-[#120F26] shadow-sm shadow-[#120F26]/5'
                  }`}
                >
                  {isDark ? (
                    <Sun size={16} className="text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
                  ) : (
                    <Moon size={16} className="text-[#6355FE] group-hover:-rotate-12 transition-transform duration-300" />
                  )}
                </button>

                <button 
                  type="button"
                  onClick={handleToggleSort} 
                  className={`p-3 rounded-2xl transition-all flex items-center justify-center group cursor-pointer active:scale-95 border ${
                    isDark
                      ? 'bg-[#14122B]/80 border-white/10 hover:border-[#6355FE]/40 text-[#8F8E9C] hover:text-white shadow-sm'
                      : 'bg-white border-[#6355FE]/15 hover:border-[#6355FE]/40 text-[#585474] hover:text-[#120F26] shadow-sm shadow-[#120F26]/5'
                  }`}
                  title={sortBy === 'alphabet' ? 'Sort: Alphabetical' : 'Sort: Latest'}
                >
                  {sortBy === 'alphabet' ? <LayoutGrid size={16} /> : <Clock size={16} />}
                </button>

                <button 
                  type="button"
                  onClick={handleImportMusicFolder} 
                  className="p-3 bg-[#6355FE] text-white rounded-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#6355FE]/30 hover:bg-[#7265FF]"
                  title="Import Music Folder"
                >
                  <FolderPlus size={16} />
                </button>
              </div>
            </div>



            {/* TOP-LEVEL CHANNEL SELECTOR: Hidden per user request */}

            {activeTab === 'local' ? (
              <div className="space-y-3">
                {/* Local Search Input Area */}
                <div className="relative flex items-center w-full group">
                  <Search size={15} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all ${
                    isDark 
                      ? 'opacity-40 text-white group-focus-within:opacity-100 group-focus-within:text-[#8E7CFF]' 
                      : 'text-[#6355FE] opacity-80 group-focus-within:opacity-100 group-focus-within:text-[#6355FE]'
                  }`} />
                  <input 
                    type="text" 
                    placeholder="Search songs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-11 pr-10 py-3 rounded-2xl text-xs font-bold transition-all focus:outline-none ${
                      isDark
                        ? 'bg-[#14122B]/70 border border-white/10 focus:bg-[#14122B] focus:border-[#6355FE]/50 focus:shadow-[0_0_20px_rgba(99,85,254,0.15)] placeholder:opacity-30 text-white'
                        : 'bg-white border border-[#6355FE]/15 focus:bg-white focus:border-[#6355FE] shadow-sm shadow-[#120F26]/5 focus:shadow-[0_0_20px_rgba(99,85,254,0.15)] placeholder:text-[#7A7596] text-[#120F26]'
                    }`}
                  />
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setSearchQuery('')}
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                        isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-black/5 text-[#7A7596] hover:text-[#120F26]'
                      }`}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* TABS (Songs vs Folders) */}
                <div className={`flex p-1 rounded-2xl w-full relative border ${
                  isDark ? 'bg-white/5 border-white/5' : 'bg-[#EAE6F8] border-[#6355FE]/10'
                }`}>
                  {(['tracks', 'folders'] as const).map(mode => (
                    <button 
                      key={mode}
                      onClick={() => setViewMode(mode)} 
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest relative z-10 cursor-pointer transition-colors duration-200 ${
                        viewMode === mode 
                          ? '!text-white font-black' 
                          : isDark ? 'opacity-40 text-white hover:opacity-80' : 'text-[#585474] hover:text-[#120F26]'
                      }`}
                    >
                      {mode === 'tracks' ? 'Songs' : 'Folders'}
                      {viewMode === mode && (
                        <motion.div
                          layoutId="localViewModePill"
                          className="absolute inset-0 bg-[#6355FE] rounded-xl -z-10 shadow-md shadow-[#6355FE]/30"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Online Search input line */}
                <form onSubmit={handleOnlineSearchSubmit} className="relative flex items-center gap-2 w-full">
                  <div className="relative flex-1 group">
                    <Search size={15} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all ${
                      isDark ? 'opacity-40 text-white group-focus-within:opacity-100 group-focus-within:text-[#8E7CFF]' : 'text-[#6355FE] opacity-80 group-focus-within:opacity-100 group-focus-within:text-[#6355FE]'
                    }`} />
                    <input 
                      type="text" 
                      placeholder="Search online streams & songs..."  
                      value={onlineSearchQuery}
                      onChange={(e) => setOnlineSearchQuery(e.target.value)}
                      className={`w-full pl-11 pr-10 py-3 rounded-2xl text-xs font-bold transition-all focus:outline-none ${
                        isDark
                          ? 'bg-[#14122B]/70 border border-white/10 focus:bg-[#14122B] focus:border-[#6355FE]/50 focus:shadow-[0_0_20px_rgba(99,85,254,0.15)] placeholder:opacity-30 text-white'
                          : 'bg-white border border-[#6355FE]/15 focus:bg-white focus:border-[#6355FE] shadow-sm shadow-[#120F26]/5 placeholder:text-[#7A7596] text-[#120F26]'
                      }`}
                    />
                    {onlineSearchQuery && (
                      <button 
                        type="button" 
                        onClick={() => setOnlineSearchQuery('')}
                        className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                          isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-black/5 text-[#7A7596] hover:text-[#120F26]'
                        }`}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <button 
                    type="submit"
                    className="px-5 py-3 bg-gradient-to-r from-[#6355FE] to-[#8E7CFF] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#6355FE]/25"
                  >
                    Search
                  </button>
                </form>

                {/* Stream Engine Selector Slider */}
                <div className="space-y-2">
                  <div className={`flex gap-2 items-center justify-between p-1 rounded-2xl border ${
                    isDark ? 'bg-white/5 border-white/5' : 'bg-white border-[#6355FE]/15 shadow-sm'
                  }`}>
                    <span className={`text-[9px] font-black uppercase tracking-wider pl-2 ${
                      isDark ? 'text-[#8F8E9C]' : 'text-[#585474]'
                    }`}>Source:</span>
                    <div className={`flex p-0.5 rounded-xl relative ${
                      isDark ? 'bg-white/5' : 'bg-[#EAE6F8]'
                    }`}>
                      <button
                        type="button"
                        onClick={() => {
                          setOnlineEngine('itunes');
                          fetchOnlineTracks(onlineSearchQuery, 'itunes');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest relative z-10 cursor-pointer transition-colors duration-200 ${
                          onlineEngine === 'itunes' ? '!text-white' : isDark ? 'opacity-40 text-white' : 'text-[#585474]'
                        }`}
                      >
                        Previews
                        {onlineEngine === 'itunes' && (
                          <motion.div
                            layoutId="streamSourceSelector"
                            className="absolute inset-0 bg-[#6355FE] rounded-lg -z-10 shadow-sm"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOnlineEngine('audius');
                          fetchOnlineTracks(onlineSearchQuery, 'audius');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest relative z-10 cursor-pointer transition-colors duration-200 ${
                          onlineEngine === 'audius' ? '!text-white' : isDark ? 'opacity-40 text-white' : 'text-[#585474]'
                        }`}
                      >
                        Full Length
                        {onlineEngine === 'audius' && (
                          <motion.div
                            layoutId="streamSourceSelector"
                            className="absolute inset-0 bg-[#6355FE] rounded-lg -z-10 shadow-sm"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1 max-w-full pb-1">
                    {['trending', 'punjabi', 'hindi', 'bollywood', 'lofi', 'pop', 'electronic', 'rock'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setOnlineSearchQuery(tag === 'trending' ? '' : tag);
                          fetchOnlineTracks(tag === 'trending' ? '' : tag);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer shrink-0 ${
                          (tag === 'trending' && onlineSearchQuery === '') || onlineSearchQuery.toLowerCase() === tag
                          ? 'bg-[#6355FE] text-white shadow-md shadow-[#6355FE]/20'
                          : isDark
                            ? 'bg-[#14122B]/40 opacity-60 hover:opacity-100 text-[#8F8E9C] hover:bg-[#14122B]'
                            : 'bg-white border border-[#6355FE]/15 text-[#585474] hover:text-[#120F26] shadow-sm'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </header>

          {/* MAIN SCROLLABLE WRAPPER */}
          <main className="flex-1 overflow-y-auto px-6 pb-40">
            <section className="space-y-2 text-left">
              {permissionStatus === 'denied' && activeTab === 'local' && (
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
                      <p className="text-[11px] font-bold opacity-60 mt-0.5">Retry permissions to index your files.</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-amber-500/60 group-hover:translate-x-1 transition-transform" />
                </div>
              )}

              {activeTab === 'local' ? (
                <>
                  {isScanning && (
                    <div className="mb-4 p-5 bg-[#14122B] border border-[#6355FE]/40 rounded-3xl shadow-2xl space-y-3 relative overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#6355FE]/20 blur-2xl rounded-full pointer-events-none" />
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] border border-[#6355FE]/30 shrink-0 shadow-lg shadow-[#6355FE]/20">
                          <Loader2 size={24} className="animate-spin text-[#8E7CFF]" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-black text-xs text-white uppercase tracking-wider">Scanning Device Audio Files</h3>
                            <span className="text-[11px] font-black text-[#8E7CFF] bg-[#6355FE]/20 px-2.5 py-0.5 rounded-full border border-[#6355FE]/30 shrink-0">{scanProgress}%</span>
                          </div>
                          <p className="text-[11px] font-semibold text-[#8F8E9C] mt-0.5 truncate">Indexing audio tracks & extracting artwork metadata...</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-[#6355FE] via-[#8E7CFF] to-[#A798FF]" 
                            animate={{ width: `${scanProgress}%` }} 
                            transition={{ duration: 0.3 }} 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {viewMode === 'tracks' ? (
                    filteredTracks.length > 0 ? (
                      filteredTracks.map(track => (
                        <TrackItem 
                          key={track.id} 
                          track={track} 
                          isActive={player.currentTrack?.id === track.id} 
                          isPlaying={player.currentTrack?.id === track.id && player.isPlaying}
                          isFavorite={favoriteTrackIds.includes(track.id)}
                          isDark={isDark}
                          onClick={() => selectTrack(track)} 
                          onToggleFavorite={() => toggleFavorite(track.id)}
                          onOpenMenu={() => setSelectedTrackForMenu(track)}
                        />
                      ))
                    ) : isScanning ? (
                      <div className="flex flex-col items-center justify-center py-16 px-6 bg-[#14122B]/80 border border-[#6355FE]/40 rounded-3xl text-center space-y-4 shadow-xl">
                        <div className="w-16 h-16 rounded-2xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] border border-[#6355FE]/30 shadow-lg shadow-[#6355FE]/20">
                          <Loader2 size={32} className="animate-spin text-[#8E7CFF]" />
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <h3 className="font-black text-sm text-white">Scanning Audio Files ({scanProgress}%)</h3>
                          <p className="text-[11px] font-semibold text-[#8F8E9C]">Searching device folders & extracting ID3 track artwork...</p>
                        </div>
                        <div className="w-full max-w-xs h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-[#6355FE] via-[#8E7CFF] to-[#A798FF]" 
                            animate={{ width: `${scanProgress}%` }} 
                            transition={{ duration: 0.3 }} 
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-6 bg-[#14122B]/60 border border-white/10 rounded-3xl text-center space-y-4 shadow-xl">
                        <div className="w-16 h-16 rounded-2xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] border border-[#6355FE]/30 shadow-lg shadow-[#6355FE]/20">
                          <FolderPlus size={32} />
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <h3 className="font-black text-sm text-white">No Music Files Loaded</h3>
                          <p className="text-[11px] font-semibold text-[#8F8E9C]">Scan your device folders or select audio files to populate your local music library.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (Capacitor.getPlatform() === 'android') {
                                triggerAutoScanNative(true);
                              } else {
                                triggerDirectoryPicker();
                              }
                            }}
                            className="flex-1 py-3 bg-[#6355FE] hover:bg-[#7265FF] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#6355FE]/30 active:scale-95 flex items-center justify-center gap-2"
                          >
                            <FolderPlus size={16} />
                            <span>
                              {Capacitor.getPlatform() === 'android' 
                                ? 'Scan Device Music' 
                                : Capacitor.getPlatform() === 'ios'
                                  ? 'Import Music'
                                  : 'Scan Folder'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (Capacitor.isNativePlatform()) {
                                const files = await pickAudioFilesNative();
                                if (files.length > 0) {
                                  await processAndSaveFiles(files);
                                }
                              } else {
                                fileInputRef.current?.click();
                              }
                            }}
                            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-white/10 active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Music size={16} />
                            <span>Select Songs</span>
                          </button>
                        </div>
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
                      isPlaying={player.isPlaying}
                      favoriteTrackIds={favoriteTrackIds}
                      onToggleFavorite={toggleFavorite}
                      onOpenMenu={setSelectedTrackForMenu}
                      onTrackSelect={selectTrack}
                      isDark={isDark}
                    />
                  ) : null}
                </>
              ) : (
                /* ONLINE LIST VIEW */
                <div className="space-y-4">
                  {/* Spotlight Banner: Featured Demo Songs */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'
                      }`}>
                        Featured Studio Demos & Karaoke
                      </span>
                      <span className={`text-[9px] font-bold ${isDark ? 'text-white/40' : 'text-[#7A7596]'}`}>
                        2 Tracks Available
                      </span>
                    </div>

                    {/* Tum Hi Ho Card */}
                    <div className={`p-4 rounded-3xl border shadow-xl relative overflow-hidden group transition-all ${
                      isDark 
                        ? 'bg-gradient-to-br from-[#1C153E] via-[#241A4F] to-[#120F24] border-[#6355FE]/40' 
                        : 'bg-gradient-to-br from-[#F5F3FF] via-[#EDE9FE] to-white border-[#6355FE]/20 shadow-[#6355FE]/5'
                    }`}>
                      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#6355FE]/20 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg relative group-hover:scale-105 transition-transform bg-[#0A0818]">
                            <img src={appLogo} alt="Tum Hi Ho" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Music size={22} className="text-white drop-shadow" />
                            </div>
                          </div>
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-500 border border-amber-400/30 flex items-center gap-1">
                                <Crown size={10} className="text-amber-500 fill-amber-500" /> Karaoke Demo
                              </span>
                              <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-[#7A7596]'}`}>Aashiqui 2</span>
                            </div>
                            <h3 className={`text-sm font-black mt-1 truncate ${isDark ? 'text-white' : 'text-[#120F26]'}`}>Tum Hi Ho (Learn & Sing Along)</h3>
                            <p className={`text-[11px] font-bold truncate ${isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'}`}>Arijit Singh • Mithoon • 4:22</p>
                          </div>
                        </div>
                      </div>

                      <p className={`text-[11px] mt-2.5 text-left leading-relaxed ${isDark ? 'text-white/70' : 'text-[#585474]'}`}>
                        Listen to the instrumental track, then jump directly into the Singing Studio to sing along with synchronized karaoke lyrics and record your vocals!
                      </p>

                      <div className={`flex items-center gap-2 mt-3 pt-2.5 border-t ${isDark ? 'border-white/10' : 'border-[#6355FE]/15'}`}>
                        <button
                          type="button"
                          onClick={() => selectOnlineTrack(TUM_HI_HO_ONLINE_TRACK)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#6355FE] hover:bg-[#5244e8] active:scale-95 text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#6355FE]/30"
                        >
                          <Play size={13} fill="currentColor" />
                          <span>Play Instrumental</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveNavTab('studio');
                            showToast('Singing Studio cued with Tum Hi Ho demo!', <Mic size={16} className="text-[#8E7CFF]" />);
                          }}
                          className={`py-2 px-3.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                            isDark 
                              ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border-amber-400/30' 
                              : 'bg-amber-400/15 hover:bg-amber-400/25 text-amber-700 border-amber-400/40'
                          }`}
                        >
                          <Mic size={13} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                          <span>Sing in Studio</span>
                        </button>
                      </div>
                    </div>

                    {/* Lutt Le Gaya Card */}
                    <div className={`p-4 rounded-3xl border shadow-xl relative overflow-hidden group transition-all ${
                      isDark 
                        ? 'bg-gradient-to-br from-[#1E1438] via-[#2A1848] to-[#120F24] border-pink-500/30' 
                        : 'bg-gradient-to-br from-[#FFF1F2] via-[#FCE7F3] to-white border-pink-500/20 shadow-pink-500/5'
                    }`}>
                      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-pink-500/15 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg relative group-hover:scale-105 transition-transform bg-[#0A0818]">
                            <img src={appLogo} alt="Lutt Le Gaya" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Music size={22} className="text-pink-400 drop-shadow" />
                            </div>
                          </div>
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-500 border border-pink-500/30 flex items-center gap-1">
                                <Sparkles size={10} className="text-pink-500" /> Dhurandhar Hit
                              </span>
                              <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-[#7A7596]'}`}>Punjabi / Dance</span>
                            </div>
                            <h3 className={`text-sm font-black mt-1 truncate ${isDark ? 'text-white' : 'text-[#120F26]'}`}>Lutt Le Gaya (Dhurandhar)</h3>
                            <p className="text-[11px] font-bold truncate text-pink-500">Simran Choudhary • Shashwat Sachdev • 4:15</p>
                          </div>
                        </div>
                      </div>

                      <p className={`text-[11px] mt-2.5 text-left leading-relaxed ${isDark ? 'text-white/70' : 'text-[#585474]'}`}>
                        High-energy Punjabi hit from Dhurandhar! Sing with real-time timed lyrics or isolate the karaoke track with our on-device AI vocal remover.
                      </p>

                      <div className={`flex items-center gap-2 mt-3 pt-2.5 border-t ${isDark ? 'border-white/10' : 'border-pink-500/15'}`}>
                        <button
                          type="button"
                          onClick={() => selectOnlineTrack(LUTT_LE_GAYA_ONLINE_TRACK)}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-[#6355FE] hover:brightness-110 active:scale-95 text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-pink-500/25"
                        >
                          <Play size={13} fill="currentColor" />
                          <span>Play Song</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveNavTab('studio');
                            showToast('Singing Studio cued with Lutt Le Gaya!', <Mic size={16} className="text-pink-400" />);
                          }}
                          className={`py-2 px-3.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                            isDark 
                              ? 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border-pink-500/30' 
                              : 'bg-pink-500/15 hover:bg-pink-500/25 text-pink-700 border-pink-500/40'
                          }`}
                        >
                          <Mic size={13} className="text-pink-500" />
                          <span>Sing in Studio</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {isOnlineLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                      <Loader2 size={32} className="animate-spin text-[#8E7CFF]" />
                      <p className="text-xs font-black uppercase tracking-widest opacity-40">Loading streams...</p>
                    </div>
                  ) : onlineError ? (
                    <div className="text-center py-16 px-4 space-y-3">
                      <p className="text-xs font-bold text-red-500 opacity-80">{onlineError}</p>
                      <button 
                        onClick={() => fetchOnlineTracks()}
                        className="px-4 py-2 bg-[#1C153E] text-[#8E7CFF] rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer"
                      >
                        Retry Connection
                      </button>
                    </div>
                  ) : onlineTracks.length > 0 ? (
                    onlineTracks.map(track => (
                      <TrackItem 
                        key={track.id} 
                        track={track} 
                        isActive={player.currentTrack?.id === track.id} 
                        isPlaying={player.currentTrack?.id === track.id && player.isPlaying}
                        isFavorite={favoriteTrackIds.includes(track.id)}
                        isDark={isDark}
                        onClick={() => selectOnlineTrack(track)} 
                        onToggleFavorite={() => toggleFavorite(track.id)}
                        onOpenMenu={() => setSelectedTrackForMenu(track)}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#14122B]/10 border border-white/5 rounded-2xl">
                      <Globe size={40} className="opacity-20 text-[#8E7CFF] mb-2 animate-pulse" />
                      <p className="font-extrabold text-xs tracking-widest uppercase opacity-40">No Streams Loaded</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </main>
        </div>
      )}

      {/* PLAYLISTS PORTAL VIEW */}
      {activeNavTab === 'playlists' && (
        <PlaylistsView 
          tracks={tracks}
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          playlistNameInput={playlistNameInput}
          favoriteTrackIds={favoriteTrackIds}
          currentTrackId={player.currentTrack?.id}
          isPlaying={player.isPlaying}
          onTrackSelect={selectTrack}
          onToggleFavorite={toggleFavorite}
          onOpenMenu={setSelectedTrackForMenu}
          setPlaylistNameInput={setPlaylistNameInput}
          setActivePlaylistId={setActivePlaylistId}
          createPlaylist={createPlaylist}
          deletePlaylist={deletePlaylist}
          removeTrackFromPlaylist={removeTrackFromPlaylist}
          onBackToLibrary={() => setActiveNavTab('library')}
          isDark={isDark}
        />
      )}

      {/* FAVORITES VIEW */}
      {activeNavTab === 'favorites' && (
        <div className="flex-1 flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease-out]">
          <header className="px-6 pt-10 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setActiveNavTab('library')}
                className="p-2 -ml-2 rounded-full hover:bg-white/5 active:scale-95 transition-all text-[#8E7CFF] cursor-pointer"
                title="Back to Library"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none text-white">Favorites</h1>
                <p className="text-[11px] font-extrabold text-[#8E7CFF] uppercase tracking-widest mt-1">High fidelity tracks</p>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-6 pb-40">
            {(() => {
              const favs = getFavoriteTracks();
              return (
                <div className="space-y-2 text-left">
                  {favs.length > 0 ? (
                    favs.map(track => (
                      <TrackItem 
                        key={track.id} 
                        track={track} 
                        isActive={player.currentTrack?.id === track.id} 
                        isPlaying={player.currentTrack?.id === track.id && player.isPlaying}
                        isFavorite={true}
                        isDark={isDark}
                        onClick={() => {
                          if (track.folderPath) {
                            selectTrack(track);
                          } else {
                            selectOnlineTrack(track);
                          }
                        }} 
                        onToggleFavorite={() => toggleFavorite(track.id)}
                        onOpenMenu={() => setSelectedTrackForMenu(track)}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#14122B]/10 border border-white/5 rounded-3xl">
                      <Heart size={40} className="text-[#8E7CFF] opacity-20 mb-2 animate-pulse" />
                      <p className="font-black text-xs tracking-widest uppercase opacity-40">Favorites list is empty</p>
                      <p className="text-[10px] font-bold opacity-30 text-center max-w-xs mt-1.5 uppercase tracking-wide leading-normal">
                        Click the heart icon on any song inside the library list, and they will collect here!
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </main>
        </div>
      )}

      {/* SETTINGS VIEW */}
      {activeNavTab === 'settings' && (
        <SettingsView 
          folderInputRef={folderInputRef}
          fileInputRef={fileInputRef}
          theme={theme}
          onToggleTheme={toggleTheme}
          onBackToLibrary={() => setActiveNavTab('library')}
          onScanDirectory={() => {
            if (Capacitor.getPlatform() === 'android') {
              triggerAutoScanNative(true);
            } else {
              triggerDirectoryPicker();
            }
          }}
          onClearCache={async () => {
            if (confirm("Reset cache? This clears locally scanned path keys only.")) {
              await db.tracks.clear();
              setTracks([]);
              showToast("Cache cleared successfully!", <Trash2 size={16} className="text-red-400" />);
            }
          }}
        />
      )}

      {/* SINGING STUDIO PORTAL VIEW */}
      {activeNavTab === 'studio' && (
        <SingingStudioView 
          libraryTracks={tracks}
          onBackToLibrary={() => setActiveNavTab('library')}
          onPauseMainPlayer={() => player.setIsPlaying(false)}
          onShowToast={showToast}
          theme={theme}
        />
      )}

      {/* Hidden Files inputs */}
      <input 
        type="file" 
        multiple 
        accept="audio/*,.mp3,.m4a,.wav,.flac,.aac,.ogg,.opus,.wma,.alac,.aiff,.mp4,.m4b,.webm,.3gp" 
        ref={fileInputRef} 
        onChange={(e: any) => e.target.files && processAndSaveFiles(e.target.files)} 
        className="hidden" 
      />
      
      <input 
        type="file" 
        // @ts-ignore
        webkitdirectory="" 
        directory="" 
        multiple 
        accept="audio/*,.mp3,.m4a,.wav,.flac,.aac,.ogg,.opus,.wma,.alac,.aiff,.mp4,.m4b,.webm,.3gp" 
        ref={folderInputRef} 
        onChange={handleFolderUpload} 
        className="hidden" 
      />

      {/* Mini Player */}
      <AnimatePresence>
        {!showPlayer && player.currentTrack && activeNavTab !== 'studio' && (
          <motion.footer 
            initial={{ y: 80, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 80, opacity: 0 }}
            onClick={() => setShowPlayer(true)}
            className={`fixed bottom-[96px] left-5 right-5 rounded-[24px] shadow-2xl flex flex-col cursor-pointer z-40 backdrop-blur-xl overflow-hidden active:scale-[0.99] transition-transform duration-200 border ${
              isDark
                ? 'bg-[#14122B]/95 border-white/10 shadow-black/50'
                : 'bg-white/95 border-[#6355FE]/20 shadow-[#120F26]/12'
            }`}
          >
            <div className="flex items-center px-4 pt-3 pb-2">
              <div className={`w-12 h-12 rounded-xl overflow-hidden mr-3 shadow-md shrink-0 relative border ${
                isDark ? 'border-white/5' : 'border-[#6355FE]/15'
              }`}>
                <TrackThumbnail
                  cover={player.currentTrack.cover}
                  title={player.currentTrack.title}
                  artist={player.currentTrack.artist}
                  alt={player.currentTrack.title}
                />
              </div>
              <div className="flex-1 min-w-0 mr-4 text-left">
                <h4 className={`font-black truncate text-[13px] leading-tight ${
                  isDark ? 'text-white' : 'text-[#120F26]'
                }`}>{player.currentTrack.title}</h4>
                <p className={`text-[11px] truncate font-bold uppercase tracking-tight mt-0.5 ${
                  isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'
                }`}>{player.currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => player.togglePlay()}
                  className="w-10 h-10 rounded-full bg-[#6355FE] text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md shadow-[#6355FE]/30"
                >
                  {player.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                </button>
              </div>
            </div>
            
            {/* Seeker */}
            <div className="px-5 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className={`text-[8px] font-black w-8 text-left ${isDark ? 'text-white/40' : 'text-[#585474]'}`}>{formatTime(player.currentTime)}</span>
                <div className="flex-1 relative flex items-center h-2 group">
                  <div className={`absolute left-0 right-0 h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[#6355FE]/15'}`}>
                    <div 
                      className="h-full bg-gradient-to-r from-[#6355FE] to-[#8E7CFF]"
                      style={{ width: `${player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0}%` }}
                    />
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={player.duration || 100} 
                    step="0.1" 
                    value={player.currentTime} 
                    onChange={(e) => player.seek(parseFloat(e.target.value))}
                    className="absolute z-10 w-full h-2 opacity-0 cursor-pointer appearance-none"
                  />
                </div>
                <span className={`text-[8px] font-black w-8 text-right ${isDark ? 'text-white/40' : 'text-[#585474]'}`}>{formatTime(player.duration)}</span>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Full Player Overlay with Drag-to-Dismiss Gestures */}
      <AnimatePresence>
        {showPlayer && player.currentTrack && (
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.4}
            onDragEnd={(event, info) => {
              if (info.offset.y > 120) {
                setShowPlayer(false);
              }
            }}
            transition={{ type: 'spring', damping: 38, stiffness: 280, mass: 0.8 }}
            className={`fixed inset-0 z-50 flex flex-col px-8 pb-10 overflow-hidden select-none touch-none ${
              isDark ? 'bg-[#0A0818] text-white' : 'bg-[#F7F6FC] text-[#120F26]'
            }`}
          >
            {/* Grab / Drag Handle */}
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full shrink-0 z-20 ${
              isDark ? 'bg-white/10' : 'bg-black/15'
            }`} />

            <div className={`absolute inset-0 -z-10 bg-gradient-to-b from-[#6355FE]/20 to-transparent blur-[120px] scale-125 ${
              isDark ? 'opacity-30' : 'opacity-15'
            }`} />
            
            <header className="flex items-center justify-between mt-12 mb-6 shrink-0 z-10">
              <button 
                onClick={() => setShowPlayer(false)} 
                className={`p-2.5 -ml-2 rounded-full active:scale-95 transition-all cursor-pointer ${
                  isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-[#120F26]'
                }`}
              >
                <ChevronDown size={20} strokeWidth={3} />
              </button>
              <div className="text-center">
                <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-1 ${
                  isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'
                }`}>Now Playing</p>
                <p className={`font-extrabold text-[11px] truncate max-w-[180px] uppercase tracking-wider ${
                  isDark ? 'opacity-60 text-[#8F8E9C]' : 'text-[#585474]'
                }`}>{player.currentTrack.album}</p>
              </div>
              <motion.button 
                onClick={() => setIsEqualizerOpen(true)}
                whileTap={{ scale: 0.9 }} 
                className={`p-2.5 -mr-2 rounded-full active:scale-95 transition-all cursor-pointer ${
                  isDark ? 'hover:bg-white/10 text-[#8E7CFF]' : 'hover:bg-[#6355FE]/10 text-[#6355FE]'
                }`}
                title={`Equalizer Setting: ${currentEqPreset === 'custom' ? 'Custom Tuning' : EQ_PRESETS[currentEqPreset]?.name || currentEqPreset}`}
              >
                <SlidersHorizontal size={18} strokeWidth={2.5} />
              </motion.button>
            </header>

            {/* Content box */}
            <div 
              onPointerDownCapture={(e) => e.stopPropagation()} 
              className="flex-1 flex flex-col items-center justify-center space-y-7 max-w-[290px] mx-auto w-full z-10"
            >
              {/* Rotating Vinyl Disc Cover */}
              <div className="relative w-full aspect-square group">
                {/* Outer Neon Glow Pulsing Circle */}
                <div className="absolute inset-x-0 inset-y-0 rounded-full border border-[#6355FE]/30 bg-gradient-to-tr from-[#6355FE]/10 via-pink-500/5 to-transparent blur-[8px] animate-pulse pointer-events-none scale-105" />
                <div className="absolute inset-x-0 inset-y-0 rounded-full border-2 border-dashed border-[#8E7CFF]/20 animate-[spin_100s_linear_infinite] pointer-events-none scale-110" />

                <motion.div 
                  whileHover={{ scale: 1.015 }}
                  style={{
                    animationPlayState: player.isPlaying ? 'running' : 'paused'
                  }}
                  className="w-full h-full rounded-full overflow-hidden shadow-[0_25px_65px_-12px_rgba(0,0,0,0.45)] ring-8 ring-white/5 relative transition-transform duration-300 vinyl-rotating border border-white/10"
                >
                  <TrackThumbnail
                    cover={player.currentTrack.cover}
                    title={player.currentTrack.title}
                    artist={player.currentTrack.artist}
                    alt={player.currentTrack.title}
                    isVinyl={true}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.25)_65%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />
                  <div className="absolute inset-0 border-[35px] border-black/10 rounded-full pointer-events-none" />
                  {/* Center Hub */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#0A0818] rounded-full shadow-inner ring-4 ring-black/40 border border-white/5" />
                </motion.div>
                
                {/* Tone Arm Vector Art */}
                <motion.div 
                  className="absolute -top-4 -right-4 w-28 h-40 pointer-events-none origin-top-right z-30"
                  animate={{ rotate: player.isPlaying ? 4 : -22 }}
                  transition={{ type: "spring", stiffness: 90, damping: 14 }}
                >
                  <svg className="w-full h-full drop-shadow-lg opacity-65 group-hover:opacity-85 transition-opacity duration-300" viewBox="0 0 120 180" fill="none">
                    <circle cx="100" cy="20" r="14" fill="#2B2651" />
                    <circle cx="100" cy="20" r="6" fill="#6355FE" />
                    <path d="M100 20 L80 95 L46 135" stroke="#2B2651" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="36" y="131" width="16" height="10" rx="2" transform="rotate(-30 43 136)" fill="#2B2651" />
                    <circle cx="42" cy="137" r="1.5" fill="#6355FE" className="animate-pulse" />
                  </svg>
                </motion.div>
              </div>

              <div className="w-full text-center space-y-1 pt-1 mb-2">
                <h2 className={`text-xl font-black tracking-tight leading-snug px-2 line-clamp-1 ${
                  isDark ? 'text-white' : 'text-[#120F26]'
                }`}>{player.currentTrack.title}</h2>
                <p className={`text-[13px] font-bold uppercase tracking-widest mt-0.5 ${
                  isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'
                }`}>{player.currentTrack.artist}</p>
              </div>

              {/* Seeker Progress bar */}
              <div className="w-full px-2">
                <ProgressBar 
                  current={player.currentTime} 
                  total={player.duration} 
                  onSeek={(e: any) => player.seek(parseFloat(e.target.value))}
                  formatTime={formatTime}
                  isDark={isDark}
                />
              </div>

              {/* Main controls */}
              <div className="w-full space-y-6">
                <div className="flex items-center justify-between w-full px-2">
                  <motion.button 
                    onClick={player.toggleShuffle}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 transition-all cursor-pointer ${
                      player.shuffle 
                        ? isDark ? 'text-[#8E7CFF] scale-110' : 'text-[#6355FE] scale-110' 
                        : isDark ? 'text-white/40 hover:text-white' : 'text-[#7A7596] hover:text-[#120F26]'
                    }`}
                  >
                    <Shuffle size={18} strokeWidth={3} />
                  </motion.button>
                  
                  <div className="flex items-center gap-5">
                    <motion.button 
                      onClick={player.prevTrack} 
                      whileTap={{ scale: 0.85 }} 
                      className={`p-2.5 rounded-full active:scale-90 transition-all cursor-pointer ${
                        isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-[#120F26]'
                      }`}
                    >
                      <SkipBack size={20} fill="currentColor" />
                    </motion.button>
                    
                    <motion.button 
                      onClick={player.togglePlay}
                      whileTap={{ scale: 0.95 }}
                      className="w-14 h-14 bg-[#6355FE] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#6355FE]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      {player.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
                    </motion.button>
                    
                    <motion.button 
                      onClick={player.nextTrack} 
                      whileTap={{ scale: 0.85 }} 
                      className={`p-2.5 rounded-full active:scale-90 transition-all cursor-pointer ${
                        isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-[#120F26]'
                      }`}
                    >
                      <SkipForward size={20} fill="currentColor" />
                    </motion.button>
                  </div>

                  <motion.button 
                    onClick={player.toggleRepeat}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 transition-all cursor-pointer ${
                      player.repeatMode !== 'off' 
                        ? isDark ? 'text-[#8E7CFF] scale-110' : 'text-[#6355FE] scale-110' 
                        : isDark ? 'opacity-30 hover:opacity-100 text-white' : 'text-[#7A7596] hover:text-[#120F26]'
                    }`}
                  >
                    {player.repeatMode === 'one' ? <Repeat1 size={20} strokeWidth={3} /> : <Repeat size={20} strokeWidth={3} />}
                  </motion.button>
                </div>

                <div className={`h-[1px] w-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />

                {/* Sub-Panel Controls (Favorites, Quick-Add Playlist, Equalizer Presets, Moon Sleep Timer) */}
                <div className="flex items-center justify-around w-full px-2 pt-1">
                  
                  {/* Favorite Toggle */}
                  <motion.button 
                    onClick={() => toggleFavorite(player.currentTrack!.id)}
                    whileTap={{ scale: 0.85 }} 
                    className={`p-3 rounded-full border transition-all cursor-pointer ${
                      isDark 
                        ? 'bg-white/5 border-white/5' 
                        : 'bg-[#6355FE]/10 border-[#6355FE]/15 shadow-sm'
                    } ${
                      favoriteTrackIds.includes(player.currentTrack!.id) 
                        ? 'text-pink-500 scale-110 shadow-lg shadow-pink-500/10' 
                        : isDark ? 'text-[#8F8E9C]/60 hover:text-white' : 'text-[#585474] hover:text-[#6355FE]'
                    }`}
                    title="Favorite Track"
                  >
                    <Heart size={16} fill={favoriteTrackIds.includes(player.currentTrack!.id) ? "currentColor" : "none"} />
                  </motion.button>

                  {/* Context menu popup redirect triggers (Add to custom Playlists) */}
                  <motion.button 
                    onClick={() => { setSelectedTrackForMenu(player.currentTrack); }}
                    whileTap={{ scale: 0.85 }} 
                    className={`p-3 rounded-full border transition-all cursor-pointer ${
                      isDark 
                        ? 'bg-white/5 border-white/5 text-[#8F8E9C]/60 hover:text-white' 
                        : 'bg-[#6355FE]/10 border-[#6355FE]/15 text-[#585474] hover:text-[#6355FE]'
                    }`}
                    title="Add to Playlist"
                  >
                    <ListMusic size={16} />
                  </motion.button>

                  {/* Equalizer settings */}
                  <div className="flex flex-col items-center">
                    <motion.button 
                      onClick={cycleEqPreset}
                      whileTap={{ scale: 0.85 }} 
                      className={`p-3 rounded-full border transition-all cursor-pointer relative group ${
                        isDark 
                          ? 'bg-white/5 border-white/5' 
                          : 'bg-[#6355FE]/10 border-[#6355FE]/15'
                      } ${
                        currentEqPreset !== 'flat' 
                          ? isDark ? 'text-[#8E7CFF] scale-105 shadow-lg shadow-[#6355FE]/20 ring-1 ring-[#8E7CFF]/40' : 'text-[#6355FE] scale-105 ring-1 ring-[#6355FE]/40'
                          : isDark ? 'text-[#8F8E9C]/60 hover:text-white' : 'text-[#585474] hover:text-[#6355FE]'
                      }`}
                      title={`Equalizer Setting: ${currentEqPreset === 'custom' ? 'Custom Tuning' : EQ_PRESETS[currentEqPreset]?.name || currentEqPreset} (Tap to cycle preset, click badge to tune)`}
                    >
                      <SlidersHorizontal size={16} />
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => setIsEqualizerOpen(true)}
                      className={`text-[8px] font-black uppercase mt-1 hover:underline tracking-wider cursor-pointer ${
                        isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'
                      }`}
                      title="Open Equalizer Tuning Panel"
                    >
                      {currentEqPreset === 'custom' ? 'Custom' : (EQ_PRESETS[currentEqPreset]?.name.split(' ')[0] || 'EQ')}
                    </button>
                  </div>

                  {/* Sleep Timer button */}
                  <div className="flex flex-col items-center">
                    <motion.button 
                      onClick={cycleSleepTimer}
                      whileTap={{ scale: 0.85 }} 
                      className={`p-3 rounded-full border transition-all cursor-pointer ${
                        isDark ? 'bg-white/5 border-white/5' : 'bg-[#6355FE]/10 border-[#6355FE]/15'
                      } ${
                        sleepTimerTime !== null 
                          ? 'text-amber-400 scale-110 shadow-lg shadow-amber-400/10' 
                          : isDark ? 'text-[#8F8E9C]/60 hover:text-white' : 'text-[#585474] hover:text-[#6355FE]'
                      }`}
                      title="Set Sleep Timer"
                    >
                      <Moon size={16} fill={sleepTimerTime !== null ? "currentColor" : "none"} />
                    </motion.button>
                    {sleepTimerTime !== null && (
                      <span className="text-[8px] font-black text-amber-500 mt-1 uppercase tracking-wider animate-pulse">
                        {Math.floor(sleepTimerTime / 60)}:{(sleepTimerTime % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Toast Notification (High-visibility on top of Now Playing screen & safe-area aware) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            className="fixed left-1/2 -translate-x-1/2 z-[300] pointer-events-none max-w-[92vw]"
            style={{
              top: 'calc(max(1.25rem, env(safe-area-inset-top, 0px)) + 0.75rem)'
            }}
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#14122B]/95 backdrop-blur-2xl border border-[#6355FE]/50 shadow-[0_16px_40px_rgba(0,0,0,0.65)] text-white">
              {toast.icon && (
                <div className="shrink-0 flex items-center justify-center">
                  {toast.icon}
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-xs font-black tracking-tight text-white whitespace-nowrap">
                  {toast.message}
                </span>
                {toast.subtitle && (
                  <span className="text-[10px] font-bold text-[#8E7CFF] opacity-90 whitespace-nowrap">
                    {toast.subtitle}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Audio Equalizer Tuning Modal */}
      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
        currentPreset={currentEqPreset}
        customBands={customBands}
        onSelectPreset={activateEqPreset}
        onBandChange={handleBandChange}
        isPlaying={player.isPlaying}
      />

      {/* Scanning UI - Floating Toast Banner */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 left-4 right-4 max-w-sm mx-auto z-[160] bg-[#14122B]/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-[#6355FE]/40 text-left"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] border border-[#6355FE]/30 shrink-0 shadow-md">
                <Loader2 className="animate-spin text-[#8E7CFF]" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-[#8E7CFF]">Scanning Device Audio</h3>
                  <span className="text-[10px] font-black text-white bg-[#6355FE]/30 px-2 py-0.5 rounded-full border border-[#6355FE]/40 shrink-0">{scanProgress}%</span>
                </div>
                <p className="text-xs font-bold truncate text-white mt-0.5">Indexing music tracks...</p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#6355FE] via-[#8E7CFF] to-[#A798FF]" 
                animate={{ width: `${scanProgress}%` }} 
                transition={{ duration: 0.3 }} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Popover Bottom Sheet */}
      <TrackContextMenu 
        track={selectedTrackForMenu}
        playlists={playlists}
        favoriteTrackIds={favoriteTrackIds}
        onClose={() => setSelectedTrackForMenu(null)}
        onToggleFavorite={toggleFavorite}
        onAddTrackToPlaylist={addTrackToPlaylist}
        onRemoveTrackFromPlaylist={removeTrackFromPlaylist}
        onCreatePlaylistRedirect={() => {
          setActiveNavTab('playlists');
          setSelectedTrackForMenu(null);
        }}
      />

      {/* Permission Request Modal Overlay - Material 3 standard */}
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
              className="w-full max-w-sm bg-[#14122B] p-8 rounded-[36px] shadow-2xl border border-white/10 space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#1D163F] flex items-center justify-center text-[#8E7CFF] shadow-inner border border-white/5">
                  <Music size={28} strokeWidth={2.5} />
                </div>
                <div className="space-y-2 text-left">
                  <h2 className="text-xl font-black tracking-tight leading-snug text-white">
                    Access Media Files?
                  </h2>
                  <p className="text-sm font-semibold opacity-60 leading-relaxed text-[#B9B6CE]">
                    Muzic needs storage permission to scan the folders on your device and populate your offline music library seamlessly.
                  </p>
                  <p className="text-xs font-semibold opacity-50 leading-relaxed bg-black/10 p-3 rounded-xl border border-white/5 text-[#B9B6CE]">
                    💡 This app processes your files locally, respects your privacy, and never uploads any data.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={requestPermission}
                  className="w-full py-3.5 bg-[#6355FE] text-white hover:bg-[#6355FE]/95 active:scale-[0.98] transition-all rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#6355FE]/25 cursor-pointer"
                >
                  Grant Permissions
                </button>
                <button 
                  onClick={handleDenyPermission}
                  className="w-full py-3 opacity-40 hover:opacity-100 active:scale-[0.98] transition-all rounded-2xl font-bold text-xs uppercase tracking-widest text-[#B9B6CE] cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Glowing Bottom Nav bar */}
      <nav className={`fixed bottom-0 left-0 right-0 h-20 backdrop-blur-xl border-t flex items-center justify-around px-4 z-40 transition-colors ${
        isDark 
          ? 'bg-[#0E0B20]/95 border-white/5 shadow-none' 
          : 'bg-white/95 border-[#6355FE]/15 shadow-[0_-4px_24px_rgba(99,85,254,0.06)]'
      }`}>
        {[
          { tab: 'library', icon: Music, label: 'Library' },
          { tab: 'playlists', icon: ListMusic, label: 'Playlists' },
          { tab: 'favorites', icon: Heart, label: 'Favorites' },
          { tab: 'studio', icon: Mic, label: 'Studio', isPremium: true },
          { tab: 'settings', icon: SettingsIcon, label: 'Settings' }
        ].map(({ tab, icon: Icon, label, isPremium }) => {
          const isActive = activeNavTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveNavTab(tab as any);
                if (tab !== 'playlists') setActivePlaylistId(null);
              }}
              className="flex flex-col items-center justify-center gap-1.5 py-2 px-4 rounded-xl relative cursor-pointer group transition-all"
            >
              <div className={`p-1 rounded-lg transition-all relative ${
                isActive 
                  ? isDark ? 'text-[#8E7CFF] scale-110' : 'text-[#6355FE] scale-110' 
                  : isDark ? 'text-[#8F8E9C] group-hover:text-white' : 'text-[#585474] group-hover:text-[#120F26]'
              }`}>
                <Icon size={18} fill={isActive && tab === 'favorites' ? 'currentColor' : 'none'} />
                {isPremium && (
                  <Crown 
                    size={10} 
                    className="absolute -top-1.5 -right-1.5 text-amber-500 fill-amber-500 drop-shadow-[0_0_5px_rgba(251,191,36,0.9)] animate-pulse" 
                  />
                )}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-wider transition-colors ${
                isActive 
                  ? isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]' 
                  : isDark ? 'text-[#8F8E9C]/60 group-hover:text-white' : 'text-[#585474] group-hover:text-[#120F26]'
              }`}>
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="bottomNavGlowIndicator"
                  className={`absolute bottom-1 w-5 h-0.5 rounded-full shadow-[0_0_8px_#6355FE] ${
                    isDark ? 'bg-[#8E7CFF]' : 'bg-[#6355FE]'
                  }`}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
