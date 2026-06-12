import React from 'react';
import { Laptop, ExternalLink } from 'lucide-react';

interface SettingsViewProps {
  folderInputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClearCache: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  folderInputRef,
  fileInputRef,
  onClearCache,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease-out]">
      {/* Header */}
      <header className="px-6 pt-10 pb-4 shrink-0 space-y-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight leading-none text-white">Settings</h1>
          <p className="text-[11px] font-extrabold text-[#8E7CFF] uppercase tracking-widest mt-1">Device and build details</p>
        </div>
      </header>

      {/* Settings Options Scroll Container */}
      <main className="flex-1 overflow-y-auto px-6 pb-40 space-y-6">
        
        {/* Sync panel */}
        <div className="p-5 rounded-3xl bg-[#14122B]/40 border border-white/5 space-y-4 text-left">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF]">Library Synchronization</h2>
          <p className="text-[11px] opacity-60 leading-normal font-bold">
            Connect devices, clear local cache indexes, or load static media directories.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button 
              type="button"
              onClick={() => folderInputRef.current?.click()} 
              className="p-3 bg-[#1C153E] text-[#ECE6FF] hover:bg-[#2B2651] active:scale-95 transition-all rounded-xl text-[10px] font-black uppercase tracking-wider border border-white/5 cursor-pointer"
            >
              📂 Scan Folder
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()} 
              className="p-3 bg-[#1C153E] text-[#ECE6FF] hover:bg-[#2B2651] active:scale-95 transition-all rounded-xl text-[10px] font-black uppercase tracking-wider border border-white/5 cursor-pointer"
            >
              🎵 Index File
            </button>
          </div>
          <button 
            type="button"
            onClick={onClearCache}
            className="w-full py-2.5 bg-red-500/10 text-red-100 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-red-500/10 cursor-pointer"
          >
            🗑️ Clear Local Tracks Cache
          </button>
        </div>

        {/* Binary CLI compilers guide */}
        <div className="p-5 rounded-3xl bg-[#14122B]/40 border border-white/5 space-y-4 text-left">
          <div className="flex items-center gap-2">
            <Laptop size={18} className="text-[#8E7CFF]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF]">No Android Studio? Direct CLI Build</h2>
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed font-semibold">
            You **do not need** to install or run full Android Studio to build an APK! You can use the direct **Gradle/Capacitor Command Line interface** right inside your shell.
          </p>

          <div className="space-y-3 pt-1 text-[11px] font-bold">
            <div className="space-y-1">
              <span className="text-[#ECE6FF] uppercase text-[9px] tracking-wider block">1. Run Capacitor Sync:</span>
              <code className="block bg-[#080714] p-2.5 rounded-xl text-emerald-400 font-mono text-[9px] select-all">
                npm run build && npx cap sync
              </code>
            </div>

            <div className="space-y-1">
              <span className="text-[#ECE6FF] uppercase text-[9px] tracking-wider block">2. Direct Shell Compile (without Android Studio):</span>
              <p className="text-[10px] opacity-60 leading-normal mb-1">
                Java JDK is indispensable to package android projects. However, you can run Gradle compiling directly from terminal using:
              </p>
              <code className="block bg-[#080714] p-2.5 rounded-xl text-emerald-400 font-mono text-[9px] select-all">
                cd android && ./gradlew assembleDebug
              </code>
              <p className="text-[9px] text-[#8E7CFF] mt-1 uppercase tracking-wider font-extrabold">
                🎯 Output APK Location: <span className="text-white">android/app/build/outputs/apk/debug/app-debug.apk</span>
              </p>
            </div>
          </div>
        </div>

        {/* Git pulls panel */}
        <div className="p-5 rounded-3xl bg-[#14122B]/40 border border-white/5 space-y-3.5 text-left">
          <div className="flex items-center gap-2">
            <ExternalLink size={18} className="text-[#8E7CFF]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF]">Sync Latest Code From Git</h2>
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed font-semibold">
            To update your workspace's files directly with another git repository's master codebase, you can execute standard git commands in the workspace terminal:
          </p>
          <div className="space-y-2 font-mono text-[9px] text-emerald-400 bg-[#080714] p-3 rounded-xl select-all select-all space-y-2.5 leading-relaxed">
            <p className="text-[#8F8E9C]/60 text-[8px] uppercase tracking-wider mb-1 font-semibold"># Initial Setup (If first time linking remote)</p>
            <p>git remote add origin YOUR_REPO_URL</p>
            <p className="text-[#8F8E9C]/60 text-[8px] uppercase tracking-wider mt-2 mb-1 font-semibold"># Pull and integrate master code</p>
            <p>git fetch --all</p>
            <p>git reset --hard origin/main</p>
          </div>
          <p className="text-[10px] opacity-40 uppercase tracking-wide leading-relaxed font-black block pt-1 text-center">
            💡 This keeps your files synchronous with cloud repos instantaneously!
          </p>
        </div>
      </main>
    </div>
  );
};
