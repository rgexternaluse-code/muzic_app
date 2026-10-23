/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Sparkles, 
  Music, 
  RotateCcw, 
  Play, 
  ChevronRight, 
  Eye, 
  Layers, 
  Radio 
} from 'lucide-react';
import { 
  TUM_HI_HO_KARAOKE_DATA, 
  SongKaraokeTiming, 
  TimedLine, 
  TimedWord, 
  getActiveKaraokeLine, 
  getWordProgress 
} from '../data/karaokeTimings';

interface KaraokeLyricsViewProps {
  currentTimeSec: number;
  durationSec?: number;
  onSeek?: (seconds: number) => void;
  karaokeData?: SongKaraokeTiming;
  fallbackLyrics?: string;
  className?: string;
  isCompact?: boolean;
  showControls?: boolean;
}

export const KaraokeLyricsView: React.FC<KaraokeLyricsViewProps> = ({
  currentTimeSec,
  durationSec = 262,
  onSeek,
  karaokeData = TUM_HI_HO_KARAOKE_DATA,
  fallbackLyrics,
  className = '',
  isCompact = false,
  showControls = true
}) => {
  const [viewMode, setViewMode] = useState<'karaoke-words' | 'full-lyrics'>('karaoke-words');
  const [syncOffset, setSyncOffset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('karaoke_sync_offset');
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<any>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Compute effective time incorporating user latency fine-tuning
  const effectiveTime = Math.max(0, currentTimeSec + syncOffset);

  // Active line and word calculations
  const { line: activeLine, lineIndex: activeLineIndex, nextLine, leadInSeconds } = useMemo(() => {
    return getActiveKaraokeLine(karaokeData, effectiveTime);
  }, [karaokeData, effectiveTime]);

  const handleAdjustSync = (delta: number) => {
    setSyncOffset(prev => {
      const next = +(prev + delta).toFixed(1);
      try {
        localStorage.setItem('karaoke_sync_offset', next.toString());
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleResetSync = () => {
    setSyncOffset(0);
    try {
      localStorage.removeItem('karaoke_sync_offset');
    } catch {
      // ignore
    }
  };

  // Handle smooth auto-scroll to the currently active line
  useEffect(() => {
    if (!isUserScrolling && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeLineIndex, isUserScrolling]);

  // Pause auto-scroll briefly if user manually scrolls or touches the container
  const handleScroll = () => {
    setIsUserScrolling(true);
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    };
  }, []);

  return (
    <div className={`flex flex-col relative rounded-3xl overflow-hidden bg-[#0A071A]/90 border border-[#6355FE]/30 shadow-2xl ${className}`}>
      {/* Top Header / Mode Selector & Sync Calibration */}
      {showControls && (
        <div className="px-3.5 py-2.5 bg-[#120F2B]/90 backdrop-blur-md border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-400" />
              Word-By-Word Karaoke
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Micro-Calibration (Allows instant fine-tuning for Bluetooth/mic latency) */}
            <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-lg border border-white/10 text-[9px]">
              <span className="text-white/40 font-bold uppercase text-[8px]">Sync:</span>
              <button
                type="button"
                onClick={() => handleAdjustSync(-0.2)}
                className="w-5 h-5 flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black rounded cursor-pointer"
                title="Lyrics 0.2s earlier"
              >
                -
              </button>
              <span className={`font-mono font-bold min-w-[28px] text-center ${syncOffset !== 0 ? 'text-amber-300' : 'text-white/60'}`}>
                {syncOffset > 0 ? `+${syncOffset.toFixed(1)}s` : `${syncOffset.toFixed(1)}s`}
              </span>
              <button
                type="button"
                onClick={() => handleAdjustSync(0.2)}
                className="w-5 h-5 flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black rounded cursor-pointer"
                title="Lyrics 0.2s later"
              >
                +
              </button>
              {syncOffset !== 0 && (
                <button
                  type="button"
                  onClick={handleResetSync}
                  className="text-white/40 hover:text-white text-[8px] uppercase font-bold ml-0.5"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-[#1C163D] p-0.5 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setViewMode('karaoke-words')}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'karaoke-words'
                    ? 'bg-[#6355FE] text-white shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Radio size={10} />
                <span>Sing Layer</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('full-lyrics')}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'full-lyrics'
                    ? 'bg-[#6355FE] text-white shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Eye size={10} />
                <span>Full Text</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Lead-In / Countdown Pill ("When to Sing") */}
      <AnimatePresence>
        {leadInSeconds !== null && leadInSeconds > 0 && leadInSeconds <= 6 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-white border border-amber-300/40 shadow-xl flex items-center gap-2">
              <Mic size={12} className="text-white animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">
                {leadInSeconds <= 3 ? (
                  `Breathe & Sing in ${Math.ceil(leadInSeconds)}...`
                ) : (
                  `Next Line in ${Math.ceil(leadInSeconds)}s`
                )}
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3].map((dot) => (
                  <span
                    key={dot}
                    className={`w-1.5 h-1.5 rounded-full ${
                      Math.ceil(leadInSeconds) <= 4 - dot
                        ? 'bg-white shadow-[0_0_6px_#fff] scale-125'
                        : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Lyrics Display Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-8 space-y-4 text-center scroll-smooth no-scrollbar relative"
        style={{ minHeight: isCompact ? '200px' : '280px' }}
      >
        {/* Top Fade Gradient */}
        <div className="sticky top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0A071A] to-transparent pointer-events-none -mt-8 z-10" />

        {viewMode === 'full-lyrics' ? (
          /* Full Text Static View */
          <div className="py-2 px-3 text-sm text-[#ECE6FF]/80 leading-loose whitespace-pre-line font-medium select-text">
            {fallbackLyrics || karaokeData.lines.map(l => l.text).join('\n')}
          </div>
        ) : (
          /* Real-time Word-by-Word Karaoke Synced Layer */
          karaokeData.lines.map((line, idx) => {
            const isCurrent = idx === activeLineIndex;
            const isPast = activeLineIndex !== -1 && idx < activeLineIndex;
            const isUpcoming = activeLineIndex === -1 || idx > activeLineIndex;
            const isNext = activeLineIndex !== -1 && idx === activeLineIndex + 1;

            return (
              <div
                key={line.id}
                ref={isCurrent ? activeLineRef : null}
                onClick={() => onSeek && onSeek(line.start)}
                className={`py-2 px-3 rounded-2xl transition-all duration-300 relative group select-none ${
                  onSeek ? 'cursor-pointer hover:bg-white/5 active:scale-[0.99]' : ''
                } ${
                  isCurrent
                    ? 'bg-[#1C153E]/90 border border-amber-400/40 shadow-lg shadow-amber-500/10 scale-102'
                    : isNext
                      ? 'opacity-80'
                      : isPast
                        ? 'opacity-35 hover:opacity-70'
                        : 'opacity-50 hover:opacity-85'
                }`}
              >
                {/* Active Line Glow Accent */}
                {isCurrent && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gradient-to-b from-amber-400 to-[#6355FE] rounded-full shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                )}

                {/* Section Badge (Verse/Chorus) */}
                {line.section && isCurrent && (
                  <div className="mb-1 flex items-center justify-center gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {line.section}
                    </span>
                    <span className="text-[8px] font-bold text-white/40 uppercase">
                      Tap line to rehearse
                    </span>
                  </div>
                )}

                {/* Words Container */}
                <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 ${
                  isCurrent ? 'text-lg sm:text-xl font-black leading-snug' : 'text-sm sm:text-base font-bold'
                }`}>
                  {line.words.map((wordObj, wIdx) => {
                    const isWordActive = isCurrent && effectiveTime >= wordObj.start && effectiveTime <= wordObj.end;
                    const isWordPast = (isCurrent && effectiveTime > wordObj.end) || isPast;
                    const wordProgress = isCurrent ? getWordProgress(wordObj, effectiveTime) : (isPast ? 100 : 0);

                    return (
                      <span
                        key={wIdx}
                        className={`relative inline-block transition-transform duration-100 ${
                          isWordActive ? 'scale-105 z-10' : ''
                        }`}
                      >
                        {/* Word indicator bead/dot above current word being sung */}
                        {isWordActive && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#FBBF24] animate-bounce pointer-events-none" />
                        )}

                        {/* Base word (background layer) */}
                        <span className={`transition-colors duration-200 ${
                          isWordPast
                            ? 'text-amber-200/90'
                            : isCurrent
                              ? 'text-white/40'
                              : 'text-white/60'
                        }`}>
                          {wordObj.word}
                        </span>

                        {/* Progress Karaoke Sweep Layer (Overlaid on top, fills left-to-right as sung) */}
                        {isCurrent && (
                          <span
                            className="absolute inset-0 overflow-hidden pointer-events-none whitespace-nowrap"
                            style={{ width: `${wordProgress}%` }}
                          >
                            <span className="text-amber-300 font-black drop-shadow-[0_0_10px_rgba(251,191,36,0.9)] bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                              {wordObj.word}
                            </span>
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* Micro Time label on hover/current */}
                {isCurrent && (
                  <div className="mt-1 flex items-center justify-center gap-2 text-[9px] font-bold text-amber-300/70">
                    <span>{Math.floor(line.start / 60)}:{(Math.floor(line.start % 60)).toString().padStart(2, '0')}</span>
                    <span>•</span>
                    <span>{line.words.length} words</span>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Bottom Fade Gradient */}
        <div className="sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0A071A] to-transparent pointer-events-none -mb-8 z-10" />
      </div>

      {/* Footer Helper Note */}
      <div className="px-4 py-2 bg-[#120F2B]/90 backdrop-blur-md border-t border-white/5 flex items-center justify-between text-[10px] text-white/50 shrink-0">
        <span className="flex items-center gap-1">
          <Music size={11} className="text-[#8E7CFF]" />
          Synchronized to instrumental tempo
        </span>
        {onSeek && (
          <span className="text-amber-300/70 font-semibold">
            Tap any line to jump & sing
          </span>
        )}
      </div>
    </div>
  );
};
