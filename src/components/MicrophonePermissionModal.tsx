/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Music, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  X, 
  AlertCircle, 
  Loader2,
  CheckCircle2,
  Volume2
} from 'lucide-react';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGrantPermission: () => Promise<void>;
  isRequesting: boolean;
  permissionError: string | null;
  theme?: 'dark' | 'light';
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  isOpen,
  onClose,
  onGrantPermission,
  isRequesting,
  permissionError,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={`w-full max-w-sm rounded-[32px] p-6 sm:p-7 shadow-2xl border text-left relative overflow-hidden transition-colors ${
              isDark 
                ? 'bg-[#120F28] border-white/10 text-white' 
                : 'bg-white border-[#6355FE]/20 text-[#120F26] shadow-[0_20px_50px_rgba(99,85,254,0.18)]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 blur-3xl pointer-events-none rounded-full ${
              isDark ? 'bg-red-500/20' : 'bg-red-500/10'
            }`} />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isRequesting}
              className={`absolute top-5 right-5 p-2 rounded-full cursor-pointer transition-all active:scale-95 ${
                isDark 
                  ? 'text-white/40 hover:text-white hover:bg-white/10' 
                  : 'text-[#7A7596] hover:text-[#120F26] hover:bg-neutral-100'
              }`}
              title="Close"
            >
              <X size={18} />
            </button>

            {/* Hero Icon with Live Pulse Ring */}
            <div className="relative mb-5 flex items-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-500 to-[#6355FE] text-white flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0">
                <Mic size={26} strokeWidth={2.5} className="animate-pulse" />
              </div>
              <div className="ml-3.5 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block">
                  Singing Studio
                </span>
                <h2 className={`text-lg font-black tracking-tight leading-tight ${isDark ? 'text-white' : 'text-[#120F26]'}`}>
                  Allow Microphone Access
                </h2>
              </div>
            </div>

            {/* Explanation Body */}
            <div className="space-y-3.5">
              <p className={`text-xs font-semibold leading-relaxed ${isDark ? 'text-[#ECE6FF]/80' : 'text-[#585474]'}`}>
                To start singing and record your voice in sync with the backing music and live karaoke lyrics, please allow microphone access.
              </p>

              {/* Feature Highlights */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 text-[11px] font-medium ${
                isDark 
                  ? 'bg-black/30 border-white/5' 
                  : 'bg-[#F6F4FF] border-[#6355FE]/15'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <Mic size={12} />
                  </div>
                  <span className={isDark ? 'text-white/90' : 'text-[#120F26]'}>
                    <strong>High-Definition Studio Mic:</strong> Captures your real-time singing voice
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-[#6355FE]/20 text-[#8E7CFF] flex items-center justify-center shrink-0">
                    <Music size={12} />
                  </div>
                  <span className={isDark ? 'text-white/90' : 'text-[#120F26]'}>
                    <strong>Karaoke Sync:</strong> Synchronizes with backing track & timed lyrics
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={12} />
                  </div>
                  <span className={isDark ? 'text-white/90' : 'text-[#120F26]'}>
                    <strong>100% Private:</strong> Audio processing stays on your device
                  </span>
                </div>
              </div>

              {/* Permission Error / Denied Notice */}
              {permissionError && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl text-[11px] font-semibold text-red-300 space-y-1.5 animate-[shake_0.2s_ease-in-out]">
                  <div className="flex items-center gap-2 font-black text-red-200">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>Microphone Permission Blocked</span>
                  </div>
                  <p className="text-[10px] text-red-200/80 leading-relaxed pl-5">
                    {permissionError}
                  </p>
                  <p className="text-[10px] text-white/70 pl-5">
                    💡 Tip: Click the lock / permissions icon in your browser address bar or device settings, enable microphone access, and tap <strong>Try Again</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-5 space-y-2">
              <button
                type="button"
                onClick={onGrantPermission}
                disabled={isRequesting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-red-500 to-[#6355FE] hover:brightness-110 active:scale-[0.98] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRequesting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Requesting Permission...</span>
                  </>
                ) : permissionError ? (
                  <>
                    <Mic size={16} />
                    <span>Try Again & Allow Mic</span>
                  </>
                ) : (
                  <>
                    <Mic size={16} />
                    <span>Allow Mic & Start Singing</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isRequesting}
                className={`w-full py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
                  isDark 
                    ? 'text-white/40 hover:text-white' 
                    : 'text-[#7A7596] hover:text-[#120F26]'
                }`}
              >
                Not Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
