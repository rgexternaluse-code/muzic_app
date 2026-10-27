/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Download, 
  Sliders, 
  Music, 
  FolderPlus, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Crown, 
  FileAudio, 
  Loader2,
  Disc3,
  Layers,
  Radio,
  Upload,
  ShieldCheck,
  Lock,
  FileText,
  Type,
  Edit3
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { BUILTIN_INSTRUMENTAL_CATALOG, generateProceduralBackingTrackAudio } from '../data/instrumentals';
import { studioEngine } from '../services/audioStudioEngine';
import { subscriptionService } from '../services/subscriptionService';
import { InstrumentalTrack, StudioMixerSettings, CombinedMixResult } from '../types/studio';
import { Track } from '../types';
import { VocalSeparationModal } from './VocalSeparationModal';
import { SubscriptionModal } from './SubscriptionModal';
import { GoogleVerificationModal } from './GoogleVerificationModal';
import { MicrophonePermissionModal } from './MicrophonePermissionModal';
import { KaraokeLyricsView } from './KaraokeLyricsView';
import { TUM_HI_HO_KARAOKE_DATA, LUTT_LE_GAYA_KARAOKE_DATA, parseLrcOrTextToKaraoke, SongKaraokeTiming } from '../data/karaokeTimings';
import { extractClientSideKaraokeAudio } from '../services/vocalSeparationService';
import { fetchLyricsForUploadedAudio } from '../services/lyricsService';
import { useAuth } from '../context/AuthContext';
import { recordCloudStudioUpload } from '../services/firebase';

interface SingingStudioViewProps {
  libraryTracks: Track[];
  onBackToLibrary: () => void;
  onPauseMainPlayer: () => void;
  onShowToast: (message: string, icon?: React.ReactNode, subtitle?: string) => void;
  theme?: 'dark' | 'light';
}

export function SingingStudioView({
  libraryTracks,
  onBackToLibrary,
  onPauseMainPlayer,
  onShowToast,
  theme = 'dark'
}: SingingStudioViewProps) {
  // Track Selection Source: Built-in Catalog vs Device Audio
  const [sourceTab, setSourceTab] = useState<'builtin' | 'device'>('builtin');
  const [selectedBuiltinTrack, setSelectedBuiltinTrack] = useState<InstrumentalTrack>(BUILTIN_INSTRUMENTAL_CATALOG[0]);
  
  // Custom audio file from device
  const [customDeviceTrack, setCustomDeviceTrack] = useState<{
    title: string;
    artist: string;
    url: string;
    blob?: Blob;
    duration: number;
  } | null>(null);

  // Custom Karaoke & Lyrics state for uploaded audio files
  const [customKaraokeData, setCustomKaraokeData] = useState<SongKaraokeTiming | null>(null);
  const [customLyricsText, setCustomLyricsText] = useState<string>('');
  const [isLyricsEditorOpen, setIsLyricsEditorOpen] = useState<boolean>(false);
  const [tempLyricsDraft, setTempLyricsDraft] = useState<string>('');
  const lyricsFileInputRef = useRef<HTMLInputElement>(null);

  // Client-Side DSP AI Karaoke Extraction State
  const [isExtractingKaraoke, setIsExtractingKaraoke] = useState(false);
  const [isKaraokeExtracted, setIsKaraokeExtracted] = useState(false);

  // Audio blob cache for procedural synthesis
  const [synthesizedAudioUrls, setSynthesizedAudioUrls] = useState<Record<string, string>>({});
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Backing Track Preview Player State
  const [isBackingPreviewPlaying, setIsBackingPreviewPlaying] = useState(false);
  const [backingCurrentTime, setBackingCurrentTime] = useState(0);
  const backingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const [vuLevel, setVuLevel] = useState(0); // 0.0 to 1.0 for live VU visualizer meter
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  // Microphone Permission Modal State (Explicit check before singing)
  const [isMicPermissionModalOpen, setIsMicPermissionModalOpen] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [micModalError, setMicModalError] = useState<string | null>(null);
  const [hasMicPermissionGranted, setHasMicPermissionGranted] = useState(false);

  // Recorded Take Data
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState<Blob | null>(null);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string | null>(null);

  // Mixer Settings (Backing Volume 0% - 150%, Voice Volume 0% - 150%)
  const [mixerSettings, setMixerSettings] = useState<StudioMixerSettings>({
    backingVolume: 0.8,
    voiceVolume: 1.0,
    reverbAmount: 0.15,
    voiceDelayMs: 0
  });

  // Combined Preview Player State
  const [isCombinedPreviewPlaying, setIsCombinedPreviewPlaying] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportResult, setLastExportResult] = useState<CombinedMixResult | null>(null);

  // Modals
  const [isVocalSepModalOpen, setIsVocalSepModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isGoogleAuthModalOpen, setIsGoogleAuthModalOpen] = useState(false);

  // Authentication & Verification
  const { currentUser, isVerified } = useAuth();

  // Admin Mode Active Check (Full-fledge studio access unlocked)
  const [isAdminMode] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('muzic_admin_mode') === 'true';
    } catch {
      return false;
    }
  });

  // When admin mode is active, user has full verified and unlocked privileges
  const effectiveIsVerified = isVerified || isAdminMode;

  // Demo mode state for unverified creators (1 free demo take)
  const [hasCompletedDemo, setHasCompletedDemo] = useState<boolean>(() => {
    try {
      return localStorage.getItem('muzic_studio_demo_completed') === 'true';
    } catch {
      return false;
    }
  });

  // Karaoke Lyrics Teleprompter state
  const [isLyricsOpen, setIsLyricsOpen] = useState(true);

  const [authModalContext, setAuthModalContext] = useState<{
    title?: string;
    subtitle?: string;
    reason?: string;
  }>({});

  // Monthly phone upload quota state
  const [uploadQuota, setUploadQuota] = useState(subscriptionService.getLocalUploadQuota());

  const localFileInputRef = useRef<HTMLInputElement>(null);

  // Sync quota with subscription entitlements changes
  useEffect(() => {
    const unsub = subscriptionService.subscribeToEntitlements(() => {
      setUploadQuota(subscriptionService.getLocalUploadQuota());
    });
    return unsub;
  }, []);

  // Stop main player when opening Studio to prevent overlapping audio
  useEffect(() => {
    onPauseMainPlayer();
  }, [onPauseMainPlayer]);

  // Check initial microphone permission state if query API is supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' as any })
        .then((perm) => {
          if (perm.state === 'granted') {
            setHasMicPermissionGranted(true);
            setMicPermissionDenied(false);
          } else if (perm.state === 'denied') {
            setMicPermissionDenied(true);
          }
          perm.onchange = () => {
            setHasMicPermissionGranted(perm.state === 'granted');
            if (perm.state === 'granted') setMicPermissionDenied(false);
          };
        })
        .catch(() => {});
    }
  }, []);

  // Clean up recording timer and audio URLs on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      studioEngine.stopPreview();
      if (backingAudioRef.current) {
        backingAudioRef.current.pause();
        backingAudioRef.current = null;
      }
      if (recordedVoiceUrl) {
        URL.revokeObjectURL(recordedVoiceUrl);
      }
      Object.values(synthesizedAudioUrls).forEach(url => {
        if (typeof url === 'string') URL.revokeObjectURL(url);
      });
    };
  }, [recordedVoiceUrl, synthesizedAudioUrls]);

  // Resolve current active backing audio URL
  const getActiveBackingUrl = useCallback(async (): Promise<string> => {
    if (sourceTab === 'device' && customDeviceTrack) {
      return customDeviceTrack.url;
    }

    // Direct pre-bundled audio asset (like Tum Hi Ho karaoke demo mp3)
    if (selectedBuiltinTrack.previewUrl) {
      return selectedBuiltinTrack.previewUrl;
    }

    const trackId = selectedBuiltinTrack.id;
    if (synthesizedAudioUrls[trackId]) {
      return synthesizedAudioUrls[trackId];
    }

    // Synthesize on the fly
    setIsSynthesizing(true);
    try {
      const blob = await generateProceduralBackingTrackAudio(selectedBuiltinTrack.category, 60);
      const url = URL.createObjectURL(blob);
      setSynthesizedAudioUrls(prev => ({ ...prev, [trackId]: url }));
      return url;
    } finally {
      setIsSynthesizing(false);
    }
  }, [sourceTab, customDeviceTrack, selectedBuiltinTrack, synthesizedAudioUrls]);

  // Handle Backing Track Preview Play/Pause
  const toggleBackingPreview = async () => {
    onPauseMainPlayer();

    if (isBackingPreviewPlaying) {
      backingAudioRef.current?.pause();
      setIsBackingPreviewPlaying(false);
      return;
    }

    try {
      const url = await getActiveBackingUrl();
      if (!backingAudioRef.current) {
        backingAudioRef.current = new Audio(url);
        backingAudioRef.current.ontimeupdate = () => {
          if (backingAudioRef.current) {
            setBackingCurrentTime(backingAudioRef.current.currentTime);
          }
        };
        backingAudioRef.current.onended = () => {
          setIsBackingPreviewPlaying(false);
          setBackingCurrentTime(0);
        };
      } else {
        if (backingAudioRef.current.src !== url) {
          backingAudioRef.current.src = url;
        }
      }

      backingAudioRef.current.volume = mixerSettings.backingVolume;
      await backingAudioRef.current.play();
      setIsBackingPreviewPlaying(true);
    } catch (err: any) {
      onShowToast('Could not preview backing track: ' + (err.message || 'Error'), <AlertCircle size={16} className="text-red-400" />);
    }
  };

  // Backing track seek
  const handleBackingSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setBackingCurrentTime(time);
    if (backingAudioRef.current) {
      backingAudioRef.current.currentTime = time;
    }
  };

  const handleBackingSeekTo = (seconds: number) => {
    if (isRecording) return;
    setBackingCurrentTime(seconds);
    if (backingAudioRef.current) {
      backingAudioRef.current.currentTime = seconds;
    }
  };

  // Switch built-in track
  const handleSelectBuiltin = (track: InstrumentalTrack) => {
    if (backingAudioRef.current) {
      backingAudioRef.current.pause();
      setIsBackingPreviewPlaying(false);
      setBackingCurrentTime(0);
      backingAudioRef.current = null;
    }
    setSelectedBuiltinTrack(track);
    // Reset recorded take when changing song
    handleDiscardTake();
  };

  // Select Device Audio File
  const handlePickDeviceAudio = async () => {
    // 1. Check Google verification (Bypassed if Admin Mode)
    if (!effectiveIsVerified) {
      onShowToast(
        'Google 1-Tap verification required to import phone audio into Singing Studio.',
        <ShieldCheck size={16} className="text-[#8E7CFF]" />
      );
      setIsGoogleAuthModalOpen(true);
      return;
    }

    // 2. Check quota before initiating picker (Bypassed if Admin Mode)
    if (!isAdminMode && !subscriptionService.canUploadLocalTrack()) {
      const quota = subscriptionService.getLocalUploadQuota();
      onShowToast(
        `Monthly studio upload limit reached (${quota.used}/${quota.limit}). Upgrade to import more songs.`,
        <AlertCircle size={16} className="text-amber-400" />
      );
      setIsSubscriptionModalOpen(true);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickFiles({
          types: ['audio/*', 'public.audio'],
          readData: false
        });
        if (result.files && result.files.length > 0) {
          const file = result.files[0];
          let pathOrUrl = '';
          if (file.path) {
            pathOrUrl = Capacitor.convertFileSrc(file.path);
          } else if (file.blob) {
            pathOrUrl = URL.createObjectURL(file.blob);
          }
          const rec = subscriptionService.recordLocalUpload();
          setUploadQuota({ used: rec.used, limit: rec.limit, remaining: rec.remaining });

          if (currentUser) {
            const month = new Date().toISOString().slice(0, 7);
            recordCloudStudioUpload(currentUser.uid, month).catch(err => {
              console.warn('Background Firestore quota sync deferred:', err);
            });
          }

          setCustomDeviceTrack({
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: 'Device Audio',
            url: pathOrUrl,
            duration: 180
          });
          setSourceTab('device');
          handleDiscardTake();
          onShowToast(
            `Selected "${file.name}" (${rec.remaining} imports left this month)`,
            <Music size={16} className="text-[#8E7CFF]" />
          );
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('canceled')) {
          onShowToast('File picker error: ' + err.message, <AlertCircle size={16} className="text-red-400" />);
        }
      }
    } else {
      localFileInputRef.current?.click();
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!effectiveIsVerified) {
        onShowToast(
          'Google 1-Tap verification required to import phone audio into Singing Studio.',
          <ShieldCheck size={16} className="text-[#8E7CFF]" />
        );
        if (e.target) e.target.value = '';
        setIsGoogleAuthModalOpen(true);
        return;
      }

      if (!isAdminMode && !subscriptionService.canUploadLocalTrack()) {
        const quota = subscriptionService.getLocalUploadQuota();
        onShowToast(
          `Monthly studio upload limit reached (${quota.used}/${quota.limit}). Upgrade to import more songs.`,
          <AlertCircle size={16} className="text-amber-400" />
        );
        if (e.target) e.target.value = '';
        setIsSubscriptionModalOpen(true);
        return;
      }

      const rec = subscriptionService.recordLocalUpload();
      setUploadQuota({ used: rec.used, limit: rec.limit, remaining: rec.remaining });

      if (currentUser) {
        const month = new Date().toISOString().slice(0, 7);
        recordCloudStudioUpload(currentUser.uid, month).catch(err => {
          console.warn('Background Firestore quota sync deferred:', err);
        });
      }

      const url = URL.createObjectURL(file);
      const cleanTrackName = file.name.replace(/\.[^/.]+$/, '');

      // Reset previous song's lyrics to avoid showing stale data
      setCustomLyricsText('');
      setCustomKaraokeData(null);
      setIsKaraokeExtracted(false);

      const audioProbe = new Audio(url);
      audioProbe.onloadedmetadata = async () => {
        const detected = (audioProbe.duration && !isNaN(audioProbe.duration)) ? Math.round(audioProbe.duration) : 180;
        setCustomDeviceTrack(prev => prev ? { ...prev, duration: detected } : null);

        // Fetch and synchronize real lyrics for this uploaded song
        try {
          const lyricsRes = await fetchLyricsForUploadedAudio(file.name, 'Local Backing Track', detected);
          setCustomLyricsText(lyricsRes.lyricsText);
          setCustomKaraokeData(lyricsRes.karaokeData);
          setIsLyricsOpen(true);
        } catch (err) {
          console.warn('Initial lyrics lookup deferred:', err);
        }
      };

      setCustomDeviceTrack({
        title: cleanTrackName,
        artist: 'Local Backing Track',
        url,
        blob: file,
        duration: 180
      });
      setSourceTab('device');
      handleDiscardTake();
      onShowToast(
        `Loaded "${file.name}" (${rec.remaining} imports left this month)`,
        <Music size={16} className="text-[#8E7CFF]" />
      );

      // Pre-fetch lyrics immediately
      fetchLyricsForUploadedAudio(file.name, 'Local Backing Track', 180).then(lyricsRes => {
        setCustomLyricsText(lyricsRes.lyricsText);
        setCustomKaraokeData(lyricsRes.karaokeData);
        setIsLyricsOpen(true);
      }).catch(err => {
        console.warn('Immediate lyrics fetch deferred:', err);
      });
      if (e.target) e.target.value = '';
    }
  };

  // Handle uploading lyrics (.lrc or .txt) for custom phone audio
  const handleLyricsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      setCustomLyricsText(text);
      setTempLyricsDraft(text);
      const trackTitle = customDeviceTrack?.title || 'Custom Track';
      const trackArtist = customDeviceTrack?.artist || 'Local Backing Track';
      const duration = customDeviceTrack?.duration || 180;
      const parsed = parseLrcOrTextToKaraoke(duration, trackTitle, trackArtist, text);
      setCustomKaraokeData(parsed);
      onShowToast(
        `Synchronized ${parsed.lines.length} karaoke lines!`,
        <Sparkles size={16} className="text-amber-400" />,
        file.name.endsWith('.lrc') ? 'LRC timestamps parsed' : 'Auto-timed to song duration'
      );
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleApplyLyricsText = () => {
    if (!tempLyricsDraft.trim()) {
      setCustomLyricsText('');
      setCustomKaraokeData(null);
      setIsLyricsEditorOpen(false);
      onShowToast('Cleared lyrics.');
      return;
    }
    setCustomLyricsText(tempLyricsDraft);
    const trackTitle = customDeviceTrack?.title || 'Custom Track';
    const trackArtist = customDeviceTrack?.artist || 'Local Backing Track';
    const duration = customDeviceTrack?.duration || 180;
    const parsed = parseLrcOrTextToKaraoke(duration, trackTitle, trackArtist, tempLyricsDraft);
    setCustomKaraokeData(parsed);
    setIsLyricsEditorOpen(false);
    onShowToast(
      `Synchronized ${parsed.lines.length} karaoke lines!`,
      <Sparkles size={16} className="text-amber-400" />
    );
  };

  // Client-Side DSP AI Karaoke Vocal Extraction Handler
  const handleExtractKaraokeDsp = async () => {
    // Verification Gate: AI vocal remover is available once Gmail verification is done or Admin Mode
    if (!effectiveIsVerified) {
      setAuthModalContext({
        title: 'Unlock AI Vocal Remover',
        subtitle: 'Verify with Gmail (100% Free)',
        reason: 'Sign up or sign in with your Google / Gmail account (100% free forever) to unlock the AI Vocal Remover, isolate karaoke music, and cancel vocals from any song!'
      });
      setIsGoogleAuthModalOpen(true);
      onShowToast(
        'Gmail verification required for AI Vocal Remover.',
        <ShieldCheck size={16} className="text-[#8E7CFF]" />,
        'Google 1-Tap sign-in unlocks instant vocal cancellation'
      );
      return;
    }

    setIsExtractingKaraoke(true);
    onShowToast('Removing vocals & isolating karaoke backing music...', <Sparkles size={16} className="text-[#8E7CFF] animate-spin" />);
    try {
      const activeUrl = await getActiveBackingUrl();
      const rawTitle = sourceTab === 'device' && customDeviceTrack ? customDeviceTrack.title : selectedBuiltinTrack.title;
      const cleanSongTitle = rawTitle.replace(/\s*\(Karaoke\)/gi, '').trim();
      const currentArtist = sourceTab === 'device' && customDeviceTrack ? customDeviceTrack.artist : selectedBuiltinTrack.categoryLabel;
      const originalDuration = sourceTab === 'device' && customDeviceTrack ? customDeviceTrack.duration : selectedBuiltinTrack.duration;

      // 1. Remove center vocals with DSP phase-inversion demixing
      const result = await extractClientSideKaraokeAudio(activeUrl);
      const effectiveDuration = result.duration || originalDuration || 180;
      
      setCustomDeviceTrack({
        title: `${cleanSongTitle} (Karaoke)`,
        artist: currentArtist,
        url: result.url,
        blob: result.blob,
        duration: effectiveDuration
      });
      setSourceTab('device');
      setIsKaraokeExtracted(true);

      // 2. Automatically fetch, parse, and update lyrics in the lyric box below!
      onShowToast('Vocals cancelled! Synchronizing lyrics into teleprompter...', <Sparkles size={16} className="text-amber-400 animate-spin" />);
      const lyricsResult = await fetchLyricsForUploadedAudio(cleanSongTitle, currentArtist, effectiveDuration);

      setCustomLyricsText(lyricsResult.lyricsText);
      setCustomKaraokeData(lyricsResult.karaokeData);
      setIsLyricsOpen(true);

      const sourceDescription = lyricsResult.source === 'synced_lrc'
        ? 'Word-by-word synced teleprompter active'
        : lyricsResult.source === 'preset'
          ? 'Studio karaoke lyrics active'
          : lyricsResult.source === 'online_plain'
            ? 'Song lyrics synchronized to track'
            : 'Custom lyrics prompt active';

      onShowToast(
        `Vocals removed & lyrics updated for "${cleanSongTitle}"!`,
        <CheckCircle2 size={16} className="text-emerald-400" />,
        sourceDescription
      );
    } catch (err: any) {
      console.error('Karaoke extraction error:', err);
      onShowToast('Vocal extraction error: ' + err.message, <AlertCircle size={16} className="text-red-400" />);
    } finally {
      setIsExtractingKaraoke(false);
    }
  };

  // Active karaoke timing and lyrics calculations
  const activeKaraokeData: SongKaraokeTiming = useMemo(() => {
    if (sourceTab === 'device') {
      if (customKaraokeData) return customKaraokeData;
      if (customLyricsText) {
        return parseLrcOrTextToKaraoke(
          customDeviceTrack?.duration || 180,
          customDeviceTrack?.title || 'Custom Track',
          customDeviceTrack?.artist || 'Local Backing Track',
          customLyricsText
        );
      }
      if (customDeviceTrack) {
        return parseLrcOrTextToKaraoke(
          customDeviceTrack.duration || 180,
          customDeviceTrack.title,
          customDeviceTrack.artist || 'Device Audio',
          `[00:02.00] 🎵 "${customDeviceTrack.title}" Loaded
[00:06.00] Click "AI Vocal Remover & Load Lyrics" above
[00:10.00] Vocals will be removed and song lyrics will sync here!
[00:16.00] 🎤 Get ready to sing your song...`
        );
      }
    }
    if (selectedBuiltinTrack.id === 'inst_tum_hi_ho' || selectedBuiltinTrack.title.toLowerCase().includes('tum hi ho')) {
      return TUM_HI_HO_KARAOKE_DATA;
    }
    if (selectedBuiltinTrack.id === 'inst_lutt_le_gaya' || selectedBuiltinTrack.title.toLowerCase().includes('lutt')) {
      return LUTT_LE_GAYA_KARAOKE_DATA;
    }
    return parseLrcOrTextToKaraoke(
      selectedBuiltinTrack.duration || 60,
      selectedBuiltinTrack.title,
      selectedBuiltinTrack.categoryLabel || 'Studio Instrumental',
      `[00:02.00] 🎵 "${selectedBuiltinTrack.title}" Backing Track
[00:06.00] ${selectedBuiltinTrack.categoryLabel} • ${selectedBuiltinTrack.bpm} BPM
[00:12.00] 🎤 Sing along with your original vocals or freestyle melody
[00:20.00] Feel the rhythm and bring your voice to the mix!`
    );
  }, [sourceTab, customKaraokeData, customLyricsText, customDeviceTrack, selectedBuiltinTrack]);

  const activeDuration = sourceTab === 'device' && customDeviceTrack ? customDeviceTrack.duration : selectedBuiltinTrack.duration;
  const activeFallbackLyrics = sourceTab === 'device' 
    ? (customLyricsText || (customDeviceTrack ? `Sing along to ${customDeviceTrack.title}` : ''))
    : selectedBuiltinTrack.lyrics;

  // --- RECORDING WORKFLOW (Enforces microphone access check before singing) ---

  const handleStartRecording = async () => {
    onPauseMainPlayer();
    setMicPermissionDenied(false);

    // If unverified and already used 1 free demo take, prompt verification! (Bypassed if Admin Mode)
    if (!effectiveIsVerified && hasCompletedDemo) {
      setAuthModalContext({
        title: 'Sign In to Sing More',
        subtitle: '1 Free Demo Completed • Verify with Gmail',
        reason: 'You have used your 1 free demo take! Sign in with your Google / Gmail account (100% free) to continue recording takes, saving audio, and exporting songs.'
      });
      setIsGoogleAuthModalOpen(true);
      onShowToast(
        '1 free demo completed. Please verify with Google to continue recording.',
        <ShieldCheck size={16} className="text-[#8E7CFF]" />
      );
      return;
    }

    // Explicit check: Microphone permission must be requested and granted before singing
    if (!hasMicPermissionGranted) {
      setMicModalError(null);
      setIsMicPermissionModalOpen(true);
      return;
    }

    await executeStartRecording();
  };

  const handleGrantMicPermissionAndStart = async () => {
    setIsRequestingMic(true);
    setMicModalError(null);
    try {
      const hasMic = await studioEngine.requestMicrophonePermission();
      if (!hasMic) {
        setIsRequestingMic(false);
        setMicPermissionDenied(true);
        setMicModalError('Microphone permission was denied by your browser or system. Please enable microphone permissions in your browser or device settings.');
        return;
      }

      setHasMicPermissionGranted(true);
      setMicPermissionDenied(false);
      setIsMicPermissionModalOpen(false);
      setIsRequestingMic(false);

      // Immediately launch synchronized singing take!
      await executeStartRecording();
    } catch (err: any) {
      setIsRequestingMic(false);
      setMicModalError(err?.message || 'Could not access device microphone. Please try again.');
    }
  };

  const executeStartRecording = async () => {
    // Stop previews
    if (isBackingPreviewPlaying) {
      backingAudioRef.current?.pause();
      setIsBackingPreviewPlaying(false);
    }
    studioEngine.stopPreview();
    setIsCombinedPreviewPlaying(false);

    try {
      // 1. Prepare backing audio URL
      const backingUrl = await getActiveBackingUrl();

      // 2. Start synchronized recording
      await studioEngine.startRecording(backingUrl, (level) => {
        setVuLevel(level);
      });

      setIsRecording(true);
      setRecordingSeconds(0);

      // Start elapsed timer with 100ms precision for silky-smooth word highlight sweep
      recordingTimerRef.current = setInterval(() => {
        const exactCurrent = studioEngine.getRecordingCurrentTime();
        if (exactCurrent > 0) {
          setRecordingSeconds(exactCurrent);
        } else {
          setRecordingSeconds(prev => +(prev + 0.1).toFixed(2));
        }
      }, 100);

      onShowToast(
        !effectiveIsVerified ? 'Demo recording started! Sing into microphone.' : 'Recording started! Sing into microphone.',
        <Mic size={16} className="text-red-400 animate-pulse" />
      );
    } catch (err: any) {
      setIsRecording(false);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        setHasMicPermissionGranted(false);
        setMicPermissionDenied(true);
        setIsMicPermissionModalOpen(true);
        setMicModalError('Microphone permission is required to sing. Please allow access.');
      } else {
        onShowToast('Could not start recording: ' + (err.message || 'Error'), <AlertCircle size={16} className="text-red-400" />);
      }
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setVuLevel(0);

    try {
      const result = await studioEngine.stopRecording();
      setRecordedVoiceBlob(result.blob);
      if (recordedVoiceUrl) {
        URL.revokeObjectURL(recordedVoiceUrl);
      }
      const newUrl = URL.createObjectURL(result.blob);
      setRecordedVoiceUrl(newUrl);

      onShowToast(
        'Recording complete!',
        <CheckCircle2 size={16} className="text-green-400" />,
        `${recordingSeconds}s captured • Ready to mix & preview`
      );

      // If user is unverified and just finished their 1 free demo take (never lock out admin!):
      if (!effectiveIsVerified && !hasCompletedDemo) {
        try {
          localStorage.setItem('muzic_studio_demo_completed', 'true');
        } catch {}
        setHasCompletedDemo(true);
        // Briefly delay so the user sees their recorded take in the booth, then prompt verification
        setTimeout(() => {
          setAuthModalContext({
            title: 'Demo Take Finished! 🎉',
            subtitle: 'Sign in with Gmail to save & export',
            reason: 'You just completed your 1 free Singing Studio demo! Sign up & verify your account with Google (1-Tap, 100% free) to save this recording, unlock export mixing, and get 5 free phone audio imports every month.'
          });
          setIsGoogleAuthModalOpen(true);
        }, 1200);
      }
    } catch (err: any) {
      onShowToast('Failed to finalize recording: ' + err.message, <AlertCircle size={16} className="text-red-400" />);
    }
  };

  const handleDiscardTake = () => {
    studioEngine.stopPreview();
    setIsCombinedPreviewPlaying(false);
    if (recordedVoiceUrl) {
      URL.revokeObjectURL(recordedVoiceUrl);
      setRecordedVoiceUrl(null);
    }
    setRecordedVoiceBlob(null);
    setRecordingSeconds(0);
    setLastExportResult(null);
  };

  // --- COMBINED PREVIEW WORKFLOW ---

  const handleToggleCombinedPreview = async () => {
    onPauseMainPlayer();

    if (isCombinedPreviewPlaying) {
      studioEngine.stopPreview();
      setIsCombinedPreviewPlaying(false);
      return;
    }

    if (!recordedVoiceUrl) {
      onShowToast('Record your singing first to hear combined preview.', <Mic size={16} className="text-[#8E7CFF]" />);
      return;
    }

    try {
      const backingUrl = await getActiveBackingUrl();
      studioEngine.playPreview(
        backingUrl,
        recordedVoiceUrl,
        mixerSettings,
        () => setIsCombinedPreviewPlaying(false)
      );
      setIsCombinedPreviewPlaying(true);
    } catch (err: any) {
      onShowToast('Preview playback failed: ' + err.message, <AlertCircle size={16} className="text-red-400" />);
    }
  };

  // --- MIXING & EXPORT WORKFLOW ---

  const handleExportMix = async () => {
    if (!recordedVoiceBlob) {
      onShowToast('No vocal recording to export.', <AlertCircle size={16} className="text-amber-400" />);
      return;
    }

    if (!effectiveIsVerified) {
      setAuthModalContext({
        title: 'Sign In to Export Mix',
        subtitle: 'Google 1-Tap Account Verification',
        reason: 'Sign up or verify with your Google / Gmail account (100% free) to export and download your recorded studio tracks as high-quality WAV files.'
      });
      setIsGoogleAuthModalOpen(true);
      onShowToast('Google verification required to export mix.', <ShieldCheck size={16} className="text-[#8E7CFF]" />);
      return;
    }

    setIsExporting(true);
    studioEngine.stopPreview();
    setIsCombinedPreviewPlaying(false);

    try {
      const backingUrl = await getActiveBackingUrl();
      const songTitle = sourceTab === 'device' && customDeviceTrack
        ? customDeviceTrack.title
        : selectedBuiltinTrack.title;

      const mixResult = await studioEngine.mixAndExport(
        backingUrl,
        recordedVoiceBlob,
        mixerSettings,
        songTitle
      );

      setLastExportResult(mixResult);
      studioEngine.downloadMix(mixResult);

      onShowToast(
        'Combined song exported successfully!',
        <Download size={16} className="text-green-400" />,
        `Saved as ${mixResult.fileName} (${(mixResult.fileSize / (1024 * 1024)).toFixed(1)} MB WAV)`
      );
    } catch (err: any) {
      console.error('Export error:', err);
      onShowToast('Export failed: ' + err.message, <AlertCircle size={16} className="text-red-400" />);
    } finally {
      setIsExporting(false);
    }
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0818] text-white animate-[fadeIn_0.15s_ease-out]">
      {/* Top Header */}
      {/* Top Header - Reference Design Match */}
      <header className="px-5 pt-8 pb-3 shrink-0 flex items-center justify-between border-b border-white/5 bg-[#0A0818]/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToLibrary}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-white/5 active:scale-95 transition-all text-[#796BFF] cursor-pointer"
            title="Back to Library"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col leading-[1.05]">
                <span className="text-xl font-black tracking-tight text-white">Singing</span>
                <span className="text-xl font-black tracking-tight text-white">Studio</span>
              </div>
              
              {isRecording ? (
                <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Live Rec ({formatSec(recordingSeconds)})
                </span>
              ) : !isVerified ? (
                <span className="bg-[#2D1E10] border border-[#B38734]/80 text-[#FFBE3B] px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Sparkles size={10} className="text-[#FFBE3B]" />
                  <span>DEMO MODE</span>
                </span>
              ) : (
                <span className="bg-[#1C1642] border border-[#6355FE]/50 text-[#8E7CFF] px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>STUDIO READY</span>
                </span>
              )}
            </div>
            
            <p className="text-[9px] font-black text-[#6355FE] uppercase tracking-wider mt-1">
              DUAL-TRACK VOCAL RECORDING & AUDIO MIXER
            </p>
          </div>
        </div>

        {/* Header Right Action */}
        {isVerified ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGoogleAuthModalOpen(true)}
              className="p-2.5 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 shadow-sm bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:border-emerald-500"
              title={`Verified: ${currentUser?.email}`}
            >
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Verified" className="w-3.5 h-3.5 rounded-full object-cover" />
              ) : (
                <ShieldCheck size={14} className="text-emerald-400" />
              )}
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider">
                Verified
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsVocalSepModalOpen(true)}
              className="p-2.5 bg-[#1C153E] text-[#8E7CFF] hover:text-white rounded-2xl border border-[#6355FE]/30 hover:border-[#6355FE] transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 shadow-sm"
              title="AI Stem Separation"
            >
              <Sparkles size={14} className="text-[#8E7CFF]" />
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider">AI Stems</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAuthModalContext({
                title: 'Studio Verification',
                subtitle: 'Google 1-Tap Account Verification',
                reason: undefined
              });
              setIsGoogleAuthModalOpen(true);
            }}
            className="bg-white hover:bg-neutral-100 active:scale-95 text-neutral-900 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-2 border border-white/20 transition-all cursor-pointer shrink-0"
          >
            <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
            <div className="flex flex-col text-left leading-[1.05]">
              <span className="text-[10px] font-black tracking-wider uppercase text-neutral-900">VERIFY</span>
              <span className="text-[10px] font-black tracking-wider uppercase text-neutral-900">WITH GMAIL</span>
            </div>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 pb-24 text-left">
        
        {!effectiveIsVerified ? (
          /* ========================================================== */
          /* DEMO MODE: Focused on 1 background music & mic to sing      */
          /* Hides all extra phone uploads, multi-tracks, mixer & export */
          /* ========================================================== */
          <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
            {/* Demo Status Banner - Reference Image Match */}
            {!hasCompletedDemo ? (
              <div className="p-5 rounded-[28px] bg-[#120F2B]/90 border border-[#6355FE]/35 shadow-2xl space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#1D1642] border border-[#6355FE]/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner mt-0.5">
                    <Sparkles size={20} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">
                        FREE SINGING STUDIO DEMO
                      </span>
                      <span className="bg-[#48281A] border border-amber-500/40 text-amber-300 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                        1 FREE TAKE
                      </span>
                      <span className="bg-[#0B3332] border border-emerald-500/30 text-emerald-400 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase ml-auto">
                        Demo Ready
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-white leading-snug mt-1">
                      Sing along to backing music with your mic!
                    </h3>
                  </div>
                </div>

                <p className="text-[11px] text-[#A6A2C5] font-medium leading-relaxed">
                  We've cued up the background music below. Tap the red button to record your demo take. Sing directly into your microphone to hear how your voice mixes with the song!
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-3xl bg-[#1C153E]/80 border border-amber-500/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30 shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-2">
                      1 Free Demo Completed
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
                        Sign In Required
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#8F8E9C] mt-0.5">
                      Verify free with your Gmail account (Google 1-Tap) to unlock the full dual-track mixer, unlimited takes, phone audio imports, and song downloads.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalContext({
                      title: 'Unlock Full Studio',
                      subtitle: 'Verify with Gmail (Google 1-Tap)',
                      reason: 'Sign in with your Google account (100% free forever) to continue recording, save your music, and unlock 5 phone track imports monthly.'
                    });
                    setIsGoogleAuthModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-neutral-100 text-neutral-900 rounded-xl text-xs font-black tracking-wider uppercase cursor-pointer shadow-md shrink-0 active:scale-95 transition-all flex items-center gap-2 justify-center"
                >
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Verify with Gmail</span>
                </button>
              </div>
            )}

            {/* DEMO STEP 1: Background Music - Reference Image Match */}
            <section className="bg-[#120F2B]/90 border border-[#6355FE]/35 rounded-[28px] p-5 space-y-4 shadow-2xl">
              {/* Card Header Metadata */}
              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#796BFF]">
                    <Disc3 size={14} className="text-[#796BFF]" />
                    <span>{sourceTab === 'device' ? 'UPLOADED SONG' : 'DEMO BACKING MUSIC'}</span>
                    {isKaraokeExtracted && (
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-500/30 uppercase flex items-center gap-1">
                        <Sparkles size={9} /> Karaoke & Lyrics Synced
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handlePickDeviceAudio}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-[#ECE6FF] hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 shrink-0 active:scale-95"
                    title="Upload your own song file to remove vocals and sing along"
                  >
                    <Upload size={12} className="text-[#8E7CFF]" />
                    <span>{customDeviceTrack ? 'Change Song' : 'Upload Song File'}</span>
                  </button>
                </div>
                <h3 className="text-sm font-black text-white leading-tight">
                  {sourceTab === 'device' && customDeviceTrack ? customDeviceTrack.title : selectedBuiltinTrack.title}
                </h3>
                <p className="text-[10px] font-bold text-[#8F8E9C]">
                  {sourceTab === 'device' && customDeviceTrack 
                    ? `${customDeviceTrack.artist} • ${formatSec(customDeviceTrack.duration)}`
                    : `${selectedBuiltinTrack.categoryLabel || 'Bollywood Romantic / Karaoke'} • ${selectedBuiltinTrack.bpm} BPM`}
                </p>
              </div>

              {/* Action Buttons: Pink AI VOCAL REMOVER and Purple Listen Track */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleExtractKaraokeDsp}
                  disabled={isExtractingKaraoke || isRecording}
                  className="flex-1 py-3 px-3 bg-gradient-to-r from-[#E91E63] to-[#FF4081] hover:brightness-110 active:scale-95 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 cursor-pointer disabled:opacity-50"
                  title="Run client-side DSP Mid-Side phase cancellation to remove center vocals and load lyrics"
                >
                  {isExtractingKaraoke ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>REMOVING VOCALS & LOADING LYRICS...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-amber-300" />
                      <span>{isKaraokeExtracted ? 'AI VOCAL REMOVER (ACTIVE)' : 'AI VOCAL REMOVER & LOAD LYRICS'}</span>
                      {!effectiveIsVerified && (
                        <Lock size={11} className="text-white/80 shrink-0 -ml-0.5" />
                      )}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleBackingPreview}
                  disabled={isSynthesizing || isRecording}
                  className="flex-1 py-3 px-3 bg-[#6355FE] hover:bg-[#7265FF] active:scale-95 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#6355FE]/30 cursor-pointer disabled:opacity-40"
                >
                  {isSynthesizing ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : isBackingPreviewPlaying ? (
                    <>
                      <Pause size={14} fill="currentColor" />
                      <span>Pause Track</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" />
                      <span>Listen Track</span>
                    </>
                  )}
                </button>
              </div>

              {/* Demo Track Quick Switcher: ♫ TUM HI vs ♫ LUTT LE */}
              <div className="flex gap-2 p-1.5 bg-[#0B091D] rounded-2xl border border-white/5">
                {BUILTIN_INSTRUMENTAL_CATALOG.slice(0, 2).map((track, idx) => {
                  const isCurrent = (sourceTab === 'builtin' && selectedBuiltinTrack.id === track.id) ||
                    (sourceTab === 'device' && customDeviceTrack?.title.includes(track.title.split(' ')[0]));
                  const shortLabel = idx === 0 ? 'TUM HI' : 'LUTT LE';
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => {
                        setSelectedBuiltinTrack(track);
                        setSourceTab('builtin');
                        setCustomDeviceTrack(null);
                        setIsKaraokeExtracted(false);
                        if (track.id === 'inst_lutt_le_gaya') {
                          setCustomKaraokeData(LUTT_LE_GAYA_KARAOKE_DATA);
                        } else {
                          setCustomKaraokeData(TUM_HI_HO_KARAOKE_DATA);
                        }
                        if (isBackingPreviewPlaying) {
                          backingAudioRef.current?.pause();
                          setIsBackingPreviewPlaying(false);
                        }
                        onShowToast(`Selected "${track.title}"`, <Music size={14} className="text-[#8E7CFF]" />);
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isCurrent
                          ? 'bg-[#6355FE] text-white shadow-md'
                          : 'text-[#706B8F] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Music size={13} />
                      <span>{shortLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Progress & Seeker Bar Container */}
              <div className="p-4 bg-[#0B091D]/90 rounded-2xl border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#8F8E9C]">
                  <span>{isBackingPreviewPlaying ? 'Playing' : 'Ready'}</span>
                  <span>{formatSec(backingCurrentTime)} / {formatSec(selectedBuiltinTrack.duration)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={selectedBuiltinTrack.duration}
                  step="0.5"
                  value={backingCurrentTime}
                  onChange={handleBackingSeek}
                  disabled={isRecording}
                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#6355FE]"
                />
              </div>

              {/* Synchronized Word-by-Word Karaoke Lyrics Layer */}
              <div className="pt-1">
                <KaraokeLyricsView
                  currentTimeSec={isRecording ? recordingSeconds : backingCurrentTime}
                  durationSec={activeDuration}
                  onSeek={handleBackingSeekTo}
                  karaokeData={activeKaraokeData}
                  fallbackLyrics={activeFallbackLyrics}
                />
              </div>
            </section>

            {/* DEMO STEP 2: Mic to Sing Directly */}
            <section className="bg-[#14122B]/70 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
                    <Mic size={15} />
                    Microphone Singing Booth
                  </h2>
                  <p className="text-[11px] text-[#8F8E9C]">
                    Music plays in sync while your microphone captures your live singing.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasMicPermissionGranted ? (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Mic Ready
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMicModalError(null);
                        setIsMicPermissionModalOpen(true);
                      }}
                      className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/30 transition-all cursor-pointer"
                      title="Request microphone permission"
                    >
                      <Mic size={11} /> Permission Required
                    </button>
                  )}
                  {isRecording && (
                    <span className="text-xs font-black text-red-400 bg-red-400/20 px-3 py-1 rounded-full border border-red-400/30 animate-pulse">
                      {formatSec(recordingSeconds)} REC
                    </span>
                  )}
                </div>
              </div>

              {micPermissionDenied && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-xs text-red-300">
                  <AlertCircle size={18} className="shrink-0 text-red-400" />
                  <span>Microphone access was denied. Please allow microphone permissions in app settings to record.</span>
                </div>
              )}

              {/* VU Meter */}
              <div className="p-4 bg-black/30 rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#8F8E9C]">
                  <span>Microphone Input Level</span>
                  <span className={vuLevel > 0.05 ? 'text-green-400' : 'text-white/30'}>
                    {isRecording ? `${Math.round(vuLevel * 100)}%` : 'Ready to Sing'}
                  </span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex items-center p-0.5 border border-white/5">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-75 ${
                      vuLevel > 0.85
                        ? 'bg-gradient-to-r from-green-500 via-amber-400 to-red-500'
                        : 'bg-gradient-to-r from-[#6355FE] to-[#8E7CFF]'
                    }`}
                    style={{ width: `${Math.max(2, vuLevel * 100)}%` }}
                  />
                </div>
              </div>

              {/* Main Demo Action Button */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    disabled={isSynthesizing}
                    className="w-full sm:w-auto px-8 py-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-500/30 flex items-center justify-center gap-2.5"
                  >
                    <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                    <span>{hasCompletedDemo ? 'Start Singing Recording' : 'Start Demo Sing Now'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-white/90 active:scale-95 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2.5"
                  >
                    <Square size={16} fill="currentColor" />
                    <span>Stop & Keep Take</span>
                  </button>
                )}

                {recordedVoiceBlob && !isRecording && (
                  <button
                    type="button"
                    onClick={handleDiscardTake}
                    className="w-full sm:w-auto px-5 py-3.5 bg-white/10 hover:bg-white/15 text-[#8F8E9C] hover:text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={14} />
                    <span>Discard Take</span>
                  </button>
                )}
              </div>

              {/* Recorded Take Playback */}
              {recordedVoiceBlob && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-emerald-300">
                        Demo Take Recorded ({recordingSeconds}s captured)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleCombinedPreview}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                        isCombinedPreviewPlaying
                          ? 'bg-amber-500 text-black shadow-amber-500/25'
                          : 'bg-[#6355FE] text-white hover:bg-[#7265FF]'
                      }`}
                    >
                      {isCombinedPreviewPlaying ? (
                        <>
                          <Pause size={12} fill="currentColor" />
                          <span>Pause Mix</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} fill="currentColor" />
                          <span>Hear My Song</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* LOCKED STUDIO TEASER */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#14122B]/90 to-[#120F24] border border-white/10 shadow-2xl space-y-4 text-left relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Lock size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      Full Studio Features Locked
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-black border border-emerald-500/30">
                        100% FREE
                      </span>
                    </h3>
                    <p className="text-[10px] text-[#8F8E9C]">Complete Gmail verification to unlock all studio tools:</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-white/80 font-medium">
                <div className="p-2.5 bg-black/20 rounded-xl border border-white/5 flex items-center gap-2">
                  <Sliders size={13} className="text-[#8E7CFF] shrink-0" />
                  <span>Dual-Track Volume Faders</span>
                </div>
                <div className="p-2.5 bg-black/20 rounded-xl border border-white/5 flex items-center gap-2">
                  <Sparkles size={13} className="text-amber-400 shrink-0" />
                  <span>Ambience Reverb & Latency Sync</span>
                </div>
                <div className="p-2.5 bg-black/20 rounded-xl border border-white/5 flex items-center gap-2">
                  <FolderPlus size={13} className="text-[#8E7CFF] shrink-0" />
                  <span>5 Free Phone Song Imports/Mo</span>
                </div>
                <div className="p-2.5 bg-black/20 rounded-xl border border-white/5 flex items-center gap-2">
                  <Download size={13} className="text-emerald-400 shrink-0" />
                  <span>Master WAV Song Export</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthModalContext({
                    title: 'Unlock Full Studio Free',
                    subtitle: 'Verify with Gmail (Google 1-Tap)',
                    reason: 'Sign up and verify with your Google account (100% free forever) to unlock unlimited recording takes, phone audio imports, dual-track mixer, and WAV downloads.'
                  });
                  setIsGoogleAuthModalOpen(true);
                }}
                className="w-full py-3.5 px-4 bg-white hover:bg-neutral-100 active:scale-[0.99] text-neutral-900 rounded-2xl font-black text-xs tracking-wider uppercase cursor-pointer shadow-xl flex items-center justify-center gap-2.5 transition-all"
              >
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Verify with Gmail to Unlock</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* VERIFIED CREATOR VIEW: Complete full-featured studio        */
          /* ========================================================== */
          <>

        {/* SECTION A: CHOOSE BACKING TRACK */}
        <section className="bg-[#14122B]/70 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF] flex items-center gap-2">
                <Disc3 size={15} />
                Step 1: Choose Backing Track
              </h2>
              <p className="text-[11px] text-[#8F8E9C]">Select a royalty-free instrumental or a song from your device.</p>
            </div>

            {/* Source Switcher & Upload Button */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={handlePickDeviceAudio}
                className="px-3 py-1.5 bg-gradient-to-r from-[#6355FE]/30 to-[#8E7CFF]/30 hover:from-[#6355FE]/40 hover:to-[#8E7CFF]/40 text-[#ECE6FF] border border-[#6355FE]/50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md"
                title="Upload an audio file to remove vocals and sing along"
              >
                <Upload size={12} className="text-[#8E7CFF]" />
                <span>Upload Song File</span>
              </button>

              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setSourceTab('builtin')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    sourceTab === 'builtin' ? 'bg-[#6355FE] text-white shadow-md' : 'text-[#8F8E9C] hover:text-white'
                  }`}
                >
                  Built-in Tracks
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTab('device')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    sourceTab === 'device' ? 'bg-[#6355FE] text-white shadow-md' : 'text-[#8F8E9C] hover:text-white'
                  }`}
                >
                  Uploaded Track
                </button>
              </div>
            </div>
          </div>

          {/* BUILT-IN INSTRUMENTALS CATALOG (6 Required Categories per Section 4.B) */}
          {sourceTab === 'builtin' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BUILTIN_INSTRUMENTAL_CATALOG.map(track => {
                  const isSelected = selectedBuiltinTrack.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => handleSelectBuiltin(track)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-left relative ${
                        isSelected
                          ? 'bg-[#1C153E] border-[#6355FE] shadow-[0_0_20px_rgba(99,85,254,0.25)]'
                          : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#8E7CFF] block">
                            {track.categoryLabel}
                          </span>
                          <h3 className="text-xs font-black text-white leading-tight mt-0.5">
                            {track.title}
                          </h3>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#6355FE] text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 size={12} />
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-[#8F8E9C] line-clamp-2 leading-relaxed">
                        {track.styleDescription}
                      </p>

                      <div className="flex items-center justify-between text-[9px] font-bold text-white/50 pt-1 border-t border-white/5">
                        <span>{track.bpm} BPM • {track.key}</span>
                        <span className="text-green-400/90 font-extrabold uppercase">Royalty-Free Original</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHOOSE SONG FROM PHONE */}
          {sourceTab === 'device' && (
            <div className="space-y-3">
              {/* Google 1-Tap Verification Required Banner */}
              {!effectiveIsVerified && (
                <div className="p-4 bg-gradient-to-r from-[#6355FE]/20 via-[#8E7CFF]/15 to-transparent border border-[#6355FE]/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-md">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                        Google 1-Tap Verification
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-extrabold uppercase border border-emerald-500/30">
                          FREE
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#8F8E9C] leading-snug">
                        Verify once with Google to unlock and track your 5 free phone song imports this month.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGoogleAuthModalOpen(true)}
                    className="px-4 py-2 bg-white text-neutral-900 hover:bg-neutral-100 active:scale-95 transition-all rounded-xl text-xs font-black tracking-wider shrink-0 cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Verify with Google</span>
                  </button>
                </div>
              )}

              {/* Monthly Upload Quota Card */}
              <div className="p-3.5 bg-[#171330] border border-[#6355FE]/25 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] shrink-0 border border-[#6355FE]/30">
                    <Upload size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">Monthly Studio Imports</span>
                      <span className="text-[9px] bg-white/10 text-white/90 font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider">
                        {isAdminMode ? '👑 Admin Mode (Unlimited)' : subscriptionService.getCurrentTier() === 'free' ? 'Muzic Free (5/mo)' : subscriptionService.getCurrentTier() === 'pro' ? 'Muzic Pro (20/mo)' : 'Studio Pass (50/mo)'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8F8E9C]">
                      {isAdminMode ? 'Unlimited phone song imports & takes active' : `${uploadQuota.used} of ${uploadQuota.limit} phone songs imported this month`}
                      {isAdminMode ? (
                        <span className="text-amber-400 ml-1.5 font-bold">• Admin Unlocked</span>
                      ) : isVerified && currentUser?.email ? (
                        <span className="text-emerald-400/90 ml-1.5 font-bold">• Verified ({currentUser.email})</span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl tracking-wider ${
                    uploadQuota.remaining > 0
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}>
                    {uploadQuota.remaining} Left
                  </span>
                  {uploadQuota.remaining <= 1 && (
                    <button
                      type="button"
                      onClick={() => setIsSubscriptionModalOpen(true)}
                      className="px-2.5 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                    >
                      {uploadQuota.remaining === 0 ? 'Upgrade' : 'More'}
                    </button>
                  )}
                </div>
              </div>

              {customDeviceTrack ? (
                <div className="p-4 bg-[#1C153E] border border-[#6355FE] rounded-2xl space-y-3.5 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] shrink-0 border border-[#6355FE]/40">
                        <FileAudio size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase tracking-wider text-[#8E7CFF]">Uploaded Song</span>
                          {isKaraokeExtracted && (
                            <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-500/30 uppercase flex items-center gap-1">
                              <Sparkles size={8} /> Vocals Removed
                            </span>
                          )}
                          {customKaraokeData && (
                            <span className="text-[8px] bg-blue-500/20 text-blue-300 font-extrabold px-1.5 py-0.5 rounded-full border border-blue-500/30 uppercase">
                              Lyrics Synced
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-black text-white truncate mt-0.5">{customDeviceTrack.title}</h3>
                        <p className="text-[10px] text-[#8F8E9C]">{customDeviceTrack.artist} • {formatSec(customDeviceTrack.duration)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handlePickDeviceAudio}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer shrink-0 transition-all active:scale-95"
                    >
                      Change Song
                    </button>
                  </div>

                  {/* Primary Feature Button: Remove Vocals & Update Lyrics in Lyric Box */}
                  <button
                    type="button"
                    onClick={handleExtractKaraokeDsp}
                    disabled={isExtractingKaraoke || isRecording}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-pink-600 via-[#8E7CFF] to-[#6355FE] hover:brightness-110 active:scale-[0.99] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[#6355FE]/30 cursor-pointer disabled:opacity-50"
                  >
                    {isExtractingKaraoke ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Removing Vocals & Fetching Lyrics...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} className="text-amber-300 animate-pulse" />
                        <span>{isKaraokeExtracted ? 'Re-Run Vocal Remover & Sync Lyrics' : 'AI Vocal Remover & Load Lyrics'}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-6 bg-white/5 border border-dashed border-white/15 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] mx-auto border border-[#6355FE]/30">
                    <FolderPlus size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-white">Select Any Audio File from Device</h3>
                    <p className="text-[11px] text-[#8F8E9C]">MP3, WAV, M4A, FLAC, OGG supported. Stays strictly local on your phone.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePickDeviceAudio}
                    className="px-5 py-2.5 bg-[#6355FE] hover:bg-[#7265FF] text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-[#6355FE]/25 active:scale-95 transition-all"
                  >
                    Browse Phone Files
                  </button>
                </div>
              )}

              {/* Custom Karaoke Lyrics Attachment Card for Uploaded Audio */}
              {customDeviceTrack && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1C153E] to-[#120F2B] border border-[#6355FE]/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shrink-0">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">Karaoke Lyrics Synchronizer</span>
                          {customKaraokeData && (
                            <span className="text-[8px] bg-green-500/20 text-green-300 font-extrabold px-1.5 py-0.5 rounded-full border border-green-500/30 uppercase">
                              {customKaraokeData.lines.length} Lines Timed
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#8F8E9C]">
                          {customKaraokeData 
                            ? 'Word-by-word synced teleprompter active for your audio file' 
                            : 'Upload .lrc or paste lyrics to sing with synchronized karaoke highlight'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => lyricsFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                        title="Upload timestamped .lrc or plain .txt file"
                      >
                        <Upload size={11} />
                        <span>Upload .lrc / .txt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTempLyricsDraft(customLyricsText);
                          setIsLyricsEditorOpen(!isLyricsEditorOpen);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-sm active:scale-95 ${
                          isLyricsEditorOpen 
                            ? 'bg-[#6355FE] text-white' 
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        <Edit3 size={11} />
                        <span>{customLyricsText ? 'Edit Lyrics' : 'Paste Lyrics'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Lyrics Editor */}
                  {isLyricsEditorOpen && (
                    <div className="space-y-2 pt-2 border-t border-white/10 animate-[fadeIn_0.15s_ease-out]">
                      <textarea
                        value={tempLyricsDraft}
                        onChange={(e) => setTempLyricsDraft(e.target.value)}
                        placeholder="Paste lyrics here... Tip: Supports both plain text and timestamped LRC format (e.g. [00:15.20] Lyric line)."
                        rows={4}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6355FE] resize-none font-sans"
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[9px] text-white/40">
                          LRC timestamps will be parsed automatically; plain text will be evenly timed across {customDeviceTrack.duration}s.
                        </span>
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsLyricsEditorOpen(false)}
                            className="px-3 py-1 text-[10px] text-white/50 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyLyricsText}
                            className="px-3.5 py-1.5 bg-[#6355FE] hover:bg-[#7265FF] text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-md active:scale-95"
                          >
                            Save & Sync
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={lyricsFileInputRef}
                    accept=".lrc,.txt,text/plain"
                    onChange={handleLyricsFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              <input
                type="file"
                ref={localFileInputRef}
                accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac"
                onChange={handleLocalFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* BACKING TRACK PREVIEW & SEEK CONTROL */}
          <div className="p-3.5 bg-black/20 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleBackingPreview}
                  disabled={isSynthesizing || isRecording}
                  className="w-8 h-8 rounded-full bg-[#6355FE] text-white flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-40"
                  title="Preview Backing Track"
                >
                  {isSynthesizing ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : isBackingPreviewPlaying ? (
                    <Pause size={14} fill="currentColor" />
                  ) : (
                    <Play size={14} fill="currentColor" className="ml-0.5" />
                  )}
                </button>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-white leading-tight">
                    Preview: {sourceTab === 'device' && customDeviceTrack ? customDeviceTrack.title : selectedBuiltinTrack.title}
                  </span>
                  <span className="text-[9px] text-[#8E7CFF] font-bold">
                    {isSynthesizing ? 'Synthesizing authentic audio...' : isBackingPreviewPlaying ? 'Playing Backing Preview' : 'Paused'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExtractKaraokeDsp}
                  disabled={isExtractingKaraoke || isRecording}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-pink-600 to-[#6355FE] hover:brightness-110 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  title="Run client-side DSP Mid-Side phase cancellation to remove center vocals"
                >
                  {isExtractingKaraoke ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <Sparkles size={12} className="text-amber-300" />
                  )}
                  <span>{isExtractingKaraoke ? 'Extracting...' : 'AI Vocal Remover'}</span>
                </button>
                <span className="text-[10px] font-bold text-white/50">
                  {formatSec(backingCurrentTime)} / {formatSec(sourceTab === 'device' && customDeviceTrack ? customDeviceTrack.duration : selectedBuiltinTrack.duration)}
                </span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={sourceTab === 'device' && customDeviceTrack ? customDeviceTrack.duration : selectedBuiltinTrack.duration}
              step="0.5"
              value={backingCurrentTime}
              onChange={handleBackingSeek}
              disabled={isRecording}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#6355FE]"
            />
          </div>
        </section>

        {/* SECTION B: RECORDING BOOTH */}
        <section className="bg-[#14122B]/70 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
                <Mic size={15} />
                Step 2: Vocal Recording Booth
              </h2>
              <p className="text-[11px] text-[#8F8E9C]">Backing track plays in sync while your microphone captures vocals.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasMicPermissionGranted ? (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Mic Ready
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMicModalError(null);
                    setIsMicPermissionModalOpen(true);
                  }}
                  className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/30 transition-all cursor-pointer"
                  title="Request microphone permission"
                >
                  <Mic size={11} /> Permission Required
                </button>
              )}
              {isRecording && (
                <span className="text-xs font-black text-red-400 bg-red-400/20 px-3 py-1 rounded-full border border-red-400/30 animate-pulse">
                  {formatSec(recordingSeconds)} REC
                </span>
              )}
            </div>
          </div>

          {micPermissionDenied && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-xs text-red-300">
              <AlertCircle size={18} className="shrink-0 text-red-400" />
              <span>Microphone access was denied. Please allow microphone permissions in app settings to record.</span>
            </div>
          )}

          {/* Real-time VU Visualizer Meter */}
          <div className="p-4 bg-black/30 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#8F8E9C]">
              <span>Microphone Input Level (VU Meter)</span>
              <span className={vuLevel > 0.05 ? 'text-green-400' : 'text-white/30'}>
                {isRecording ? `${Math.round(vuLevel * 100)}%` : 'Standby'}
              </span>
            </div>

            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex items-center p-0.5 border border-white/5">
              <motion.div
                className={`h-full rounded-full transition-all duration-75 ${
                  vuLevel > 0.85
                    ? 'bg-gradient-to-r from-green-500 via-amber-400 to-red-500'
                    : 'bg-gradient-to-r from-[#6355FE] to-[#8E7CFF]'
                }`}
                style={{ width: `${Math.max(2, vuLevel * 100)}%` }}
              />
            </div>
          </div>

          {/* Main Record Action Control */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {!isRecording ? (
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={isSynthesizing}
                className="w-full sm:w-auto px-8 py-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-500/30 flex items-center justify-center gap-2.5"
              >
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <span>Start Singing Recording</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopRecording}
                className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-white/90 active:scale-95 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2.5"
              >
                <Square size={16} fill="currentColor" />
                <span>Stop & Keep Take</span>
              </button>
            )}

            {recordedVoiceBlob && !isRecording && (
              <button
                type="button"
                onClick={handleDiscardTake}
                className="w-full sm:w-auto px-5 py-3.5 bg-white/10 hover:bg-white/15 text-[#8F8E9C] hover:text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                <span>Discard Take</span>
              </button>
            )}
          </div>

          {/* Synchronized Word-by-Word Karaoke Lyrics Layer for Recording */}
          {(activeFallbackLyrics || activeKaraokeData) && (
            <div className="pt-2">
              <KaraokeLyricsView
                currentTimeSec={isRecording ? recordingSeconds : backingCurrentTime}
                durationSec={activeDuration}
                onSeek={handleBackingSeekTo}
                karaokeData={activeKaraokeData}
                fallbackLyrics={activeFallbackLyrics}
              />
            </div>
          )}

          {recordedVoiceBlob && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-between text-xs text-green-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                <span>Take Captured ({recordingSeconds}s). Ready for mixing and preview below.</span>
              </div>
            </div>
          )}
        </section>

        {/* SECTION C: INDEPENDENT VOLUME MIXER & EFFECTS */}
        <section className="bg-[#14122B]/70 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="space-y-0.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF] flex items-center gap-2">
              <Sliders size={15} />
              Step 3: Studio Volume Mixer & Ambience
            </h2>
            <p className="text-[11px] text-[#8F8E9C]">Adjust backing track and voice levels independently (0% to 150%).</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Backing Track Volume Fader */}
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#8E7CFF] flex items-center gap-1.5">
                  <Volume2 size={14} />
                  Backing Track Volume
                </span>
                <span className="text-white">{Math.round(mixerSettings.backingVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={mixerSettings.backingVolume}
                onChange={(e) => setMixerSettings(prev => ({ ...prev, backingVolume: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#6355FE]"
              />
            </div>

            {/* Recorded Voice Volume Fader */}
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-red-400 flex items-center gap-1.5">
                  <Mic size={14} />
                  Vocal Voice Volume
                </span>
                <span className="text-white">{Math.round(mixerSettings.voiceVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={mixerSettings.voiceVolume}
                onChange={(e) => setMixerSettings(prev => ({ ...prev, voiceVolume: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-red-400"
              />
            </div>

            {/* Vocal Ambience Reverb (Pro feature) */}
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-400 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Studio Ambience Reverb
                </span>
                <span className="text-white">{Math.round(mixerSettings.reverbAmount * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={mixerSettings.reverbAmount}
                onChange={(e) => setMixerSettings(prev => ({ ...prev, reverbAmount: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Latency Sync Offset Compensation */}
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-sky-400 flex items-center gap-1.5">
                  <Radio size={14} />
                  Mic Latency Offset
                </span>
                <span className="text-white">{mixerSettings.voiceDelayMs} ms</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="5"
                value={mixerSettings.voiceDelayMs}
                onChange={(e) => setMixerSettings(prev => ({ ...prev, voiceDelayMs: parseInt(e.target.value) }))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>
        </section>

        {/* SECTION D: COMBINED PREVIEW & EXPORT */}
        <section className="bg-[#14122B]/70 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="space-y-0.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-green-400 flex items-center gap-2">
              <Layers size={15} />
              Step 4: Combined Preview & Export
            </h2>
            <p className="text-[11px] text-[#8F8E9C]">Listen to the synchronized mix and export your high-fidelity song file.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Combined Preview Button */}
            <button
              type="button"
              onClick={handleToggleCombinedPreview}
              disabled={!recordedVoiceBlob || isRecording}
              className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg ${
                isCombinedPreviewPlaying
                  ? 'bg-amber-500 text-black shadow-amber-500/25'
                  : 'bg-[#1C153E] border border-[#6355FE]/40 text-[#8E7CFF] hover:bg-[#6355FE]/20 disabled:opacity-40'
              }`}
            >
              {isCombinedPreviewPlaying ? (
                <>
                  <Pause size={16} fill="currentColor" />
                  <span>Pause Combined Preview</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  <span>Listen to Combined Preview</span>
                </>
              )}
            </button>

            {/* Export Mixed WAV Song Button */}
            <button
              type="button"
              onClick={handleExportMix}
              disabled={!recordedVoiceBlob || isExporting || isRecording}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-[#6355FE] to-[#8E7CFF] hover:from-[#7265FF] hover:to-[#9E8EFF] text-white disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-[#6355FE]/30 active:scale-[0.98]"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Rendering Mixed Audio...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Export Combined Song (WAV)</span>
                </>
              )}
            </button>
          </div>

          {lastExportResult && (
            <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between text-xs">
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-green-400 block">Exported File</span>
                <span className="font-bold text-white truncate block">{lastExportResult.fileName}</span>
              </div>
              <button
                type="button"
                onClick={() => studioEngine.downloadMix(lastExportResult)}
                className="px-3 py-1.5 bg-[#6355FE] text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-[#7265FF]"
              >
                Download Again
              </button>
            </div>
          )}
        </section>
      </>
    )}
  </div>

      {/* AI Vocal Separation Modal */}
      <VocalSeparationModal
        isOpen={isVocalSepModalOpen}
        onClose={() => setIsVocalSepModalOpen(false)}
        tracks={libraryTracks}
        onRequestVerification={() => {
          setAuthModalContext({
            title: 'Unlock AI Vocal Remover',
            subtitle: 'Verify with Gmail (100% Free)',
            reason: 'Sign in with your Google account (100% free) to unlock AI vocal removal and extract karaoke from any song.'
          });
          setIsGoogleAuthModalOpen(true);
        }}
        onSelectSeparatedTrack={(track) => {
          setCustomDeviceTrack({
            title: track.title,
            artist: track.artist,
            url: track.url,
            duration: track.duration
          });
          setSourceTab('device');
          setIsVocalSepModalOpen(false);
          onShowToast(`Loaded separated stem "${track.title}"`, <Music size={16} className="text-[#8E7CFF]" />);
        }}
        onShowToast={onShowToast}
      />

      {/* Premium Subscription Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onShowToast={onShowToast}
      />

      {/* Google 1-Tap Account Verification Modal */}
      <GoogleVerificationModal
        isOpen={isGoogleAuthModalOpen}
        onClose={() => setIsGoogleAuthModalOpen(false)}
        onShowToast={onShowToast}
        onSuccess={() => {
          setIsGoogleAuthModalOpen(false);
        }}
        customTitle={authModalContext.title}
        customSubtitle={authModalContext.subtitle}
        customReason={authModalContext.reason}
      />

      {/* Explicit Microphone Permission Modal */}
      <MicrophonePermissionModal
        isOpen={isMicPermissionModalOpen}
        onClose={() => setIsMicPermissionModalOpen(false)}
        onGrantPermission={handleGrantMicPermissionAndStart}
        isRequesting={isRequestingMic}
        permissionError={micModalError}
        theme={theme}
      />
    </div>
  );
}
