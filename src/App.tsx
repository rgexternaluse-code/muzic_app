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
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track, FolderNode } from './types';
import { db } from './db';
import * as mm from 'music-metadata-browser';

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
  <div className="flex items-end gap-[3px] h-3.5 w-4 shrink-0 mx-2 pb-[1px]">
    {[...Array(4)].map((_, i) => (
      <motion.span
        key={i}
        className="w-[2.5px] bg-sky-500 rounded-full"
        animate={isPlaying ? {
          height: ["25%", "100%", "25%"]
        } : {
          height: "35%"
        }}
        transition={isPlaying ? {
          duration: 0.5 + i * 0.12,
          repeat: Infinity,
          ease: "easeInOut",
          repeatType: "reverse"
        } : {}}
        style={{
          transformOrigin: "bottom",
          backgroundColor: "var(--m3-primary)"
        }}
      />
    ))}
  </div>
);

const TrackItem = memo(({ track, isActive, isPlaying, onClick }: { track: Track; isActive: boolean; isPlaying?: boolean; onClick: () => void }) => (
  <motion.div 
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
    whileTap={{ scale: 0.99 }}
    className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all duration-300 group ${
      isActive ? 'bg-[var(--m3-primary-container)]' : 'hover:bg-[var(--m3-surface-variant)]'
    }`}
  >
    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--m3-secondary-container)] mr-4 shadow-sm shrink-0 relative">
      <img src={track.cover} alt={track.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      {isActive && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-xs">
          {isPlaying && <div className="w-2.5 h-2.5 bg-[var(--m3-primary)] rounded-full animate-ping" />}
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0 pr-4">
      <h3 className={`text-[15px] font-extrabold truncate leading-tight transition-colors duration-200 ${isActive ? 'text-[var(--m3-on-primary-container)]' : 'text-[var(--m3-on-surface)]'}`}>
        {track.title}
      </h3>
      <p className={`text-[12px] truncate font-bold opacity-60 mt-0.5 transition-colors duration-200 ${isActive ? 'text-[var(--m3-on-primary-container)] opacity-85' : 'text-[var(--m3-on-surface-variant)]'}`}>
        {track.artist}
      </p>
    </div>
    <div className="flex items-center gap-2">
      {isActive && <SoundWaveIndicator isPlaying={isPlaying} />}
      <div className={`text-[10px] font-black opacity-30 group-hover:opacity-60 transition-opacity uppercase tracking-wider ${isActive ? 'text-[var(--m3-on-primary-container)] opacity-80' : ''}`}>
        {track.format || 'STREAM'}
      </div>
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
                onClick={() => onTrackSelect(track)} 
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));

const RecursiveFolderView = ({ node, depth = 0, expandedFolders, toggleFolder, currentTrackId, isPlaying, onTrackSelect }: any) => {
  return (
    <FolderItem 
      node={node}
      depth={depth}
      isExpanded={node.name === 'Root' || expandedFolders.has(node.path)}
      onToggle={toggleFolder}
      currentTrackId={currentTrackId}
      isPlaying={isPlaying}
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

  return (
    <div className="h-screen w-full bg-[var(--m3-surface)] text-[var(--m3-on-surface)] flex flex-col overflow-hidden font-sans select-none">
      <audio 
        ref={player.audioRef} 
        src={player.currentTrack?.url} 
        onTimeUpdate={player.onTimeUpdate} 
        onEnded={player.nextTrack}
      />

      {/* FIXED HEADER */}
      <header className="px-6 pt-10 pb-4 shrink-0 space-y-4">
        {/* TOP LEVEL PILL SWITCHER WITH SLIDING MOMENTUM */}
        <div className="flex p-1 bg-[var(--m3-surface-variant)]/20 rounded-2xl w-full relative">
          <button 
            type="button"
            onClick={() => setActiveTab('local')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 relative z-10 cursor-pointer transition-colors duration-200 ${
              activeTab === 'local' 
              ? 'text-white' 
              : 'opacity-50 hover:opacity-100 text-[var(--m3-on-surface)]'
            }`}
          >
            <Folder size={15} />
            My Device
            {activeTab === 'local' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-[var(--m3-primary)] rounded-xl -z-10 shadow-lg shadow-[var(--m3-primary)]/20"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('online')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 relative z-10 cursor-pointer transition-colors duration-200 ${
              activeTab === 'online' 
              ? 'text-white' 
              : 'opacity-50 hover:opacity-100 text-[var(--m3-on-surface)]'
            }`}
          >
            <Globe size={15} />
            Online Stream
            {activeTab === 'online' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-[var(--m3-primary)] rounded-xl -z-10 shadow-lg shadow-[var(--m3-primary)]/20"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>

        {activeTab === 'local' ? (
          <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none">Muzic</h1>
                <p className="text-[12px] font-bold opacity-30 uppercase tracking-widest mt-1">Local Library</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSortBy(p => p === 'alphabet' ? 'latest' : 'alphabet')} 
                  className={`p-3 bg-[var(--m3-surface-variant)] rounded-xl transition-all flex items-center gap-2 group cursor-pointer`}
                  title={sortBy === 'alphabet' ? 'Sort: Alphabetical' : 'Sort: Latest'}
                >
                  {sortBy === 'alphabet' ? <LayoutGrid size={20} className="group-active:scale-90" /> : <Clock size={20} className="group-active:scale-90" />}
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
                    {sortBy === 'alphabet' ? 'A-Z' : 'Recent'}
                  </span>
                </button>
                <button onClick={() => folderInputRef.current?.click()} className="p-3 bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] rounded-xl hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer">
                  <FolderPlus size={20} />
                </button>
              </div>
            </div>

            {/* Local Search Input Area */}
            <div className="relative flex items-center w-full">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
              <input 
                type="text" 
                placeholder="Search local library..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[var(--m3-surface-variant)]/40 rounded-2xl text-xs font-bold focus:bg-[var(--m3-surface-variant)]/70 transition-all border-none focus:outline-none placeholder:opacity-40"
              />
            </div>

            {/* TABS (FIXED SLIDING PILL) */}
            <div className="flex p-1 bg-[var(--m3-surface-variant)]/20 rounded-2xl w-full relative">
              {(['tracks', 'folders'] as const).map(mode => (
                <button 
                  key={mode}
                  onClick={() => setViewMode(mode)} 
                  className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest relative z-10 cursor-pointer transition-colors duration-200 ${
                    viewMode === mode 
                    ? 'text-white' 
                    : 'opacity-50 hover:opacity-100 text-[var(--m3-on-surface)]'
                  }`}
                >
                  {mode === 'tracks' ? 'Songs' : 'Folders'}
                  {viewMode === mode && (
                    <motion.div
                      layoutId="localViewModePill"
                      className="absolute inset-0 bg-[var(--m3-primary)] rounded-xl -z-10 shadow-md"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none">Muzic</h1>
                <p className="text-[12px] font-bold opacity-30 uppercase tracking-widest mt-1">Free Stream</p>
              </div>
            </div>

            {/* Online Search input line */}
            <form onSubmit={handleOnlineSearchSubmit} className="relative flex items-center gap-2 w-full">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                <input 
                  type="text" 
                  placeholder="Search millions of free streams..." 
                  value={onlineSearchQuery}
                  onChange={(e) => setOnlineSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[var(--m3-surface-variant)]/40 rounded-2xl text-xs font-bold focus:bg-[var(--m3-surface-variant)]/70 transition-all border-none focus:outline-none placeholder:opacity-40"
                />
              </div>
              <button 
                type="submit"
                className="px-5 py-3 bg-[var(--m3-primary)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Stream Engine Selector Slider */}
            <div className="space-y-1.5">
              <div className="flex gap-2 items-center justify-between bg-[var(--m3-surface-variant)]/10 p-2 rounded-xl border border-[var(--m3-primary)]/5">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-40">Source Mode:</span>
                <div className="flex p-0.5 bg-[var(--m3-surface-variant)]/20 rounded-lg relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOnlineEngine('itunes');
                      fetchOnlineTracks(onlineSearchQuery, 'itunes');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest relative z-10 cursor-pointer transition-colors duration-200 ${
                      onlineEngine === 'itunes'
                      ? 'text-white'
                      : 'opacity-50 hover:opacity-100 text-[var(--m3-on-surface)]'
                    }`}
                  >
                    Global Previews (30s)
                    {onlineEngine === 'itunes' && (
                      <motion.div
                        layoutId="streamSourceSelector"
                        className="absolute inset-0 bg-[var(--m3-primary)] rounded-lg -z-10 shadow-sm"
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
                      onlineEngine === 'audius'
                      ? 'text-white'
                      : 'opacity-50 hover:opacity-100 text-[var(--m3-on-surface)]'
                    }`}
                  >
                    Audius Full Tracks
                    {onlineEngine === 'audius' && (
                      <motion.div
                        layoutId="streamSourceSelector"
                        className="absolute inset-0 bg-[var(--m3-primary)] rounded-lg -z-10 shadow-sm"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[9px] font-bold text-center opacity-45 px-1 leading-normal uppercase tracking-wider">
                {onlineEngine === 'itunes' 
                  ? '🎯 Best for Punjabi, Bollywood, Hindi, & English Mainstream hits!' 
                  : '🎸 Best for indie synth, instrumental, lofi, or electronic tracks (Full length)'}
              </p>
            </div>

            {/* Category Tags selection bar */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1 max-w-full pb-1">
              {['trending', 'punjabi', 'hindi', 'bollywood', 'lofi', 'pop', 'electronic', 'rock'].map((tag) => (
                <button
                   key={tag}
                   type="button"
                   onClick={() => {
                     setOnlineSearchQuery(tag === 'trending' ? '' : tag);
                     fetchOnlineTracks(tag === 'trending' ? '' : tag);
                   }}
                   className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shrink-0 ${
                     (tag === 'trending' && onlineSearchQuery === '') || onlineSearchQuery.toLowerCase() === tag
                     ? 'bg-[var(--m3-primary-container)] text-[var(--m3-primary)] font-black border border-[var(--m3-primary)]/10 text-[10px]'
                     : 'bg-[var(--m3-surface-variant)]/40 opacity-65 hover:opacity-100 text-[10px]'
                   }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* SCROLLABLE CONTENT */}
      <main className="flex-1 overflow-y-auto px-6 pb-40">
        <section className="space-y-1">
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
                  <p className="text-[11px] font-bold opacity-60 mt-0.5">Click here to retry permissions so Muzic can index your files.</p>
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
            ) : null
          ) : (
            /* ONLINE LIST VIEW */
            <div className="space-y-2 animate-[fadeIn_0.2s_ease-out]">
              {isOnlineLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <Loader2 size={32} className="animate-spin text-[var(--m3-primary)]" />
                  <p className="text-xs font-black uppercase tracking-widest opacity-40">Loading Streams...</p>
                </div>
              ) : onlineError ? (
                <div className="text-center py-16 px-4 space-y-3">
                  <p className="text-xs font-bold text-red-500 opacity-80">{onlineError}</p>
                  <button 
                    onClick={() => fetchOnlineTracks()}
                    className="px-4 py-2 bg-[var(--m3-primary-container)] text-[var(--m3-primary)] rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer"
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
                    onClick={() => selectOnlineTrack(track)} 
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 bg-[var(--m3-surface-variant)]/10 border border-[var(--m3-primary)]/5 rounded-2xl">
                  <Globe size={40} className="opacity-20 animate-pulse text-[var(--m3-primary)] mb-2" />
                  <p className="font-extrabold text-xs tracking-widest uppercase opacity-60">No Streams Found</p>
                  
                  {onlineSearchQuery && (
                    <div className="mt-4 max-w-sm space-y-3 text-[11px] font-bold opacity-80">
                      <p className="text-[var(--m3-primary)] text-center uppercase tracking-wider">💡 Helpful Search & Spelling Tips:</p>
                      <ul className="text-left list-disc list-neutral space-y-2 font-black bg-[var(--m3-surface-variant)]/30 p-4 rounded-xl border border-[var(--m3-primary)]/10 leading-relaxed uppercase tracking-wider text-[9px]">
                        <li>⚠️ spelling counts! Search engine query is exact. Try <strong className="text-[var(--m3-primary)]">"tuition cheema"</strong> instead of <strong className="text-[var(--m3-primary)]">"tution cheema"</strong>.</li>
                        <li>🎯 Punjabi, Bollywood, Hindi, & commercial hits are best found under <strong className="text-[var(--m3-primary)]">"Global Previews (30s)"</strong> (iTunes mode) due to strict mainstream copyright policies.</li>
                        <li>🎸 Use <strong className="text-[var(--m3-primary)]">"Audius Mode"</strong> mainly for independent music, synthwave, instrumentals, or lofi beats!</li>
                        <li>🔍 Try spelling artist names fully or searching with less words (e.g. <strong className="text-[var(--m3-primary)]">"Cheema Y"</strong>, <strong className="text-[var(--m3-primary)]">"Sidhu Moose"</strong>, <strong className="text-[var(--m3-primary)]">"Dosanjh"</strong> or <strong className="text(--m3-primary)">"Karan Aujla"</strong>).</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setShowPlayer(true)}
            className="fixed bottom-6 left-6 right-6 bg-[var(--m3-primary-container)] rounded-[24px] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.15)] flex flex-col cursor-pointer z-10 border border-white/40 backdrop-blur-xl overflow-hidden active:scale-[0.99] transition-transform duration-200"
          >
            <div className="flex items-center px-4 pt-3 pb-2">
              <div className="w-12 h-12 rounded-xl overflow-hidden mr-3 shadow-lg shrink-0 relative">
                <img src={player.currentTrack.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0 mr-4">
                <h4 className="font-extrabold truncate text-[14px] leading-tight text-[var(--m3-on-primary-container)]">{player.currentTrack.title}</h4>
                <p className="text-[11px] opacity-60 truncate font-bold uppercase tracking-tight mt-0.5 text-[var(--m3-on-primary-container)]">{player.currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); player.togglePlay(); }}
                  className="w-11 h-11 rounded-full bg-[var(--m3-primary)] text-white hover:bg-[var(--m3-primary)]/90 active:scale-90 transition-all flex items-center justify-center shadow-md cursor-pointerp-0"
                >
                  {player.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
              </div>
            </div>
            
            {/* Embedded Premium Mini Seeker */}
            <div className="px-5 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black opacity-35 w-8 text-[var(--m3-on-primary-container)]">{formatTime(player.currentTime)}</span>
                <div className="flex-1 relative flex items-center h-2 group">
                  {/* Progress background line */}
                  <div className="absolute left-0 right-0 h-1 bg-[var(--m3-primary)]/15 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--m3-primary)] rounded-full"
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
                <span className="text-[9px] font-black opacity-35 w-8 text-right text-[var(--m3-on-primary-container)]">{formatTime(player.duration)}</span>
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
              // If swiped down by more than 120px, dismiss player overlay!
              if (info.offset.y > 120) {
                setShowPlayer(false);
              }
            }}
            transition={{ type: 'spring', damping: 38, stiffness: 280, mass: 0.8 }}
            className="fixed inset-0 bg-[var(--m3-surface)] z-50 flex flex-col px-8 pb-10 overflow-hidden select-none touch-none"
          >
            {/* Grab / Drag Handle */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/10 rounded-full shrink-0 z-20" />

            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--m3-primary-container)]/25 to-transparent blur-[120px] scale-125 opacity-40" />
            
            <header className="flex items-center justify-between mt-12 mb-6 shrink-0 z-10">
              <button 
                onClick={() => setShowPlayer(false)} 
                className="p-2.5 -ml-2 rounded-full hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronDown size={22} strokeWidth={3} />
              </button>
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-35 mb-1 text-[var(--m3-primary)]">Focus Studio</p>
                <p className="font-extrabold text-xs truncate max-w-[180px] opacity-75">{player.currentTrack.album}</p>
              </div>
              <div className="w-8" /> {/* Spacer */}
            </header>

            {/* Stop drag propagation inside content box so controls work flawlessly */}
            <div 
              onPointerDownCapture={(e) => e.stopPropagation()} 
              className="flex-1 flex flex-col items-center justify-center space-y-7 max-w-[290px] mx-auto w-full z-10"
            >
              {/* Rotating Vinyl Disc Cover */}
              <div className="relative w-full aspect-square group">
                <motion.div 
                  whileHover={{ scale: 1.015 }}
                  style={{
                    animationPlayState: player.isPlaying ? 'running' : 'paused'
                  }}
                  className="w-full h-full rounded-full overflow-hidden shadow-[0_25px_65px_-12px_rgba(0,0,0,0.35)] ring-10 ring-black/5 relative transition-transform duration-300 vinyl-rotating"
                >
                  <img src={player.currentTrack.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {/* Realistic Vinyl Grooves overlay style */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.15)_65%,rgba(0,0,0,0.35)_100%)] pointer-events-none" />
                  <div className="absolute inset-0 border-[35px] border-black/5 rounded-full pointer-events-none" />
                  {/* Center Core Hole */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--m3-surface)] rounded-full shadow-inner ring-4 ring-black/20" />
                </motion.div>
                
                {/* Tone Arm Vector Art with Soft Spring Rotation Pivot physical detail */}
                <motion.div 
                  className="absolute -top-4 -right-4 w-28 h-40 pointer-events-none origin-top-right z-30"
                  animate={{ rotate: player.isPlaying ? 4 : -22 }}
                  transition={{ type: "spring", stiffness: 90, damping: 14 }}
                >
                  <svg className="w-full h-full drop-shadow-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300" viewBox="0 0 120 180" fill="none">
                    {/* Pivot base hub */}
                    <circle cx="100" cy="20" r="14" fill="currentColor" className="text-[var(--m3-outline)]" />
                    <circle cx="100" cy="20" r="6" fill="currentColor" className="text-[var(--m3-primary)]" />
                    {/* Articulated joint arm */}
                    <path d="M100 20 L80 95 L46 135" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--m3-outline)]" />
                    {/* Stylus head shell */}
                    <rect x="36" y="131" width="16" height="10" rx="2" transform="rotate(-30 43 136)" fill="currentColor" className="text-[var(--m3-outline)]" />
                    {/* Indicator status light pin */}
                    <circle cx="42" cy="137" r="1.5" fill="currentColor" className="text-[var(--m3-primary)] animate-pulse" />
                  </svg>
                </motion.div>
              </div>

              <div className="w-full text-center space-y-1 pt-1">
                <h2 className="text-xl font-black tracking-tight leading-snug px-2 line-clamp-1 text-[var(--m3-on-surface)]">{player.currentTrack.title}</h2>
                <p className="text-[14px] text-[var(--m3-on-surface-variant)] font-bold opacity-50 uppercase tracking-wider">{player.currentTrack.artist}</p>
              </div>

              <div className="w-full space-y-6">
                <div className="flex items-center justify-between w-full px-2">
                  <motion.button 
                    onClick={player.toggleShuffle}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 transition-all cursor-pointer ${player.shuffle ? 'text-[var(--m3-primary)] opacity-100 scale-110' : 'opacity-30 hover:opacity-100'}`}
                  >
                    <Shuffle size={18} strokeWidth={3} />
                  </motion.button>
                  
                  <div className="flex items-center gap-5">
                    <motion.button 
                      onClick={player.prevTrack} 
                      whileTap={{ scale: 0.85 }} 
                      className="p-2.5 rounded-full hover:bg-black/5 active:scale-90 transition-all text-[var(--m3-on-surface)] cursor-pointer"
                    >
                      <SkipBack size={20} fill="currentColor" />
                    </motion.button>
                    
                    <motion.button 
                      onClick={player.togglePlay}
                      whileTap={{ scale: 0.95 }}
                      className="w-14 h-14 bg-[var(--m3-primary)] text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-[var(--m3-primary)]/20 active:scale-95 transition-all cursor-pointer"
                    >
                      {player.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
                    </motion.button>
                    
                    <motion.button 
                      onClick={player.nextTrack} 
                      whileTap={{ scale: 0.85 }} 
                      className="p-2.5 rounded-full hover:bg-black/5 active:scale-90 transition-all text-[var(--m3-on-surface)] cursor-pointer"
                    >
                      <SkipForward size={20} fill="currentColor" />
                    </motion.button>
                  </div>

                  <motion.button 
                    onClick={player.toggleRepeat}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 transition-all cursor-pointer ${player.repeatMode !== 'off' ? 'text-[var(--m3-primary)] opacity-100 scale-110' : 'opacity-30 hover:opacity-100'}`}
                  >
                    {player.repeatMode === 'one' ? <Repeat1 size={20} strokeWidth={3} /> : <Repeat size={20} strokeWidth={3} />}
                  </motion.button>
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
