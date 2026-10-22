import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, X, Volume2, RotateCcw, Check, Sparkles, Activity, Music, Moon, AudioLines } from 'lucide-react';

export type EqPresetKey = 'bass-boost' | 'vocal' | 'electronica' | 'lofi' | 'rock' | 'acoustic' | 'flat' | 'custom';

export interface EqPresetInfo {
  id: EqPresetKey;
  name: string;
  badge: string;
  description: string;
  color: string;
  bands: [number, number, number, number, number]; // [60Hz, 250Hz, 1kHz, 4kHz, 14kHz] in dB (-12 to +12)
}

export const EQ_PRESETS: Record<Exclude<EqPresetKey, 'custom'>, EqPresetInfo> = {
  'bass-boost': {
    id: 'bass-boost',
    name: 'Bass Boost',
    badge: 'Heavy Bass',
    description: 'Deep 60Hz punch & sub-bass drive',
    color: '#8E7CFF',
    bands: [6, 4, 0, 0, -1]
  },
  'vocal': {
    id: 'vocal',
    name: 'Vocal Boost',
    badge: 'Crisp Mids',
    description: 'Crisp vocal clarity & speech presence',
    color: '#34D399',
    bands: [-2, 1, 5, 3, 0]
  },
  'electronica': {
    id: 'electronica',
    name: 'Electronica / EDM',
    badge: 'Dynamic Club',
    description: 'Punchy kick-bass & sparkling highs',
    color: '#38BDF8',
    bands: [5, 2, -2, 3, 5]
  },
  'lofi': {
    id: 'lofi',
    name: 'Lo-Fi Warmth',
    badge: 'Vintage Vibe',
    description: 'Warm vintage tone & tape roll-off',
    color: '#FBBF24',
    bands: [-1, 3, 2, -3, -6]
  },
  'rock': {
    id: 'rock',
    name: 'Rock & Pop',
    badge: 'Energetic',
    description: 'Driving low-mids, snare & guitar energy',
    color: '#F43F5E',
    bands: [4, 2, -1, 3, 4]
  },
  'acoustic': {
    id: 'acoustic',
    name: 'Acoustic / Jazz',
    badge: 'Airy Stage',
    description: 'Airy highs & organic acoustic strings',
    color: '#A78BFA',
    bands: [2, 0, 1, 4, 3]
  },
  'flat': {
    id: 'flat',
    name: 'Flat (Neutral)',
    badge: 'Studio Pure',
    description: 'Balanced uncolored frequency response',
    color: '#9CA3AF',
    bands: [0, 0, 0, 0, 0]
  }
};

export const FREQ_BANDS = [
  { label: '60 Hz', name: 'Sub-Bass', min: -12, max: 12 },
  { label: '250 Hz', name: 'Low-Mid', min: -12, max: 12 },
  { label: '1 kHz', name: 'Midrange', min: -12, max: 12 },
  { label: '4 kHz', name: 'Presence', min: -12, max: 12 },
  { label: '14 kHz', name: 'Treble / Air', min: -12, max: 12 }
];

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreset: EqPresetKey;
  customBands: [number, number, number, number, number];
  onSelectPreset: (preset: EqPresetKey) => void;
  onBandChange: (index: number, value: number) => void;
  isPlaying?: boolean;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  currentPreset,
  customBands,
  onSelectPreset,
  onBandChange,
  isPlaying = false
}) => {
  if (!isOpen) return null;

  const activePresetInfo = currentPreset !== 'custom' ? EQ_PRESETS[currentPreset] : null;

  const getPresetIcon = (presetKey: EqPresetKey) => {
    switch (presetKey) {
      case 'bass-boost':
        return <Volume2 size={16} className="text-[#8E7CFF]" />;
      case 'vocal':
        return <Activity size={16} className="text-emerald-400" />;
      case 'electronica':
        return <Sparkles size={16} className="text-cyan-400" />;
      case 'lofi':
        return <Moon size={16} className="text-amber-400" />;
      case 'rock':
        return <SlidersHorizontal size={16} className="text-rose-400" />;
      case 'acoustic':
        return <Music size={16} className="text-violet-400" />;
      case 'flat':
      default:
        return <AudioLines size={16} className="text-gray-300" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[280] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="relative w-full sm:max-w-md bg-[#120F24] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col z-10 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] border border-[#6355FE]/30 shrink-0">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight leading-none text-white">Audio Equalizer</h3>
                <p className="text-[11px] text-[#8E7CFF] font-bold uppercase tracking-wider mt-1">
                  Active Setting: {activePresetInfo ? activePresetInfo.name : 'Custom Tuning'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
              title="Close Equalizer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            
            {/* Real-time Visualizer Curve & Band preview */}
            <div className="p-4 rounded-2xl bg-[#1A1633]/80 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    5-Band Graphic Response
                  </span>
                </div>
                {activePresetInfo && (
                  <span 
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-white/10"
                    style={{ color: activePresetInfo.color, backgroundColor: `${activePresetInfo.color}15` }}
                  >
                    {activePresetInfo.badge}
                  </span>
                )}
              </div>

              {/* Graphic EQ Bars preview */}
              <div className="flex items-end justify-between gap-3 h-20 px-2 pt-2 pb-1 border-b border-white/5">
                {customBands.map((db, idx) => {
                  // Normalize -12 to +12 into percentage height (15% to 95%)
                  const heightPercent = Math.min(95, Math.max(15, 55 + (db / 12) * 40));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <motion.div
                        className="w-full max-w-[28px] rounded-t-lg relative overflow-hidden"
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        style={{
                          background: db >= 0 
                            ? 'linear-gradient(to top, #6355FE, #8E7CFF)' 
                            : 'linear-gradient(to top, #4A4470, #6E689C)'
                        }}
                      >
                        {isPlaying && (
                          <motion.div
                            className="absolute inset-0 bg-white/20"
                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 0.6 + idx * 0.15, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                      <span className="text-[9px] font-mono font-bold text-white/70">
                        {db > 0 ? `+${db}` : db}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center px-1 pt-2">
                {FREQ_BANDS.map((band, idx) => (
                  <div key={idx} className="text-center flex-1">
                    <p className="text-[9px] font-black text-white/80">{band.label}</p>
                    <p className="text-[8px] text-white/40">{band.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF]">
                  Equalizer Sound Presets
                </h4>
                <button
                  type="button"
                  onClick={() => onSelectPreset('flat')}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw size={11} />
                  Reset to Flat
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {(Object.keys(EQ_PRESETS) as (keyof typeof EQ_PRESETS)[]).map((key) => {
                  const preset = EQ_PRESETS[key];
                  const isSelected = currentPreset === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelectPreset(key)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer group relative overflow-hidden ${
                        isSelected
                          ? 'bg-[#6355FE]/20 border-[#6355FE] shadow-lg shadow-[#6355FE]/20 ring-1 ring-[#8E7CFF]/50'
                          : 'bg-[#181432]/60 hover:bg-[#1C173B] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="p-1.5 rounded-xl bg-white/5 border border-white/5">
                          {getPresetIcon(key)}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#6355FE] text-white flex items-center justify-center">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black tracking-tight text-white">{preset.name}</p>
                        </div>
                        <p className="text-[9px] text-white/50 line-clamp-1 mt-0.5">{preset.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive 5-Band Slider Adjuster */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF]">
                  Frequency Sliders (Custom EQ)
                </h4>
                <span className="text-[10px] text-white/40 font-mono">Range: -12dB to +12dB</span>
              </div>

              <div className="space-y-3 bg-[#181432]/50 p-4 rounded-2xl border border-white/5">
                {FREQ_BANDS.map((band, idx) => {
                  const val = customBands[idx];
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{band.label}</span>
                          <span className="text-[10px] text-white/40">({band.name})</span>
                        </div>
                        <span className={`font-mono text-xs font-bold ${val > 0 ? 'text-[#8E7CFF]' : val < 0 ? 'text-amber-400' : 'text-white/60'}`}>
                          {val > 0 ? `+${val} dB` : `${val} dB`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={band.min}
                        max={band.max}
                        step={1}
                        value={val}
                        onChange={(e) => onBandChange(idx, parseInt(e.target.value, 10))}
                        className="w-full accent-[#8E7CFF] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Footer Done Action */}
          <div className="p-4 border-t border-white/5 bg-[#141029] flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-[#6355FE] hover:bg-[#7264FF] active:scale-[0.98] text-white font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#6355FE]/30 text-xs tracking-wider uppercase"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
