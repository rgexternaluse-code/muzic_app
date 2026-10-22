import React, { useState } from 'react';
import { RefreshCw, FolderOpen, FileAudio, Trash2, Sun, Moon, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import appLogo from '../assets/images/muzic_app_logo_1786456453207.jpg';
import { useAuth } from '../context/AuthContext';

interface SettingsViewProps {
  folderInputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClearCache: () => void;
  onScanDirectory?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onBackToLibrary?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  folderInputRef,
  fileInputRef,
  onClearCache,
  onScanDirectory,
  theme = 'dark',
  onToggleTheme,
  onBackToLibrary,
}) => {
  const { currentUser, isVerified, signInWithGoogle, signOut } = useAuth();
  const [authBusy, setAuthBusy] = useState(false);

  const handleSignIn = async () => {
    setAuthBusy(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (
        e?.code !== 'auth/popup-closed-by-user' &&
        e?.code !== 'auth/cancelled-popup-request' &&
        !(typeof e?.message === 'string' && (e.message.includes('popup-closed-by-user') || e.message.includes('cancelled-popup-request')))
      ) {
        console.warn('Google sign-in status:', e?.message || e);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease-out]">
      {/* Header */}
      <header className="px-6 pt-10 pb-5 shrink-0">
        <div className="flex items-center gap-3.5">
          {onBackToLibrary && (
            <button 
              type="button" 
              onClick={onBackToLibrary}
              className="p-2 -ml-2 rounded-full hover:bg-white/5 active:scale-95 transition-all text-[#8E7CFF] cursor-pointer"
              title="Back to Library"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-[#6355FE]/25 shrink-0 bg-[#14122B]">
            <img src={appLogo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none text-white">Settings</h1>
            <p className="text-[11px] font-extrabold text-[#8E7CFF] uppercase tracking-widest mt-1">Theme & Library</p>
          </div>
        </div>
      </header>

      {/* Settings Container */}
      <main className="flex-1 overflow-y-auto px-6 pb-36 space-y-5">
        
        {/* User Account / Google 1-Tap Verification Panel */}
        <div className="p-5 rounded-3xl bg-[#14122B]/60 border border-white/10 space-y-4 text-left shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF]">Account & Verification</h2>
                <p className="text-[11px] text-white/60 font-medium mt-0.5">
                  {isVerified ? 'Google 1-Tap Verified' : 'Free verification unlocks 5 studio imports/month'}
                </p>
              </div>
            </div>
            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              isVerified 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-white/10 text-white/60 border-white/10'
            }`}>
              {isVerified ? 'Verified' : 'Free'}
            </span>
          </div>

          {isVerified && currentUser ? (
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="w-9 h-9 rounded-full object-cover border border-emerald-400" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#6355FE] text-white flex items-center justify-center font-bold text-xs">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-xs font-black text-white truncate block">{currentUser.displayName || 'Music Creator'}</span>
                  <span className="text-[10px] text-[#8F8E9C] truncate block">{currentUser.email}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={signOut}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={authBusy}
              className="w-full py-3 px-4 bg-white hover:bg-neutral-100 active:scale-95 text-neutral-900 rounded-2xl font-black text-xs tracking-wider cursor-pointer shadow-md flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
            >
              {authBusy ? (
                <>
                  <Loader2 size={16} className="animate-spin text-neutral-900" />
                  <span>Connecting Google Account...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Verify with Google (1-Tap)</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Appearance / Theme Switch */}
        <div className="p-5 rounded-3xl bg-[#14122B]/60 border border-white/10 space-y-3 text-left shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6355FE]/20 text-[#8E7CFF] flex items-center justify-center border border-[#6355FE]/30 shrink-0">
                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} className="text-amber-500" />}
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF]">Theme Mode</h2>
                <p className="text-[11px] text-white/60 font-medium mt-0.5">
                  {theme === 'dark' ? 'Dark theme is active' : 'Light theme is active'}
                </p>
              </div>
            </div>

            {/* Switch Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                theme === 'dark' ? 'bg-[#6355FE]' : 'bg-[#D6CFF7]'
              }`}
              role="switch"
              aria-checked={theme === 'dark'}
              title="Toggle Dark / Light theme"
            >
              <span className="sr-only">Toggle theme</span>
              <span
                className={`pointer-events-none inline-flex items-center justify-center h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  theme === 'dark' ? 'translate-x-6 text-[#6355FE]' : 'translate-x-0 text-amber-500'
                }`}
              >
                {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
              </span>
            </button>
          </div>
        </div>

        {/* Library Synchronization Panel */}
        <div className="p-5 rounded-3xl bg-[#14122B]/60 border border-white/10 space-y-4 text-left shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#6355FE]/20 text-[#8E7CFF] flex items-center justify-center border border-[#6355FE]/30">
              <RefreshCw size={16} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF]">Library Synchronization</h2>
              <p className="text-[10px] text-white/50 font-medium">Manage music files, local storage, and track indexes</p>
            </div>
          </div>

          <p className="text-[11px] text-[#ECE6FF]/80 leading-relaxed font-semibold">
            Scan your device folders or individual audio files into your library. You can also reset local metadata cache anytime.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button 
              type="button"
              onClick={onScanDirectory || (() => folderInputRef.current?.click())} 
              className="flex items-center justify-center gap-2 p-3.5 bg-[#1C153E] hover:bg-[#2B2651] active:scale-[0.98] text-[#ECE6FF] transition-all rounded-2xl text-[11px] font-bold border border-white/10 cursor-pointer shadow-md shadow-black/20"
            >
              <FolderOpen size={16} className="text-[#8E7CFF]" />
              <span>
                {Capacitor.getPlatform() === 'android' 
                  ? 'Scan Storage' 
                  : Capacitor.getPlatform() === 'ios' 
                    ? 'Import Music' 
                    : 'Scan Folder'}
              </span>
            </button>
            <button 
              type="button"
              onClick={() => {
                if (Capacitor.isNativePlatform() && onScanDirectory) {
                  onScanDirectory();
                } else {
                  fileInputRef.current?.click();
                }
              }} 
              className="flex items-center justify-center gap-2 p-3.5 bg-[#1C153E] hover:bg-[#2B2651] active:scale-[0.98] text-[#ECE6FF] transition-all rounded-2xl text-[11px] font-bold border border-white/10 cursor-pointer shadow-md shadow-black/20"
            >
              <FileAudio size={16} className="text-[#8E7CFF]" />
              <span>{Capacitor.isNativePlatform() ? 'Pick Audio' : 'Index Files'}</span>
            </button>
          </div>

          <button 
            type="button"
            onClick={onClearCache}
            className="w-full mt-2 py-3 bg-red-500/10 hover:bg-red-500/20 active:scale-[0.98] text-red-300 hover:text-red-200 rounded-2xl text-[11px] font-bold transition-all border border-red-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 size={15} />
            <span>Clear Local Tracks Cache</span>
          </button>
        </div>
      </main>
    </div>
  );
};
