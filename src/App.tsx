/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo, ChangeEvent, memo } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, FilesystemDirectory } from '@capacitor/filesystem';
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
  Filter,
  Heart,
  ListMusic,
  Volume2,
  Moon,
  MoreVertical
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

const TrackItem = memo(({ track, isActive, onClick }: { track: Track; isActive: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`w-full text-left flex items-center gap-4 p-4 rounded-[28px] transition-all duration-200 ${
      isActive 
        ? 'bg-[linear-gradient(135deg,rgba(99,45,255,0.24),rgba(24,9,79,0.18))] border border-[rgba(141,107,255,0.22)] shadow-[0_24px_80px_-44px_rgba(141,107,255,0.45)]' 
        : 'bg-[rgba(255,255,255,0.02)] border border-white/10 @media(hover:hover):[&:hover]:bg-[rgba(255,255,255,0.06)] @media(hover:hover):[&:hover]:shadow-[0_20px_40px_-30px_rgba(255,255,255,0.12)]'
    }`}
  >
    <div className="w-16 h-16 rounded-[24px] overflow-hidden bg-[var(--m3-secondary-container)] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0">
      <img src={track.cover} alt={track.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`text-sm font-black truncate leading-tight ${isActive ? 'text-[var(--m3-on-primary-container)]' : 'text-white'}`}>
            {track.title}
          </h3>
          <p className={`text-[11px] truncate font-semibold mt-1 ${isActive ? 'text-[var(--m3-on-primary-container)]/80' : 'text-white/60'}`}>
            {track.artist}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] font-black uppercase tracking-[0.28em] ${isActive ? 'text-[var(--m3-primary)]' : 'text-white/50'}`}>{track.format || 'MPEG'}</span>
          <div className="flex items-center gap-2">
            {isActive && (
              <div className="h-8 w-8 rounded-full bg-[var(--m3-primary)] text-white flex items-center justify-center shadow-[0_10px_30px_-18px_rgba(141,107,255,0.9)]">
                <Play size={14} />
              </div>
            )}
            <span className="text-[10px] font-semibold text-white/40">{track.duration ? formatTime(track.duration) : ''}</span>
          </div>
        </div>
      </div>
    </div>
  </button>
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
        className="flex items-center py-3 px-4 @media(hover:hover):[&:hover]:bg-[var(--m3-surface-variant)]/50 @media(hover:hover):[&:hover]:shadow-sm rounded-2xl cursor-pointer transition-[background-color,box-shadow] duration-200 ease-out"
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
          initial={{ height: 0, opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
          animate={{ height: 'auto', opacity: 1, clipPath: 'inset(0 0 0 0)' }}
          exit={{ height: 0, opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
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

const audioExtensions = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'opus', 'webm'];

const isAudioFile = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return audioExtensions.includes(ext);
};

const getExternalFileUri = async (path: string): Promise<string | undefined> => {
  try {
    const result = await Filesystem.getUri({
      directory: FilesystemDirectory.External,
      path,
    });
    return Capacitor.convertFileSrc(result.uri);
  } catch (e) {
    console.error('Could not resolve external file URI for', path, e);
    return undefined;
  }
};

const scanDirectoryRecursive = async (basePath: string, trackFolder: string, found: Track[]) => {
  try {
    const dir = await Filesystem.readdir({
      directory: FilesystemDirectory.External,
      path: basePath,
    });

    for (const name of dir.files) {
      if (name.startsWith('.')) continue;
      const itemPath = basePath ? `${basePath}/${name}` : name;
      const stat = await Filesystem.stat({
        directory: FilesystemDirectory.External,
        path: itemPath,
      }).catch(() => null);

      const isDir = stat?.type === 'directory' || stat?.type === 'dir';
      if (isDir) {
        await scanDirectoryRecursive(itemPath, trackFolder, found);
        continue;
      }

      if (!isAudioFile(name)) continue;

      const uri = await getExternalFileUri(itemPath);
      if (!uri) continue;

      found.push({
        id: btoa(`${itemPath}-${stat?.size ?? 0}`).substring(0, 16),
        title: name.replace(/\.[^/.]+$/, ''),
        artist: 'Local Audio',
        album: trackFolder || 'Device Music',
        duration: 0,
        url: uri,
        format: name.split('.').pop()?.toUpperCase() || 'MP3',
        cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200',
        folderPath: trackFolder || basePath || 'Device',
        fileName: name,
        size: stat?.size ?? 0,
      });
    }
  } catch (e) {
    console.warn('Failed to scan directory', basePath, e);
  }
};

const scanDeviceMusic = async (setTracks: React.Dispatch<React.SetStateAction<Track[]>>, setIsScanning: React.Dispatch<React.SetStateAction<boolean>>, setScanProgress: React.Dispatch<React.SetStateAction<number>>, setViewMode: React.Dispatch<React.SetStateAction<'tracks' | 'folders'>>,) => {
  setIsScanning(true);
  setScanProgress(0);

  const folders = ['Music', 'Download', 'Documents', 'DCIM'];
  const found: Track[] = [];

  for (let i = 0; i < folders.length; i++) {
    await scanDirectoryRecursive(folders[i], folders[i], found);
    setScanProgress(Math.round(((i + 1) / folders.length) * 100));
  }

  setIsScanning(false);

  if (found.length > 0) {
    setTracks(found);
    setViewMode('folders');
  }
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
      className="w-full h-2 bg-[var(--m3-surface-variant)]/50 rounded-full appearance-none cursor-pointer accent-[var(--m3-primary)] @media(hover:hover):[&:hover]:h-2.5 transition-[height] duration-200 ease-out [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[var(--m3-primary)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:@media(hover:hover):[&::-webkit-slider-thumb:hover]:shadow-xl"
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
  const [libraryTab, setLibraryTab] = useState<'songs' | 'artists' | 'albums' | 'folders'>('songs');
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
        album: track.album || 'Track',
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
    <div className="app-shell h-screen w-full text-[var(--m3-on-surface)] flex flex-col overflow-hidden font-sans select-none">
      <audio 
        ref={player.audioRef} 
        src={player.currentTrack?.url} 
        onTimeUpdate={player.onTimeUpdate} 
        onEnded={player.nextTrack}
      />

      {/* FIXED HEADER */}
      <header className="px-6 pt-5 pb-4 shrink-0">
        <div className="surface-panel rounded-[36px] p-5 border border-white/10 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex rounded-full bg-[rgba(255,255,255,0.05)] border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              <button
                type="button"
                onClick={() => setActiveTab('local')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full transition duration-200 ${
                  activeTab === 'local'
                    ? 'bg-[linear-gradient(135deg,rgba(115,73,255,0.95),rgba(92,118,255,0.95))] text-white shadow-[0_22px_70px_-40px_rgba(92,118,255,0.7)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Folder size={14} className={activeTab === 'local' ? 'text-white' : 'text-white/70'} />
                <span className="text-[10px] font-black uppercase tracking-[0.32em]">My Device</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('online')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full transition duration-200 ${
                  activeTab === 'online'
                    ? 'bg-[linear-gradient(135deg,rgba(115,73,255,0.95),rgba(92,118,255,0.95))] text-white shadow-[0_22px_70px_-40px_rgba(92,118,255,0.7)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Globe size={14} className={activeTab === 'online' ? 'text-white' : 'text-white/70'} />
                <span className="text-[10px] font-black uppercase tracking-[0.32em]">Online Stream</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button className="h-12 w-12 rounded-3xl bg-[rgba(255,255,255,0.06)] border border-white/10 flex items-center justify-center text-white/60 transition hover:text-white hover:bg-[rgba(255,255,255,0.14)]">
                <LayoutGrid size={18} />
              </button>
              <button onClick={() => folderInputRef.current?.click()} className="h-12 w-12 rounded-3xl bg-[rgba(255,255,255,0.06)] border border-white/10 flex items-center justify-center text-white/60 transition hover:text-white hover:bg-[rgba(255,255,255,0.14)]">
                <FolderPlus size={18} />
              </button>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">
              {activeTab === 'local' ? 'Local Library' : 'Free Stream'}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] items-center">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input 
                type="search" 
                placeholder={activeTab === 'local' ? 'Search in your library...' : 'Search millions of streams...'}
                value={activeTab === 'local' ? searchQuery : onlineSearchQuery}
                onChange={(e) => activeTab === 'local' ? setSearchQuery(e.target.value) : setOnlineSearchQuery(e.target.value)}
                className="w-full pl-12 pr-14 py-4 rounded-[28px] bg-[rgba(255,255,255,0.05)] border border-white/10 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-[var(--m3-primary-container)]/60 focus:ring-2 focus:ring-[var(--m3-primary-container)]/20 transition duration-200"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-[rgba(255,255,255,0.08)] border border-white/10 text-white/70 flex items-center justify-center transition hover:bg-[rgba(141,107,255,0.18)] hover:text-white"
              >
                <Filter size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSortBy((prev) => (prev === 'alphabet' ? 'latest' : 'alphabet'))}
              className="h-14 rounded-[24px] bg-[rgba(255,255,255,0.08)] border border-white/10 text-white/60 px-5 text-[11px] font-black uppercase tracking-[0.3em] transition hover:text-white hover:bg-[rgba(255,255,255,0.14)]"
            >
              {sortBy === 'alphabet' ? 'Recent' : 'A-Z'}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(['songs', 'artists', 'albums', 'folders'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setLibraryTab(tab);
                  if (tab === 'folders') {
                    setViewMode('folders');
                  } else {
                    setViewMode('tracks');
                  }
                }}
                className={`rounded-full px-4 py-3 text-[11px] font-black uppercase tracking-[0.32em] transition duration-200 ${
                  libraryTab === tab
                    ? 'bg-[var(--m3-primary)] text-white shadow-[0_18px_50px_-28px_rgba(141,107,255,0.75)]'
                    : 'bg-[rgba(255,255,255,0.04)] text-white/60 hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                {tab === 'songs' ? 'Songs' : tab === 'artists' ? 'Artists' : tab === 'albums' ? 'Albums' : 'Folders'}
              </button>
            ))}
          </div>

          {activeTab === 'online' && (
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5 surface-panel p-3 rounded-[28px] border border-white/10 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)]">
                <div className="flex gap-2 items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-50">Source Mode:</span>
                  <div className="flex p-0.5 bg-white/5 rounded-3xl">
                    <button
                      type="button"
                      onClick={() => {
                        setOnlineEngine('itunes');
                        fetchOnlineTracks(onlineSearchQuery, 'itunes');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition duration-150 ease-out cursor-pointer ${
                        onlineEngine === 'itunes'
                          ? 'bg-[var(--m3-primary)] text-white shadow-[0_18px_40px_-20px_rgba(141,107,255,0.8)]'
                          : 'opacity-40 @media(hover:hover):[&:hover]:opacity-100 @media(hover:hover):[&:hover]:scale-[1.02]'
                      }`}
                    >
                      Global Previews
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOnlineEngine('audius');
                        fetchOnlineTracks(onlineSearchQuery, 'audius');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition duration-150 ease-out cursor-pointer ${
                        onlineEngine === 'audius'
                          ? 'bg-[var(--m3-primary)] text-white shadow-[0_18px_40px_-20px_rgba(141,107,255,0.8)]'
                          : 'opacity-40 @media(hover:hover):[&:hover]:opacity-100 @media(hover:hover):[&:hover]:scale-[1.02]'
                      }`}
                    >
                      Audius Full Tracks
                    </button>
                  </div>
                </div>
                <p className="text-[9px] font-bold text-center opacity-45 px-1 leading-normal uppercase tracking-wider">
                  {onlineEngine === 'itunes'
                    ? '🎯 Best for Punjabi, Bollywood, Hindi, & English Mainstream hits!'
                    : '🎸 Best for independent synth, instrumental, lofi, or electronic tracks'
                  }
                </p>
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1 max-w-full pb-1">
                {['trending', 'punjabi', 'hindi', 'bollywood', 'lofi', 'pop', 'electronic', 'rock'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setOnlineSearchQuery(tag === 'trending' ? '' : tag);
                      fetchOnlineTracks(tag === 'trending' ? '' : tag);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition duration-150 ease-out cursor-pointer shrink-0 ${
                      (tag === 'trending' && onlineSearchQuery === '') || onlineSearchQuery.toLowerCase() === tag
                        ? 'bg-[var(--m3-primary-container)] text-[var(--m3-primary)] font-black border border-[var(--m3-primary)]/20 shadow-sm'
                        : 'bg-white/8 opacity-65 @media(hover:hover):[&:hover]:opacity-100 @media(hover:hover):[&:hover]:scale-[1.02]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* SCROLLABLE CONTENT */}
      <main className="flex-1 overflow-y-auto px-6 pb-40">
        <section className="space-y-1">
          {permissionStatus === 'denied' && activeTab === 'local' && (
            <div 
              onClick={requestPermission}
              className="mb-4 p-4 bg-white/8 border border-white/10 rounded-[26px] flex items-center justify-between gap-3 cursor-pointer @media(hover:hover):[&:hover]:bg-white/12 active:scale-[0.98] transition-[background-color,transform,box-shadow] duration-180 ease-out shadow-[0_20px_50px_-30px_rgba(0,0,0,0.45)] group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                  <Music size={16} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Storage Permission Denied</p>
                  <p className="text-[11px] font-bold opacity-60 mt-0.5">Click here to retry permissions so the app can index your files.</p>
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
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
                  <Music size={48} className="text-[var(--m3-primary)]" />
                  <p className="mt-4 font-black text-sm tracking-widest uppercase text-[var(--m3-on-surface)]">No tracks found</p>
                  <p className="mt-2 text-[10px] opacity-50 max-w-[280px] leading-relaxed">Import your music or scan device storage to instantly fill this premium playlist.</p>
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
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            onClick={() => setShowPlayer(true)}
            className="fixed bottom-6 left-6 right-6 bg-white/8 rounded-[28px] shadow-[0_40px_120px_-45px_rgba(0,0,0,0.7)] flex flex-col cursor-pointer z-10 border border-white/10 backdrop-blur-3xl overflow-hidden"
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
                  className="w-11 h-11 rounded-full bg-[var(--m3-surface-variant)]/15 @media(hover:hover):[&:hover]:bg-[var(--m3-surface-variant)]/25 active:scale-95 transition-[background-color,transform,box-shadow] duration-150 ease-out flex items-center justify-center p-0 shadow-sm"
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
                    className="w-full h-1 bg-white/15 rounded-full appearance-none cursor-pointer accent-[var(--m3-primary)] @media(hover:hover):[&:hover]:h-1.5 transition-[height,background-color] duration-150 ease-out"
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
            className="fixed inset-0 bg-[#07050f] z-50 flex flex-col px-6 pb-10 overflow-hidden select-none"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(115,73,255,0.18),transparent_30%),radial-gradient(circle_at_bottom,_rgba(59,53,255,0.15),transparent_35%),linear-gradient(180deg,rgba(7,5,15,0.95),rgba(4,2,9,0.95))] pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle,rgba(115,73,255,0.16),transparent_40%)] blur-3xl opacity-70" />

            <header className="flex items-center justify-between mt-8 mb-6">
              <button onClick={() => setShowPlayer(false)} className="p-3 rounded-full bg-white/5 border border-white/10 text-white/70 transition duration-150 ease-out @media(hover:hover):hover:bg-white/10 active:scale-95">
                <ChevronDown size={22} strokeWidth={3} />
              </button>

              <div className="flex flex-col items-center gap-2">
                <p className="text-[9px] uppercase tracking-[0.32em] text-white/40">playing from</p>
                <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/90">My Device</span>
              </div>

              <button type="button" className="p-3 rounded-full bg-white/5 border border-white/10 text-white/70 transition duration-150 ease-out @media(hover:hover):hover:bg-white/10 active:scale-95">
                <MoreVertical size={20} />
              </button>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center space-y-6 max-w-[320px] mx-auto w-full">
              {/* Rotating Vinyl Disc */}
              <div className="relative w-full aspect-square max-w-[320px] group">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(115,73,255,0.18),transparent_45%)] blur-2xl opacity-80" />
                <div className="absolute inset-6 rounded-full border border-white/10 shadow-[0_0_80px_-20px_rgba(115,73,255,0.75)]" />

                <motion.div 
                  animate={{ rotate: player.isPlaying ? 360 : 0 }}
                  transition={{ 
                    duration: 6, 
                    repeat: Infinity, 
                    ease: 'linear',
                    repeatType: 'loop'
                  }}
                  className="relative w-full h-full rounded-full overflow-hidden shadow-[0_30px_90px_-30px_rgba(57,38,255,0.55)] border border-white/10 bg-black/20"
                >
                  <img src={player.currentTrack.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.25)_60%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
                  <div className="absolute inset-0 border-[12px] border-white/10 rounded-full pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-[#09050f] rounded-full shadow-inner ring ring-white/10" />
                </motion.div>
              </div>

              <div className="w-full text-center space-y-1 pt-2">
                <h2 className="text-2xl font-black tracking-tight leading-tight px-2 line-clamp-1 text-white">{player.currentTrack.title}</h2>
                <p className="text-sm text-white/50 font-medium">{player.currentTrack.artist}</p>
              </div>

              <div className="w-full space-y-6">
                <div className="flex items-center justify-between w-full px-2">
                  <button 
                    onClick={player.toggleShuffle}
                    className={`p-3 rounded-2xl transition-all duration-150 ${player.shuffle ? 'bg-white/10 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                  >
                    <Shuffle size={20} strokeWidth={3} />
                  </button>
                  
                  <div className="flex items-center gap-5">
                    <button onClick={player.prevTrack} className="p-3 rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 active:scale-95 transition duration-150">
                      <SkipBack size={22} fill="currentColor" />
                    </button>
                    <button 
                      onClick={player.togglePlay}
                      className="w-16 h-16 rounded-3xl bg-[#6b46ff] text-white flex items-center justify-center shadow-[0_24px_64px_-28px_rgba(107,70,255,0.8)] transition duration-150 ease-out active:scale-95"
                    >
                      {player.isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button onClick={player.nextTrack} className="p-3 rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 active:scale-95 transition duration-150">
                      <SkipForward size={22} fill="currentColor" />
                    </button>
                  </div>

                  <button 
                    onClick={player.toggleRepeat}
                    className={`p-3 rounded-2xl transition-all duration-150 ${player.repeatMode !== 'off' ? 'bg-white/10 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
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
              <div className="mt-6 flex items-center justify-between px-6 text-white/50">
                <button type="button" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition duration-150 active:scale-95">
                  <Heart size={16} />
                </button>
                <button type="button" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition duration-150 active:scale-95">
                  <ListMusic size={16} />
                </button>
                <button type="button" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition duration-150 active:scale-95">
                  <Volume2 size={16} />
                </button>
                <button type="button" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition duration-150 active:scale-95">
                  <Moon size={16} />
                </button>
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
                    This app needs storage permission to scan the folders on your device and populate your offline music library seamlessly.
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
