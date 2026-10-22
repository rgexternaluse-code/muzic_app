import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, Terminal, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <div className="p-5 rounded-3xl bg-[#14122B]/60 border border-white/10 space-y-4 text-left shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#6355FE]/20 text-[#8E7CFF] flex items-center justify-center border border-[#6355FE]/30 shrink-0">
            <Smartphone size={16} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF]">
              Device Installation (iOS & Android)
            </h2>
            <p className="text-[10px] text-white/50 font-medium">
              {isInstalled
                ? 'Installed as standalone app on this device'
                : 'Install directly to your Home Screen or sideload native IPA/APK'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {isInstallable && !isInstalled && (
          <button
            type="button"
            onClick={install}
            className="flex items-center justify-center gap-2 p-3.5 bg-[#6355FE] hover:bg-[#7467FF] active:scale-[0.98] text-white transition-all rounded-2xl text-[11px] font-bold cursor-pointer shadow-md shadow-[#6355FE]/30"
          >
            <Download size={16} />
            <span>Install App Now</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center justify-center gap-2 p-3.5 bg-[#1C153E] hover:bg-[#2B2651] active:scale-[0.98] text-[#ECE6FF] transition-all rounded-2xl text-[11px] font-bold border border-white/10 cursor-pointer shadow-md shadow-black/20"
        >
          <Smartphone size={16} className="text-[#8E7CFF]" />
          <span>{isIOS ? 'Install on This iPhone' : 'iPhone (.ipa & Safari) Guide'}</span>
        </button>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md rounded-3xl bg-[#16132E] border border-white/15 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#6355FE]/20 text-[#8E7CFF] flex items-center justify-center border border-[#6355FE]/30">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">How to Install Muzic on iPhone</h3>
                  <p className="text-[10px] text-[#8E7CFF] font-bold uppercase tracking-wider">
                    2 Ways to Install on iOS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Why .ipa shows black screen */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
              <p className="text-[11px] font-bold text-amber-300">
                Why opening Muzic-iOS.ipa on iPhone shows &quot;data 2.6 MB&quot;:
              </p>
              <p className="text-[11px] text-amber-100/80 leading-relaxed">
                Unlike Android (where tapping an <code>.apk</code> installs it), Apple blocks iPhones from installing <code>.ipa</code> files directly from the Files app or Safari. Tapping an <code>.ipa</code> only opens Apple&apos;s file preview screen.
              </p>
            </div>

            {/* Method 1: Instant Safari Install */}
            <div className="p-4 rounded-2xl bg-[#1E193B] border border-white/10 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#6355FE] text-white text-[9px] font-black uppercase">
                  Method 1 • No PC Needed
                </span>
                <h4 className="text-xs font-extrabold text-white">Direct Safari Home Screen App</h4>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Open the live Muzic web URL in <strong>Safari</strong> on your iPhone to install it directly as a full-screen iOS app with Lock Screen controls and Files audio import:
              </p>
              <ol className="text-[11px] text-[#ECE6FF] space-y-2 pt-1">
                <li className="flex items-center gap-2">
                  <Share size={14} className="text-[#8E7CFF] shrink-0" />
                  <span>1. Tap the <strong>Share</strong> button at the bottom of Safari.</span>
                </li>
                <li className="flex items-center gap-2">
                  <PlusSquare size={14} className="text-[#8E7CFF] shrink-0" />
                  <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </li>
              </ol>
            </div>

            {/* Method 2: Sideloading Muzic-iOS.ipa */}
            <div className="p-4 rounded-2xl bg-[#1E193B] border border-white/10 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[#8E7CFF] text-[9px] font-black uppercase">
                  Method 2 • Native .IPA
                </span>
                <h4 className="text-xs font-extrabold text-white">Install Muzic-iOS.ipa via Sideloadly</h4>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">
                To install the <code>Muzic-iOS.ipa</code> file built by GitHub Actions, Apple requires signing it with your free Apple ID using a computer:
              </p>
              <ol className="text-[11px] text-[#ECE6FF]/90 space-y-1.5 list-decimal list-inside">
                <li>Download <strong>Muzic-iOS.ipa</strong> on your Windows PC or Mac.</li>
                <li>Install <strong>Sideloadly</strong> (sideloadly.io) or <strong>AltStore</strong> (altstore.io).</li>
                <li>Connect your iPhone via USB, drag <code>Muzic-iOS.ipa</code> into Sideloadly, enter your Apple ID, and click <strong>Start</strong>.</li>
                <li>On iPhone, go to <strong>Settings &gt; General &gt; VPN &amp; Device Management</strong> and tap <strong>Trust</strong>.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 rounded-2xl bg-[#6355FE] hover:bg-[#7467FF] text-white text-xs font-bold transition cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
