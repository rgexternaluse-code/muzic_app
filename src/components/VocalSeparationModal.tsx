/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Sparkles, 
  ShieldAlert, 
  CloudOff, 
  Upload, 
  Music, 
  Info, 
  CheckCircle2, 
  FileAudio,
  Cpu,
  Server,
  Loader2,
  Zap,
  FolderPlus,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { vocalSeparationService, extractClientSideKaraokeAudio } from '../services/vocalSeparationService';
import { Track } from '../types';
import { useAuth } from '../context/AuthContext';

interface VocalSeparationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  onRequestVerification?: () => void;
  onSelectSeparatedTrack: (track: Track) => void;
  onShowToast: (message: string, icon?: React.ReactNode, subtitle?: string) => void;
}

export function VocalSeparationModal({
  isOpen,
  onClose,
  tracks,
  onRequestVerification,
  onSelectSeparatedTrack,
  onShowToast
}: VocalSeparationModalProps) {
  const { isVerified } = useAuth();
  const [modalMode, setModalMode] = useState<'on_device' | 'cloud'>('on_device');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isProcessingDsp, setIsProcessingDsp] = useState(false);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Cloud backend testing state
  const [cloudStep, setCloudStep] = useState<'consent' | 'select' | 'status'>('consent');
  const [hasConsented, setHasConsented] = useState(false);
  const [selectedCloudFile, setSelectedCloudFile] = useState<{ name: string; size: number } | null>(null);
  const [isSubmittingCloud, setIsSubmittingCloud] = useState(false);

  if (!isOpen) return null;

  const isConfigured = vocalSeparationService.isBackendConfigured();

  // Instant On-Device AI Karaoke Extraction (₹0 cost, instant, client-side DSP)
  const handleExtractKaraokeOnDevice = async () => {
    // Verification Gate: AI vocal remover will be available once gmail verification is done
    if (!isVerified) {
      if (onRequestVerification) {
        onRequestVerification();
      }
      onShowToast(
        'Gmail verification required for AI Vocal Remover.',
        <ShieldCheck size={16} className="text-[#8E7CFF]" />,
        'Google 1-Tap sign-in unlocks instant karaoke vocal isolation'
      );
      return;
    }

    let audioTarget: File | string | null = null;
    let trackTitle = 'Karaoke Track';
    let trackArtist = 'Instrumental';

    if (uploadedAudioFile) {
      audioTarget = uploadedAudioFile;
      trackTitle = uploadedAudioFile.name.replace(/\.[^/.]+$/, '') + ' (Karaoke)';
      trackArtist = 'Uploaded File';
    } else if (selectedTrack) {
      audioTarget = selectedTrack.url;
      trackTitle = `${selectedTrack.title} (Karaoke)`;
      trackArtist = selectedTrack.artist;
    } else {
      onShowToast('Please select a song or upload an audio file first.');
      return;
    }

    setIsProcessingDsp(true);
    onShowToast('Isolating karaoke music & cancelling center vocals...', <Sparkles size={16} className="text-[#8E7CFF] animate-spin" />);

    try {
      const result = await extractClientSideKaraokeAudio(audioTarget);
      
      const separatedTrack: Track = {
        id: `extracted_karaoke_${Date.now()}`,
        title: trackTitle,
        artist: trackArtist,
        album: 'Muzic Karaoke Studio',
        duration: result.duration,
        url: result.url,
        format: 'WAV',
        size: result.blob.size
      };

      onSelectSeparatedTrack(separatedTrack);
      onShowToast('Karaoke instrumental isolated successfully!', <CheckCircle2 size={16} className="text-emerald-400" />);
      onClose();
    } catch (err: any) {
      console.error('On-device vocal cancellation error:', err);
      onShowToast('Karaoke extraction failed: ' + err.message, <CloudOff size={16} className="text-red-400" />);
    } finally {
      setIsProcessingDsp(false);
    }
  };

  const handleModalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedAudioFile(file);
      setSelectedTrack(null);
      onShowToast(`Uploaded "${file.name}"`, <FileAudio size={16} className="text-emerald-400" />);
    }
  };

  // Cloud job submission test
  const handleStartCloudProcess = async () => {
    if (!selectedCloudFile) return;

    setIsSubmittingCloud(true);
    setCloudStep('status');

    try {
      const dummyBlob = new Blob(['sample-audio-data'], { type: 'audio/mp3' });
      const job = await vocalSeparationService.submitSeparationJob({
        audioFile: dummyBlob,
        fileName: selectedCloudFile.name,
        userConsentGiven: hasConsented,
        modelTarget: 'vocals_instrumental'
      });

      if (job.status === 'backend_unconfigured') {
        onShowToast(
          'Cloud AI Backend Offline (₹0 Budget)',
          <CloudOff size={16} className="text-amber-400" />,
          'API boundary verified'
        );
      }
    } finally {
      setIsSubmittingCloud(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-lg bg-[#120F24] border border-[#6355FE]/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] text-left"
      >
        {/* Header */}
        <div className="p-5 pb-3 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-[#1C153E]/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] border border-[#6355FE]/30 shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                AI Karaoke & Vocal Remover
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black px-2 py-0.5 rounded-full uppercase">
                  Active
                </span>
              </h2>
              <p className="text-[11px] font-bold text-[#8F8E9C]">Break any song into instrumental karaoke music & lyrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector: On-Device DSP (Instant & Free) vs Cloud Deep Learning Server */}
        <div className="px-5 pt-3">
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setModalMode('on_device')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modalMode === 'on_device' ? 'bg-[#6355FE] text-white shadow-md' : 'text-[#8F8E9C] hover:text-white'
              }`}
            >
              <Zap size={13} className="text-amber-300" />
              <span>Instant Karaoke (On-Device)</span>
            </button>
            <button
              type="button"
              onClick={() => setModalMode('cloud')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modalMode === 'cloud' ? 'bg-[#6355FE] text-white shadow-md' : 'text-[#8F8E9C] hover:text-white'
              }`}
            >
              <Server size={13} />
              <span>Cloud Server</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {modalMode === 'on_device' ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-[#1C153E] to-[#120F2B] border border-[#6355FE]/30 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                  <Zap size={14} />
                  <span>Instant Client-Side Stereo Mid-Side DSP</span>
                </div>
                <p className="text-[11px] text-white/80 leading-relaxed font-medium">
                  Cancels center-panned vocals while retaining stereo instruments, bassline, and kick drum (sub-140Hz). Runs 100% locally on your device with 0 cloud cost and zero latency.
                </p>
              </div>

              {/* Upload custom song file button */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8E7CFF] block">
                  Option 1: Upload Song Audio File
                </span>
                <div 
                  onClick={() => modalFileInputRef.current?.click()}
                  className="p-4 bg-white/5 border border-dashed border-white/15 rounded-2xl text-center space-y-2 cursor-pointer hover:border-[#6355FE]/50 hover:bg-white/[0.08] transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] mx-auto border border-[#6355FE]/30">
                    <Upload size={18} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">
                      {uploadedAudioFile ? uploadedAudioFile.name : 'Choose audio file (MP3, WAV, M4A)'}
                    </p>
                    <p className="text-[10px] text-[#8F8E9C]">
                      {uploadedAudioFile ? `${(uploadedAudioFile.size / (1024 * 1024)).toFixed(1)} MB • Click to change file` : 'Upload any song to cancel vocals & make karaoke'}
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  ref={modalFileInputRef}
                  accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac"
                  onChange={handleModalFileUpload}
                  className="hidden"
                />
              </div>

              {/* Select from existing library tracks */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8E7CFF] block">
                  Option 2: Select from Music Library
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {tracks.length === 0 ? (
                    <div className="p-4 text-center bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[11px] text-[#8F8E9C]">No songs found in local library. Upload a file above.</p>
                    </div>
                  ) : (
                    tracks.slice(0, 15).map(track => {
                      const isSelected = !uploadedAudioFile && selectedTrack?.id === track.id;
                      return (
                        <div
                          key={track.id}
                          onClick={() => {
                            setSelectedTrack(track);
                            setUploadedAudioFile(null);
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected ? 'bg-[#1C153E] border-[#6355FE]' : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileAudio size={16} className="text-[#8E7CFF] shrink-0" />
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-white truncate">{track.title}</h4>
                              <p className="text-[10px] text-[#8F8E9C] truncate">{track.artist}</p>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Verification Info Banner if not verified */}
              {!isVerified && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldCheck size={16} className="text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Gmail Verification Required</p>
                      <p className="text-[10px] text-amber-200/80 truncate">Sign in with Google (100% free) to unlock AI vocal removal.</p>
                    </div>
                  </div>
                  {onRequestVerification && (
                    <button
                      type="button"
                      onClick={onRequestVerification}
                      className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 cursor-pointer shadow-sm active:scale-95 transition-all"
                    >
                      Verify Free
                    </button>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                disabled={(!uploadedAudioFile && !selectedTrack) || isProcessingDsp}
                onClick={handleExtractKaraokeOnDevice}
                className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-[#6355FE] to-[#8E7CFF] disabled:opacity-40 hover:brightness-110 active:scale-[0.99] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-[#6355FE]/30 flex items-center justify-center gap-2"
              >
                {isProcessingDsp ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-white" />
                    <span>Extracting Karaoke Track...</span>
                  </>
                ) : !isVerified ? (
                  <>
                    <Lock size={15} className="text-amber-300" />
                    <span>Verify with Gmail to Extract Karaoke</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="text-amber-300" />
                    <span>Extract Karaoke Music (0 Cost)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Cloud Server Deep Learning Boundary */
            <div className="space-y-4">
              {cloudStep === 'consent' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-400/10 border border-amber-400/20 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                      <ShieldAlert size={16} />
                      <span>Privacy & Cloud Processing Disclosure</span>
                    </div>
                    <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                      To protect device battery and keep Muzic fast on all Android phones, AI stem separation models (Demucs / Spleeter) require remote cloud server processing.
                    </p>
                    <ul className="text-[11px] text-amber-200/80 space-y-1 list-disc list-inside">
                      <li>Your audio will be uploaded to a secure processing server over HTTPS.</li>
                      <li>Files are stored temporarily solely during stem separation and auto-deleted within 24 hours.</li>
                      <li>No audio is ever shared or redistributed.</li>
                    </ul>
                  </div>

                  {/* Architecture & Budget Status */}
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-[#8E7CFF] font-black text-xs uppercase tracking-wider">
                      <Server size={14} />
                      <span>Cloud Backend Status (Section 6 Compliance)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-[#8F8E9C]">Initial AI Hosting Budget:</span>
                      <span className="font-bold text-white">₹0 (Zero Cost Constraint)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1 border-t border-white/5">
                      <span className="text-[#8F8E9C]">Backend Server State:</span>
                      <span className={`font-bold ${isConfigured ? 'text-green-400' : 'text-amber-400'}`}>
                        {isConfigured ? 'Configured & Ready' : 'Unconfigured / Offline'}
                      </span>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasConsented}
                      onChange={(e) => setHasConsented(e.target.checked)}
                      className="mt-0.5 rounded border-white/20 text-[#6355FE] focus:ring-0 w-4 h-4"
                    />
                    <span className="text-xs text-white/90 font-medium">
                      I understand and consent to uploading audio to the cloud separation server when a backend is configured.
                    </span>
                  </label>

                  <button
                    disabled={!hasConsented}
                    onClick={() => setCloudStep('select')}
                    className="w-full py-3.5 bg-[#6355FE] disabled:opacity-40 hover:bg-[#7265FF] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-[#6355FE]/25"
                  >
                    Proceed to Select Song
                  </button>
                </div>
              )}

              {cloudStep === 'select' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#8E7CFF]">Choose Song for Cloud Separation</h3>
                    <p className="text-xs text-[#8F8E9C]">Select a song from your local library to test the separation submission pipeline.</p>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {tracks.slice(0, 15).map(track => {
                      const isSelected = selectedCloudFile?.name === track.title;
                      return (
                        <div
                          key={track.id}
                          onClick={() => setSelectedCloudFile({ name: track.title, size: track.size || 4000000 })}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected ? 'bg-[#1C153E] border-[#6355FE]' : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileAudio size={18} className="text-[#8E7CFF] shrink-0" />
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-white truncate">{track.title}</h4>
                              <p className="text-[10px] text-[#8F8E9C] truncate">{track.artist}</p>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={16} className="text-[#8E7CFF] shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setCloudStep('consent')}
                      className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-[#8F8E9C] cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      disabled={!selectedCloudFile || isSubmittingCloud}
                      onClick={handleStartCloudProcess}
                      className="flex-1 py-3.5 bg-[#6355FE] disabled:opacity-40 hover:bg-[#7265FF] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-[#6355FE]/25 flex items-center justify-center gap-2"
                    >
                      <Sparkles size={14} />
                      <span>Request Separation</span>
                    </button>
                  </div>
                </div>
              )}

              {cloudStep === 'status' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-400/10 border border-amber-400/20 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                      <CloudOff size={16} />
                      <span>Cloud Separation Endpoint Not Configured</span>
                    </div>
                    <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                      As planned for the ₹0 initial budget phase, cloud GPU processing is not yet provisioned. Use the "Instant Karaoke (On-Device)" tab for free zero-cost client extraction!
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setCloudStep('consent');
                      setModalMode('on_device');
                    }}
                    className="w-full py-3.5 bg-[#6355FE] hover:bg-[#7265FF] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Switch to Instant On-Device Karaoke
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
