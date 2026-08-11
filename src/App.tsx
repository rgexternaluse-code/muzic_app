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
  Clock,
  Search,
  Globe,
  Heart,
  ListMusic,
  Settings as SettingsIcon,
  Trash2,
  Plus,
  Moon,
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
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track, FolderNode } from './types';
import { db } from './db';
import * as mm from 'music-metadata-browser';
import appLogo from './assets/images/muzic_app_logo_1786456453207.jpg';
import { TrackContextMenu } from './components/TrackContextMenu';
import { PlaylistsView } from './components/PlaylistsView';
import { SettingsView } from './components/SettingsView';

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
  onClick, 
  onToggleFavorite, 
  onOpenMenu 
}: { 
  track: Track; 
  isActive: boolean; 
  isPlaying?: boolean; 
  isFavorite?: boolean;
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
        ? 'bg-[#6355FE]/20 border-[#6355FE]/40 shadow-xl shadow-[#6355FE]/10' 
        : 'bg-[#14122B]/40 hover:bg-[#1B183A]/80 border-white/5 hover:border-white/10'
    }`}
  >
    {/* Cover Art Image */}
    <div className="w-12 h-12 rounded-xl overflow-hidden mr-3.5 shadow-md shrink-0 relative border border-white/10 group-hover:shadow-lg transition-all">
      <img src={track.cover} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
      {isActive && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-[2px]">
          {isPlaying && <div className="w-3 h-3 bg-[#6355FE] rounded-full animate-ping shadow-[0_0_8px_#6355FE]" />}
        </div>
      )}
    </div>

    {/* Metadata Text Box */}
    <div className="flex-1 min-w-0 pr-2">
      <h3 className={`text-[13.5px] font-black truncate leading-tight transition-colors duration-200 ${
        isActive ? 'text-white font-black' : 'text-slate-100 group-hover:text-white'
      }`}>
        {track.title}
      </h3>
      <p className={`text-[11px] truncate font-bold mt-1 transition-colors duration-200 ${
        isActive ? 'text-[#8E7CFF]' : 'text-[#8F8E9C]'
      }`}>
        {track.artist}
      </p>
    </div>

    {/* Action buttons and format capsules */}
    <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
      {isActive && <SoundWaveIndicator isPlaying={isPlaying} />}
      
      {/* Format Badge (e.g., MP3 or Stream) */}
      <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[#8F8E9C] group-hover:text-white transition-colors`}>
        {track.format || 'MP3'}
      </span>

      {/* Quick Favorite Heart Button */}
      {onToggleFavorite && (
        <motion.button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          whileTap={{ scale: 0.8 }}
          type="button"
          className={`p-1.5 rounded-full transition-all cursor-pointer hover:bg-white/10 ${
            isFavorite ? 'text-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.3)]' : 'text-[#8F8E9C]/40 hover:text-pink-400'
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
          className="p-1.5 rounded-full text-[#8F8E9C]/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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

const ProgressBar = memo(({ current, total, onSeek, formatTime }: any) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="w-full space-y-2 group/progress select-none">
      <div className="relative w-full h-2 flex items-center group">
        {/* Progress track background */}
        <div className="absolute left-0 right-0 h-1.5 bg-[var(--m3-surface-variant)]/60 rounded-full overflow-hidden transition-all duration-200 group-hover:h-2">
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
      <div className="flex justify-between text-[10px] font-bold opacity-30 tracking-wider">
        <span>{formatTime(current)}</span>
        <span>{formatTime(total)}</span>
      </div>
    </div>
  );
});

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  
  // --- BOTTOM NAV CHANNELS ---
  const [activeNavTab, setActiveNavTab] = useState<'library' | 'playlists' | 'favorites' | 'settings'>('library');
  
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

  // --- PREMIUM SLEEP TIMER CONFIG ---
  const [sleepTimerTime, setSleepTimerTime] = useState<number | null>(null); // Remaining seconds
  const timerIntervalRef = useRef<any>(null);

  const startSleepTimer = (minutes: number) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setSleepTimerTime(minutes * 60);
  };

  const cancelSleepTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setSleepTimerTime(null);
  };

  // --- PREMIUM EQUALIZER PRESETS ---
  const [currentEqPreset, setCurrentEqPreset] = useState<'flat' | 'bass-boost' | 'vocal' | 'electronica' | 'lofi'>('bass-boost');

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
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [onlineTracks, setOnlineTracks] = useState<Track[]>([]);
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineEngine, setOnlineEngine] = useState<'itunes' | 'audius'>('itunes');

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
          
          const formatted = results.map((item: any) => ({
            id: `online_${item.trackId || Math.random()}`,
            title: item.trackName || "Unknown Title",
            artist: item.artistName || "Unknown Artist",
            album: item.collectionName || "Single",
            duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30, // preview is generally 30s
            url: item.previewUrl,
            cover: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb.jpg", "400x400bb.jpg") : "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",
            format: "STREAM",
            fileName: `${item.trackName || 'stream'}.mp3`,
            size: 0
          }));
          setOnlineTracks(formatted);
        } else {
          setOnlineTracks([]);
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
            let coverUrl = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400";
            if (item.artwork) {
              coverUrl = item.artwork["480x480"] || item.artwork["150x150"] || item.artwork["1000x1000"] || coverUrl;
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
          setOnlineTracks(formatted);
        } else {
          setOnlineTracks([]);
        }
      }
    } catch (err: any) {
      console.error("Online search error:", err);
      setOnlineError(`Could not fetch online music. Please check your network connection.`);
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

  // --- SLEEP TIMER TIMER PROCESSOR ---
  useEffect(() => {
    if (sleepTimerTime === null) return;
    if (sleepTimerTime <= 0) {
      player.setIsPlaying(false);
      setSleepTimerTime(null);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setSleepTimerTime(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          player.setIsPlaying(false);
          clearInterval(timerIntervalRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [sleepTimerTime, player.setIsPlaying]);

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
    setPlaybackQueue(onlineTracks);
    const index = onlineTracks.findIndex(t => t.id === track.id);
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

  const getFavoriteTracks = () => {
    const trackMap = new Map<string, Track>();
    tracks.forEach(t => trackMap.set(t.id, t));
    onlineTracks.forEach(t => trackMap.set(t.id, t));
    if (player.currentTrack) trackMap.set(player.currentTrack.id, player.currentTrack);
    
    return favoriteTrackIds.map(id => trackMap.get(id)).filter(Boolean) as Track[];
  };

  const cycleEqPreset = () => {
    const presets: ('flat' | 'bass-boost' | 'vocal' | 'electronica' | 'lofi')[] = ['flat', 'bass-boost', 'vocal', 'electronica', 'lofi'];
    const nextIdx = (presets.indexOf(currentEqPreset) + 1) % presets.length;
    setCurrentEqPreset(presets[nextIdx]);
  };

  const cycleSleepTimer = () => {
    if (sleepTimerTime === null) {
      startSleepTimer(15);
    } else if (sleepTimerTime === 15 * 60) {
      startSleepTimer(30);
    } else if (sleepTimerTime === 30 * 60) {
      startSleepTimer(45);
    } else if (sleepTimerTime === 45 * 60) {
      startSleepTimer(60);
    } else {
      cancelSleepTimer();
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0818] text-white flex flex-col overflow-hidden font-sans select-none relative pb-20">
      <audio 
        ref={player.audioRef} 
        src={player.currentTrack?.url} 
        onTimeUpdate={player.onTimeUpdate} 
        onEnded={player.nextTrack}
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

              {/* Mode Segmented Toggle & Quick Actions */}
              <div className="flex items-center gap-2">
                <div className="flex p-1 bg-white/5 backdrop-blur-md rounded-2xl relative border border-white/10 shadow-inner">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('local')}
                    title="Local Files"
                    className={`p-2.5 rounded-xl flex items-center justify-center relative z-10 cursor-pointer transition-all duration-200 ${
                      activeTab === 'local' ? 'text-white' : 'opacity-40 hover:opacity-80 text-white'
                    }`}
                  >
                    <Folder size={16} />
                    {activeTab === 'local' && (
                      <motion.div
                        layoutId="headerActiveTabPill"
                        className="absolute inset-0 bg-gradient-to-r from-[#6355FE] to-[#8E7CFF] rounded-xl -z-10 shadow-lg shadow-[#6355FE]/30"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setActiveTab('online')}
                    title="Online Stream"
                    className={`p-2.5 rounded-xl flex items-center justify-center relative z-10 cursor-pointer transition-all duration-200 ${
                      activeTab === 'online' ? 'text-white' : 'opacity-40 hover:opacity-80 text-white'
                    }`}
                  >
                    <Globe size={16} />
                    {activeTab === 'online' && (
                      <motion.div
                        layoutId="headerActiveTabPill"
                        className="absolute inset-0 bg-gradient-to-r from-[#6355FE] to-[#8E7CFF] rounded-xl -z-10 shadow-lg shadow-[#6355FE]/30"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                </div>

                {activeTab === 'local' && (
                  <>
                    <button 
                      onClick={() => setSortBy(p => p === 'alphabet' ? 'latest' : 'alphabet')} 
                      className="p-3 bg-[#14122B]/80 rounded-2xl border border-white/10 hover:border-[#6355FE]/40 transition-all flex items-center justify-center group cursor-pointer text-[#8F8E9C] hover:text-white"
                      title={sortBy === 'alphabet' ? 'Sort: Alphabetical' : 'Sort: Latest'}
                    >
                      {sortBy === 'alphabet' ? <LayoutGrid size={16} /> : <Clock size={16} />}
                    </button>
                    <button 
                      onClick={() => folderInputRef.current?.click()} 
                      className="p-3 bg-[#6355FE] text-white rounded-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#6355FE]/30 hover:bg-[#7265FF]"
                      title="Import Music Folder"
                    >
                      <FolderPlus size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>



            {activeTab === 'local' ? (
              <div className="space-y-3">
                {/* Local Search Input Area */}
                <div className="relative flex items-center w-full group">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-white group-focus-within:opacity-100 group-focus-within:text-[#8E7CFF] transition-all" />
                  <input 
                    type="text" 
                    placeholder="Search songs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 bg-[#14122B]/70 rounded-2xl text-xs font-bold border border-white/10 focus:bg-[#14122B] focus:border-[#6355FE]/50 focus:shadow-[0_0_20px_rgba(99,85,254,0.15)] transition-all focus:outline-none placeholder:opacity-30 text-white"
                  />
                  {searchQuery && (
                    <button 
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* TABS (Songs vs Folders) */}
                <div className="flex p-1 bg-white/5 rounded-2xl w-full relative border border-white/5">
                  {(['tracks', 'folders'] as const).map(mode => (
                    <button 
                      key={mode}
                      onClick={() => setViewMode(mode)} 
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest relative z-10 cursor-pointer transition-colors duration-200 ${
                        viewMode === mode ? 'text-white' : 'opacity-40 text-white hover:opacity-80'
                      }`}
                    >
                      {mode === 'tracks' ? 'Songs' : 'Folders'}
                      {viewMode === mode && (
                        <motion.div
                          layoutId="localViewModePill"
                          className="absolute inset-0 bg-[#6355FE] rounded-xl -z-10 shadow-md shadow-[#6355FE]/20"
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
                    <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-white group-focus-within:opacity-100 group-focus-within:text-[#8E7CFF] transition-all" />
                    <input 
                      type="text" 
                      placeholder="Search online..."  
                      value={onlineSearchQuery}
                      onChange={(e) => setOnlineSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-10 py-3 bg-[#14122B]/70 rounded-2xl text-xs font-bold border border-white/10 focus:bg-[#14122B] focus:border-[#6355FE]/50 focus:shadow-[0_0_20px_rgba(99,85,254,0.15)] transition-all focus:outline-none placeholder:opacity-30 text-white"
                    />
                    {onlineSearchQuery && (
                      <button 
                        type="button"
                        onClick={() => setOnlineSearchQuery('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
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
                  <div className="flex gap-2 items-center justify-between bg-white/5 p-1 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#8F8E9C] pl-2">Source:</span>
                    <div className="flex p-0.5 bg-white/5 rounded-xl relative">
                      <button
                        type="button"
                        onClick={() => {
                          setOnlineEngine('itunes');
                          fetchOnlineTracks(onlineSearchQuery, 'itunes');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest relative z-10 cursor-pointer transition-colors duration-200 ${
                          onlineEngine === 'itunes' ? 'text-white' : 'opacity-40 text-white'
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
                          onlineEngine === 'audius' ? 'text-white' : 'opacity-40 text-white'
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
                          ? 'bg-[#1C153E] text-[#8E7CFF] border border-[#6355FE]/30 shadow-sm shadow-[#6355FE]/10'
                          : 'bg-[#14122B]/40 opacity-60 hover:opacity-100 text-[#8F8E9C] hover:bg-[#14122B]'
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
                viewMode === 'tracks' ? (
                  filteredTracks.length > 0 ? (
                    filteredTracks.map(track => (
                      <TrackItem 
                        key={track.id} 
                        track={track} 
                        isActive={player.currentTrack?.id === track.id} 
                        isPlaying={player.currentTrack?.id === track.id && player.isPlaying}
                        isFavorite={favoriteTrackIds.includes(track.id)}
                        onClick={() => selectTrack(track)} 
                        onToggleFavorite={() => toggleFavorite(track.id)}
                        onOpenMenu={() => setSelectedTrackForMenu(track)}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                      <Music size={40} />
                      <p className="mt-4 font-bold text-xs tracking-widest uppercase">No local tracks</p>
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
                  />
                ) : null
              ) : (
                /* ONLINE LIST VIEW */
                <div className="space-y-2">
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
        />
      )}

      {/* FAVORITES VIEW */}
      {activeNavTab === 'favorites' && (
        <div className="flex-1 flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease-out]">
          <header className="px-6 pt-10 pb-4 shrink-0">
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none text-white">Favorites</h1>
              <p className="text-[11px] font-extrabold text-[#8E7CFF] uppercase tracking-widest mt-1">High fidelity tracks</p>
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
          onClearCache={async () => {
            if (confirm("Reset cache? This clears locally scanned path keys only.")) {
              await db.tracks.clear();
              setTracks([]);
              alert("Cache cleared successfully!");
            }
          }}
        />
      )}

      {/* Hidden Files inputs */}
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
            initial={{ y: 80, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 80, opacity: 0 }}
            onClick={() => setShowPlayer(true)}
            className="fixed bottom-[96px] left-5 right-5 bg-[#14122B]/95 rounded-[24px] shadow-2xl flex flex-col cursor-pointer z-40 border border-white/10 backdrop-blur-xl overflow-hidden active:scale-[0.99] transition-transform duration-200"
          >
            <div className="flex items-center px-4 pt-3 pb-2">
              <div className="w-12 h-12 rounded-xl overflow-hidden mr-3 shadow-md shrink-0 border border-white/5 relative">
                <img src={player.currentTrack.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0 mr-4 text-left">
                <h4 className="font-extrabold truncate text-[13px] leading-tight text-white">{player.currentTrack.title}</h4>
                <p className="text-[11px] opacity-60 truncate font-bold uppercase tracking-tight mt-0.5 text-[#8E7CFF]">{player.currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => player.togglePlay()}
                  className="w-10 h-10 rounded-full bg-[#6355FE] text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  {player.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                </button>
              </div>
            </div>
            
            {/* Seeker */}
            <div className="px-5 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-black opacity-35 w-8 text-left text-white">{formatTime(player.currentTime)}</span>
                <div className="flex-1 relative flex items-center h-2 group">
                  <div className="absolute left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
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
                <span className="text-[8px] font-black opacity-35 w-8 text-right text-white">{formatTime(player.duration)}</span>
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
            className="fixed inset-0 bg-[#0A0818] z-50 flex flex-col px-8 pb-10 overflow-hidden select-none touch-none"
          >
            {/* Grab / Drag Handle */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full shrink-0 z-20" />

            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#6355FE]/20 to-transparent blur-[120px] scale-125 opacity-30" />
            
            <header className="flex items-center justify-between mt-12 mb-6 shrink-0 z-10">
              <button 
                onClick={() => setShowPlayer(false)} 
                className="p-2.5 -ml-2 rounded-full hover:bg-white/5 active:scale-95 transition-all cursor-pointer text-white"
              >
                <ChevronDown size={20} strokeWidth={3} />
              </button>
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#8E7CFF] mb-1">Now Playing</p>
                <p className="font-extrabold text-[11px] truncate max-w-[180px] opacity-60 text-[#8F8E9C] uppercase tracking-wider">{player.currentTrack.album}</p>
              </div>
              <div className="w-8" />
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
                  <img src={player.currentTrack.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                <h2 className="text-xl font-black tracking-tight leading-snug px-2 line-clamp-1 text-white">{player.currentTrack.title}</h2>
                <p className="text-[13px] text-[#8F8E9C] font-bold opacity-60 uppercase tracking-widest mt-0.5">{player.currentTrack.artist}</p>
              </div>

              {/* Seeker Progress bar */}
              <div className="w-full px-2">
                <ProgressBar 
                  current={player.currentTime} 
                  total={player.duration} 
                  onSeek={(e: any) => player.seek(parseFloat(e.target.value))}
                  formatTime={formatTime}
                />
              </div>

              {/* Main controls */}
              <div className="w-full space-y-6">
                <div className="flex items-center justify-between w-full px-2">
                  <motion.button 
                    onClick={player.toggleShuffle}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 transition-all cursor-pointer ${player.shuffle ? 'text-[#8E7CFF] scale-110' : 'opacity-30 hover:opacity-100 text-white'}`}
                  >
                    <Shuffle size={18} strokeWidth={3} />
                  </motion.button>
                  
                  <div className="flex items-center gap-5">
                    <motion.button 
                      onClick={player.prevTrack} 
                      whileTap={{ scale: 0.85 }} 
                      className="p-2.5 rounded-full hover:bg-white/5 active:scale-90 transition-all text-white cursor-pointer"
                    >
                      <SkipBack size={20} fill="currentColor" />
                    </motion.button>
                    
                    <motion.button 
                      onClick={player.togglePlay}
                      whileTap={{ scale: 0.95 }}
                      className="w-14 h-14 bg-[#6355FE] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#6355FE]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      {player.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
                    </motion.button>
                    
                    <motion.button 
                      onClick={player.nextTrack} 
                      whileTap={{ scale: 0.85 }} 
                      className="p-2.5 rounded-full hover:bg-white/5 active:scale-90 transition-all text-white cursor-pointer"
                    >
                      <SkipForward size={20} fill="currentColor" />
                    </motion.button>
                  </div>

                  <motion.button 
                    onClick={player.toggleRepeat}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 transition-all cursor-pointer ${player.repeatMode !== 'off' ? 'text-[#8E7CFF] scale-110' : 'opacity-30 hover:opacity-100 text-white'}`}
                  >
                    {player.repeatMode === 'one' ? <Repeat1 size={20} strokeWidth={3} /> : <Repeat size={20} strokeWidth={3} />}
                  </motion.button>
                </div>

                <div className="h-[1px] bg-white/5 w-full" />

                {/* Sub-Panel Controls (Favorites, Quick-Add Playlist, Equalizer Presets, Moon Sleep Timer) */}
                <div className="flex items-center justify-around w-full px-2 pt-1">
                  
                  {/* Favorite Toggle */}
                  <motion.button 
                    onClick={() => toggleFavorite(player.currentTrack!.id)}
                    whileTap={{ scale: 0.85 }} 
                    className={`p-3 rounded-full bg-white/5 border border-white/5 transition-all cursor-pointer ${
                      favoriteTrackIds.includes(player.currentTrack!.id) ? 'text-pink-500 scale-110 shadow-lg shadow-pink-500/10' : 'text-[#8F8E9C]/60 hover:text-white'
                    }`}
                    title="Favorite Track"
                  >
                    <Heart size={16} fill={favoriteTrackIds.includes(player.currentTrack!.id) ? "currentColor" : "none"} />
                  </motion.button>

                  {/* Context menu popup redirect triggers (Add to custom Playlists) */}
                  <motion.button 
                    onClick={() => { setSelectedTrackForMenu(player.currentTrack); }}
                    whileTap={{ scale: 0.85 }} 
                    className="p-3 rounded-full bg-white/5 border border-white/5 text-[#8F8E9C]/60 hover:text-white transition-all cursor-pointer"
                    title="Add to Playlist"
                  >
                    <ListMusic size={16} />
                  </motion.button>

                  {/* Equalizer settings */}
                  <motion.button 
                    onClick={cycleEqPreset}
                    whileTap={{ scale: 0.85 }} 
                    className={`p-3 rounded-full bg-white/5 border border-white/5 transition-all cursor-pointer relative group ${
                      currentEqPreset !== 'flat' ? 'text-[#8E7CFF]' : 'text-[#8F8E9C]/60 hover:text-white'
                    }`}
                    title={`Equalizer Setting: ${currentEqPreset}`}
                  >
                    <SlidersHorizontal size={16} />
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-[#8E7CFF] bg-[#14122B] px-1.5 py-0.5 rounded border border-white/5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      Preset: {currentEqPreset}
                    </span>
                  </motion.button>

                  {/* Sleep Timer button */}
                  <div className="flex flex-col items-center">
                    <motion.button 
                      onClick={cycleSleepTimer}
                      whileTap={{ scale: 0.85 }} 
                      className={`p-3 rounded-full bg-white/5 border border-white/5 transition-all cursor-pointer ${
                        sleepTimerTime !== null ? 'text-amber-400 scale-110 shadow-lg shadow-amber-400/10' : 'text-[#8F8E9C]/60 hover:text-white'
                      }`}
                      title="Set Sleep Timer"
                    >
                      <Moon size={16} fill={sleepTimerTime !== null ? "currentColor" : "none"} />
                    </motion.button>
                    {sleepTimerTime !== null && (
                      <span className="text-[8px] font-black text-amber-400 mt-1 uppercase tracking-wider animate-pulse">
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

      {/* Scanning UI - Non-blocking Toast */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed bottom-[180px] right-6 z-[100] w-64 bg-[#14122B] p-5 rounded-3xl shadow-2xl border border-white/10"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#1C153E] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#8E7CFF]" size={20} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="text-[11px] font-black uppercase tracking-widest opacity-45">Scanning</h3>
                <p className="text-[13px] font-bold truncate text-white">Syncing library...</p>
              </div>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#6355FE] to-[#8E7CFF]" 
                  animate={{ width: `${scanProgress}%` }} 
                  transition={{ duration: 0.3 }} 
                />
              </div>
              <div className="flex justify-between text-[8px] font-black opacity-30">
                <span>INDEXING</span>
                <span>{scanProgress}%</span>
              </div>
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
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#0E0B20]/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 z-40">
        {[
          { tab: 'library', icon: Music, label: 'Library' },
          { tab: 'playlists', icon: ListMusic, label: 'Playlists' },
          { tab: 'favorites', icon: Heart, label: 'Favorites' },
          { tab: 'settings', icon: SettingsIcon, label: 'Settings' }
        ].map(({ tab, icon: Icon, label }) => {
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
              <div className={`p-1 rounded-lg transition-all ${
                isActive ? 'text-[#8E7CFF] scale-110' : 'text-[#8F8E9C] group-hover:text-white'
              }`}>
                <Icon size={18} fill={isActive && tab === 'favorites' ? 'currentColor' : 'none'} />
              </div>
              <span className={`text-[8px] font-black uppercase tracking-wider transition-colors ${
                isActive ? 'text-[#8E7CFF]' : 'text-[#8F8E9C]/60 group-hover:text-white'
              }`}>
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="bottomNavGlowIndicator"
                  className="absolute bottom-1 w-5 h-0.5 bg-[#8E7CFF] rounded-full shadow-[0_0_8px_#8E7CFF]"
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
