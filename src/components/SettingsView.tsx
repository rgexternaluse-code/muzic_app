import React from 'react';
import { RefreshCw, FolderOpen, FileAudio, Trash2, Sun, Moon } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import appLogo from '../assets/images/muzic_app_logo_1786456453207.jpg';

interface SettingsViewProps {
  folderInputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClearCache: () => void;
  onScanDirectory?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  folderInputRef,
  fileInputRef,
  onClearCache,
  onScanDirectory,
  theme = 'dark',
  onToggleTheme,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease-out]">
      {/* Header */}
      <header className="px-6 pt-10 pb-5 shrink-0">
        <div className="flex items-center gap-3.5">
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
