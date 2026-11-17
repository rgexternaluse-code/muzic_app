/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BellRing,
  Check,
  Headphones,
  Layers,
  Loader2,
  Mail,
  Mic,
  Play,
  Sliders,
  Square,
  Volume2
} from 'lucide-react';
import studioHeroImg from '../assets/images/studio_preview_hero_1794916045593.jpg';
import { useAuth } from '../context/AuthContext';
import {
  submitStudioBetaSignup,
  STUDIO_EMAIL_MAX_LENGTH,
  STUDIO_EMAIL_MIN_LENGTH,
  STUDIO_EMAIL_REGEX
} from '../services/firebase';

interface StudioComingSoonViewProps {
  onBackToLibrary: () => void;
  onPauseMainPlayer: () => void;
  onShowToast: (message: string, icon?: React.ReactNode, subtitle?: string) => void;
  theme?: 'dark' | 'light';
}

type AcousticPresetId = 'booth' | 'hall' | 'echo' | 'radio';

interface AcousticPreset {
  id: AcousticPresetId;
  label: string;
  detail: string;
  notes: number[];
  delayTime: number;
  feedback: number;
  filterFreq: number;
  filterQ: number;
  decaySec: number;
}

const ACOUSTIC_PRESETS: AcousticPreset[] = [
  {
    id: 'booth',
    label: 'Studio Booth',
    detail: 'Dry vocal intimacy',
    notes: [261.63, 329.63, 392.0, 523.25],
    delayTime: 0.04,
    feedback: 0.08,
    filterFreq: 2400,
    filterQ: 0.7,
    decaySec: 0.85
  },
  {
    id: 'hall',
    label: 'Concert Hall',
    detail: 'Expansive tail reverb',
    notes: [293.66, 369.99, 440.0, 587.33],
    delayTime: 0.24,
    feedback: 0.48,
    filterFreq: 3200,
    filterQ: 0.5,
    decaySec: 1.65
  },
  {
    id: 'echo',
    label: 'Stage Echo',
    detail: 'Timed slapback delay',
    notes: [220.0, 277.18, 329.63, 440.0],
    delayTime: 0.31,
    feedback: 0.52,
    filterFreq: 2100,
    filterQ: 1.1,
    decaySec: 1.45
  },
  {
    id: 'radio',
    label: 'Warm Radio',
    detail: 'Focused broadcast EQ',
    notes: [246.94, 311.13, 369.99, 493.88],
    delayTime: 0.08,
    feedback: 0.16,
    filterFreq: 1850,
    filterQ: 1.6,
    decaySec: 0.95
  }
];

interface UpcomingCapability {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const UPCOMING_CAPABILITIES: UpcomingCapability[] = [
  {
    id: 'vocal-remover',
    number: '01.',
    title: 'One-Tap Vocal Isolation',
    subtitle: 'Local library · Instant backing track',
    description: 'Turn any song already in your library into a clean instrumental track ready for your voice.',
    icon: Headphones
  },
  {
    id: 'karaoke-sync',
    number: '02.',
    title: 'Timed Karaoke Lyrics',
    subtitle: 'Line-by-line cue · Custom LRC import',
    description: 'Follow smooth, synchronized lyrics on screen while recording over your favorite melodies.',
    icon: Mic
  },
  {
    id: 'vocal-chain',
    number: '03.',
    title: 'Studio Reverb & Vocal Chain',
    subtitle: 'Room presets · Real-time monitoring',
    description: 'Shape your vocal tone with acoustic booth warmth, concert hall depth, or crisp broadcast clarity.',
    icon: Sliders
  },
  {
    id: 'mix-export',
    number: '04.',
    title: 'Multi-Track Mix & Export',
    subtitle: 'Voice + music balance · WAV export',
    description: 'Blend your voice level against the backing track and save a finished mix directly to your device.',
    icon: Layers
  }
];

export function StudioComingSoonView({
  onBackToLibrary,
  onPauseMainPlayer,
  onShowToast,
  theme = 'dark'
}: StudioComingSoonViewProps) {
  const isDark = theme === 'dark';
  const { currentUser } = useAuth();

  const [registeredEmail, setRegisteredEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('muzic_studio_beta_email') || '';
    } catch {
      return '';
    }
  });
  const [emailInput, setEmailInput] = useState<string>(() => {
    try {
      return localStorage.getItem('muzic_studio_beta_email') || '';
    } catch {
      return '';
    }
  });
  const [isEditingSignup, setIsEditingSignup] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('muzic_studio_beta_email');
    } catch {
      return true;
    }
  });
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const [votedFeatureId, setVotedFeatureId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('muzic_studio_feature_vote');
    } catch {
      return null;
    }
  });

  const [activePresetId, setActivePresetId] = useState<AcousticPresetId>('hall');
  const [playingPresetId, setPlayingPresetId] = useState<AcousticPresetId | null>(null);
  const [heroImageError, setHeroImageError] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signupSectionRef = useRef<HTMLElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Pre-fill signed-in user's email if user hasn't typed or registered one yet
  useEffect(() => {
    if (currentUser?.email && !emailInput && !registeredEmail) {
      setEmailInput(currentUser.email);
    }
  }, [currentUser?.email, emailInput, registeredEmail]);

  const stopPreviewAudio = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // Ignore close errors on already closed context
      }
      audioCtxRef.current = null;
    }
    setPlayingPresetId(null);
  }, []);

  useEffect(() => {
    return () => {
      stopPreviewAudio();
    };
  }, [stopPreviewAudio]);

  const scrollToSignup = () => {
    signupSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 250);
  };

  const handlePlayAcousticPreview = useCallback(
    (preset: AcousticPreset) => {
      if (playingPresetId === preset.id) {
        stopPreviewAudio();
        return;
      }

      stopPreviewAudio();
      setActivePresetId(preset.id);
      onPauseMainPlayer();

      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          onShowToast('Audio preview unavailable on this browser', <Volume2 size={16} className="text-[#8E7CFF]" />);
          return;
        }

        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        setPlayingPresetId(preset.id);

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.24;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = preset.filterFreq;
        filter.Q.value = preset.filterQ;

        const delayNode = ctx.createDelay(1.0);
        delayNode.delayTime.value = preset.delayTime;

        const feedbackGain = ctx.createGain();
        feedbackGain.gain.value = preset.feedback;

        const wetGain = ctx.createGain();
        wetGain.gain.value = preset.id === 'booth' ? 0.14 : 0.45;

        filter.connect(masterGain);
        filter.connect(delayNode);
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        delayNode.connect(wetGain);
        wetGain.connect(masterGain);
        masterGain.connect(ctx.destination);

        const baseTime = ctx.currentTime + 0.04;
        preset.notes.forEach((freq, idx) => {
          const startAt = baseTime + idx * 0.18;
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();

          osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, startAt);

          noteGain.gain.setValueAtTime(0.0001, startAt);
          noteGain.gain.exponentialRampToValueAtTime(0.32, startAt + 0.03);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, startAt + preset.decaySec);

          osc.connect(noteGain);
          noteGain.connect(filter);

          osc.start(startAt);
          osc.stop(startAt + preset.decaySec + 0.05);
        });

        const totalDurationMs = Math.round((preset.notes.length * 0.18 + preset.decaySec + 0.65) * 1000);
        stopTimeoutRef.current = setTimeout(() => {
          stopPreviewAudio();
        }, totalDurationMs);
      } catch {
        stopPreviewAudio();
        onShowToast('Could not start audio preview', <Volume2 size={16} className="text-[#8E7CFF]" />);
      }
    },
    [playingPresetId, stopPreviewAudio, onPauseMainPlayer, onShowToast]
  );

  const handleBetaSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    const normalized = emailInput.trim().toLowerCase();
    if (
      normalized.length < STUDIO_EMAIL_MIN_LENGTH ||
      normalized.length > STUDIO_EMAIL_MAX_LENGTH ||
      !STUDIO_EMAIL_REGEX.test(normalized)
    ) {
      setSignupError('Please enter a valid email address (for example, name@example.com).');
      return;
    }

    setIsSubmittingSignup(true);
    const platformRaw = Capacitor.getPlatform();
    const platform: 'web' | 'android' | 'ios' =
      platformRaw === 'android' || platformRaw === 'ios' ? platformRaw : 'web';

    try {
      await submitStudioBetaSignup({
        email: normalized,
        preferredFeature: votedFeatureId,
        platform
      });

      setRegisteredEmail(normalized);
      setEmailInput(normalized);
      setIsEditingSignup(false);
      try {
        localStorage.setItem('muzic_studio_beta_email', normalized);
        localStorage.setItem('muzic_studio_notify', 'true');
      } catch {
        // Ignore storage quota errors
      }

      onShowToast(
        'Early access signup confirmed',
        <BellRing size={16} className="text-[#8E7CFF]" />,
        `We will reach out to ${normalized} when Studio beta opens`
      );
    } catch (err) {
      let friendlyMsg = 'Could not save your signup right now. Please check your connection and try again.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed?.error) {
            friendlyMsg = 'Signup could not be saved to the waitlist right now. Please verify your email and try again.';
          }
        } catch {
          if (err.message) {
            friendlyMsg = err.message;
          }
        }
      }
      setSignupError(friendlyMsg);
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  const handleVoteFeature = (capability: UpcomingCapability) => {
    const nextVote = votedFeatureId === capability.id ? null : capability.id;
    setVotedFeatureId(nextVote);
    try {
      if (nextVote) {
        localStorage.setItem('muzic_studio_feature_vote', nextVote);
      } else {
        localStorage.removeItem('muzic_studio_feature_vote');
      }
    } catch {
      // Ignore storage errors
    }

    if (nextVote) {
      onShowToast(
        `Voted for ${capability.title}`,
        <Check size={16} className="text-[#8E7CFF]" />,
        'Thanks for helping prioritize what ships first'
      );
    }
  };

  const selectedPreset = ACOUSTIC_PRESETS.find((p) => p.id === activePresetId) || ACOUSTIC_PRESETS[1];
  const hasRegistered = Boolean(registeredEmail) && !isEditingSignup;

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden transition-colors ${
        isDark ? 'bg-[#0A0818] text-[#F5F4F9]' : 'bg-[#F7F6FC] text-[#120F26]'
      }`}
    >
      {/* Top Bar */}
      <header
        className={`shrink-0 px-5 sm:px-8 pt-8 pb-4 border-b transition-colors ${
          isDark ? 'border-white/10 bg-[#0A0818]/90' : 'border-[#6355FE]/15 bg-[#F7F6FC]/95'
        }`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              stopPreviewAudio();
              onBackToLibrary();
            }}
            className={`min-h-[44px] min-w-[44px] -ml-2 px-2 flex items-center gap-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isDark
                ? 'text-[#B9B6CE] hover:text-white hover:bg-white/5'
                : 'text-[#585474] hover:text-[#120F26] hover:bg-[#6355FE]/10'
            }`}
          >
            <ArrowLeft size={18} />
            <span>Library</span>
          </button>

          <h1 className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap shrink-0">
            Muzic Studio
          </h1>

          <div className="min-w-[44px] flex justify-end shrink-0">
            <button
              type="button"
              onClick={scrollToSignup}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                hasRegistered
                  ? isDark
                    ? 'bg-[#6355FE]/20 text-[#ECE6FF] border border-[#8E7CFF]/40'
                    : 'bg-[#6355FE]/15 text-[#5B4AE6] border border-[#6355FE]/30'
                  : isDark
                    ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                    : 'bg-white text-[#120F26] hover:bg-[#EFEAFE] border border-[#6355FE]/20'
              }`}
            >
              {hasRegistered ? <BellRing size={15} /> : <Bell size={15} />}
              <span>{hasRegistered ? 'Beta Joined' : 'Join Beta'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-5 sm:px-8 pt-6 pb-36">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Hero Showcase Split */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* Hero Visual Card */}
            <div className="lg:col-span-7 relative rounded-3xl overflow-hidden min-h-[260px] sm:min-h-[320px] border border-white/10 shadow-xl">
              {/* Styled CSS fallback behind image */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-[#1C153E] via-[#14122B] to-[#0A0818] flex items-center justify-center"
              >
                <Mic size={48} className="text-[#8E7CFF]/30" />
              </div>

              {!heroImageError && (
                <img
                  src={studioHeroImg}
                  alt="Singer in an acoustic wooden recording booth with a warm condenser microphone and mixing console"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImageError(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Measured Scrim for guaranteed 4.5:1+ text legibility */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#0A0818]/95 via-[#0A0818]/45 to-transparent"
              />

              <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-8 text-left">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#E4DDFF] mb-2">
                  <span>Coming Soon</span>
                  <span aria-hidden="true">·</span>
                  <span>Vocal Booth</span>
                  <span aria-hidden="true">·</span>
                  <span>Live Karaoke</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#FFFFFF] leading-tight max-w-xl [text-wrap:balance]">
                  Your pocket vocal studio is tuning up
                </h2>
                <p className="mt-3 text-sm sm:text-base text-[#E4DDFF] leading-relaxed max-w-lg">
                  Step up to the mic, isolate vocals from tracks you already own, and record studio-warm takes anywhere.
                </p>
              </div>
            </div>

            {/* Interactive Acoustic Tone Previewer */}
            <div
              className={`lg:col-span-5 rounded-3xl p-6 flex flex-col justify-between border ${
                isDark
                  ? 'bg-[#14122B] border-white/10'
                  : 'bg-white border-[#6355FE]/15 shadow-sm'
              }`}
            >
              <div className="space-y-4 text-left">
                <div>
                  <p
                    className={`text-xs font-semibold tracking-wide ${
                      isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'
                    }`}
                  >
                    Interactive Sound Preview
                  </p>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight mt-1">
                    Hear our studio room acoustics
                  </h3>
                  <p
                    className={`text-sm mt-1.5 leading-relaxed ${
                      isDark ? 'text-[#B9B6CE]' : 'text-[#585474]'
                    }`}
                  >
                    Tap any room preset below to audition real-time Web Audio acoustic shaping before launch.
                  </p>
                </div>

                {/* Preset Grid (Interactive Selector Buttons) */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {ACOUSTIC_PRESETS.map((preset) => {
                    const isPlayingThis = playingPresetId === preset.id;
                    const isSelected = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePlayAcousticPreview(preset)}
                        className={`min-h-[56px] p-3 rounded-2xl text-left transition-all cursor-pointer border flex items-center justify-between gap-2 ${
                          isPlayingThis
                            ? 'bg-[#6355FE] text-white border-[#6355FE] shadow-lg shadow-[#6355FE]/25'
                            : isSelected
                              ? isDark
                                ? 'bg-[#1C153E] text-white border-[#8E7CFF]/50'
                                : 'bg-[#EFEAFE] text-[#120F26] border-[#6355FE]/40'
                              : isDark
                                ? 'bg-white/5 text-[#ECE6FF] border-white/10 hover:bg-white/10'
                                : 'bg-[#F7F6FC] text-[#120F26] border-[#6355FE]/15 hover:bg-[#EFEAFE]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{preset.label}</div>
                          <div
                            className={`text-[11px] truncate mt-0.5 ${
                              isPlayingThis
                                ? 'text-white/85'
                                : isDark
                                  ? 'text-[#8F8E9C]'
                                  : 'text-[#585474]'
                            }`}
                          >
                            {preset.detail}
                          </div>
                        </div>
                        <span className="shrink-0">
                          {isPlayingThis ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acoustic Waveform Visual & Active Readout */}
              <div
                className={`mt-6 pt-4 border-t flex items-center justify-between gap-4 ${
                  isDark ? 'border-white/10' : 'border-[#6355FE]/15'
                }`}
              >
                <div className="text-left min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {playingPresetId ? `Playing ${selectedPreset.label}` : `${selectedPreset.label} selected`}
                  </div>
                  <div
                    className={`text-xs tabular-nums mt-0.5 ${
                      isDark ? 'text-[#8F8E9C]' : 'text-[#585474]'
                    }`}
                  >
                    {Math.round(selectedPreset.delayTime * 1000)} ms delay · {selectedPreset.decaySec.toFixed(2)} s decay
                  </div>
                </div>

                {/* Live Soundbar Visualizer */}
                <div className="flex items-end gap-1 h-7 shrink-0" aria-hidden="true">
                  {[0.45, 0.9, 0.6, 1.0, 0.7, 0.4].map((heightRatio, index) => (
                    <motion.span
                      key={index}
                      animate={
                        playingPresetId
                          ? { scaleY: [0.25, heightRatio, 0.35, 0.95, 0.3] }
                          : { scaleY: 0.25 }
                      }
                      transition={
                        playingPresetId
                          ? {
                              duration: 0.75,
                              repeat: Infinity,
                              repeatType: 'reverse',
                              delay: index * 0.09
                            }
                          : { duration: 0.2 }
                      }
                      style={{ originY: 1 }}
                      className={`w-1 h-full rounded-full ${
                        playingPresetId
                          ? 'bg-[#8E7CFF]'
                          : isDark
                            ? 'bg-white/20'
                            : 'bg-[#6355FE]/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Editorial Feature Roadmap & Interactive Feature Voting */}
          <section className="space-y-5 text-left">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                  What is arriving in Studio
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    isDark ? 'text-[#B9B6CE]' : 'text-[#585474]'
                  }`}
                >
                  Tap a capability below to vote for what you want to try first.
                </p>
              </div>
              {votedFeatureId && (
                <span
                  className={`text-xs font-semibold ${
                    isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'
                  }`}
                >
                  Your vote is saved
                </span>
              )}
            </div>

            <div
              className={`divide-y border-y ${
                isDark ? 'divide-white/10 border-white/10' : 'divide-[#6355FE]/15 border-[#6355FE]/15'
              }`}
            >
              {UPCOMING_CAPABILITIES.map((item) => {
                const Icon = item.icon;
                const isVoted = votedFeatureId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleVoteFeature(item)}
                    className={`w-full py-5 px-2 sm:px-3 flex items-start sm:items-center justify-between gap-4 text-left transition-colors cursor-pointer ${
                      isVoted
                        ? isDark
                          ? 'bg-[#6355FE]/10'
                          : 'bg-[#EFEAFE]/70'
                        : isDark
                          ? 'hover:bg-white/[0.03]'
                          : 'hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isVoted
                            ? 'bg-[#6355FE] text-white border-[#6355FE]'
                            : isDark
                              ? 'bg-[#14122B] text-[#8E7CFF] border-white/10'
                              : 'bg-white text-[#6355FE] border-[#6355FE]/20'
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span
                            className={`text-xs font-mono tabular-nums ${
                              isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'
                            }`}
                          >
                            {item.number}
                          </span>
                          <h4 className="text-base font-bold tracking-tight">
                            {item.title}
                          </h4>
                        </div>
                        <p
                          className={`text-xs font-medium ${
                            isDark ? 'text-[#8F8E9C]' : 'text-[#585474]'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                        <p
                          className={`text-sm leading-relaxed max-w-2xl ${
                            isDark ? 'text-[#B9B6CE]' : 'text-[#4A4666]'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 border whitespace-nowrap transition-colors ${
                        isVoted
                          ? 'bg-[#6355FE] text-white border-[#6355FE]'
                          : isDark
                            ? 'bg-[#14122B] text-[#ECE6FF] border-white/10'
                            : 'bg-white text-[#120F26] border-[#6355FE]/20'
                      }`}
                    >
                      {isVoted && <Check size={14} />}
                      <span>{isVoted ? 'Voted' : 'Vote'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Beta / Early Access Email Signup Card */}
          <section
            ref={signupSectionRef}
            className={`rounded-3xl p-6 sm:p-8 border text-left ${
              isDark
                ? 'bg-[#14122B] border-white/10'
                : 'bg-white border-[#6355FE]/15 shadow-sm'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl">
                <p
                  className={`text-xs font-semibold tracking-wide ${
                    isDark ? 'text-[#8E7CFF]' : 'text-[#6355FE]'
                  }`}
                >
                  Early &amp; Beta Access
                </p>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                  {hasRegistered
                    ? 'You are on the Studio beta list'
                    : 'Get invited when Studio beta opens'}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    isDark ? 'text-[#B9B6CE]' : 'text-[#585474]'
                  }`}
                >
                  {hasRegistered
                    ? `We saved your invite request for ${registeredEmail}. You will receive an early access notice once Studio is ready.`
                    : 'Enter your email address below to reserve early beta access when recording and karaoke launch.'}
                </p>
              </div>

              {hasRegistered ? (
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div
                    className={`min-h-[48px] px-4 py-2.5 rounded-2xl border flex items-center gap-2.5 text-sm font-semibold ${
                      isDark
                        ? 'bg-[#1C153E] border-[#8E7CFF]/40 text-[#ECE6FF]'
                        : 'bg-[#EFEAFE] border-[#6355FE]/30 text-[#5B4AE6]'
                    }`}
                  >
                    <Check size={16} />
                    <span className="truncate max-w-[220px]">{registeredEmail}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingSignup(true);
                      setSignupError(null);
                      setTimeout(() => emailInputRef.current?.focus(), 50);
                    }}
                    className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap border ${
                      isDark
                        ? 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                        : 'bg-[#F7F6FC] hover:bg-[#EFEAFE] text-[#120F26] border-[#6355FE]/20'
                    }`}
                  >
                    Use Another Email
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleBetaSignupSubmit}
                  noValidate
                  className="w-full lg:max-w-md space-y-2.5 shrink-0"
                >
                  <label htmlFor="studio-beta-email" className="sr-only">
                    Email address for Studio early access
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Mail
                        size={16}
                        aria-hidden="true"
                        className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                          isDark ? 'text-[#8F8E9C]' : 'text-[#585474]'
                        }`}
                      />
                      <input
                        ref={emailInputRef}
                        id="studio-beta-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={STUDIO_EMAIL_MAX_LENGTH}
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value);
                          if (signupError) setSignupError(null);
                        }}
                        placeholder="you@example.com"
                        disabled={isSubmittingSignup}
                        className={`w-full min-h-[48px] pl-10 pr-4 py-3 rounded-2xl text-sm font-medium border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#6355FE] ${
                          isDark
                            ? 'bg-[#0A0818] border-white/15 text-[#FFFFFF] placeholder:text-[#8F8E9C] focus:border-[#8E7CFF]'
                            : 'bg-[#F7F6FC] border-[#6355FE]/25 text-[#120F26] placeholder:text-[#585474] focus:border-[#6355FE]'
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingSignup}
                      className="min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-[#6355FE] hover:bg-[#7265FF] disabled:opacity-60 text-white shadow-lg shadow-[#6355FE]/25 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-[0.98]"
                    >
                      {isSubmittingSignup ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <BellRing size={16} />
                          <span>Request Early Access</span>
                        </>
                      )}
                    </button>
                  </div>

                  {signupError && (
                    <div
                      role="alert"
                      className={`flex items-start gap-2 text-xs font-medium pt-0.5 ${
                        isDark ? 'text-rose-300' : 'text-rose-700'
                      }`}
                    >
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{signupError}</span>
                    </div>
                  )}
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
