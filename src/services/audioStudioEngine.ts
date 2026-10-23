/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudioMixerSettings, CombinedMixResult } from '../types/studio';
import { audioBufferToWavBlob } from '../data/instrumentals';

export class AudioStudioEngine {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  
  // Real-time audio metering
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private meterAnimationId: number | null = null;
  private onMeterLevelCallback: ((level: number) => void) | null = null;

  // Sync playback elements
  private backingAudioEl: HTMLAudioElement | null = null;
  private voiceAudioEl: HTMLAudioElement | null = null;

  constructor() {
    // Lazily initialized on first user gesture
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Request microphone permission with high-fidelity studio constraints
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone audio recording is not supported in this browser or WebView environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // Turn off aggressive DSP for vocal singing fidelity
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2
        }
      });

      // Quick test then release until actual recording starts
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (err: any) {
      console.warn('Microphone permission request failed:', err);
      return false;
    }
  }

  /**
   * Start recording voice while playing backing track in sync
   */
  public async startRecording(
    backingAudioUrl: string,
    onMeterLevel?: (level: number) => void
  ): Promise<void> {
    const ctx = this.getAudioContext();
    this.recordedChunks = [];
    this.onMeterLevelCallback = onMeterLevel || null;

    // 1. Acquire microphone stream
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    // 2. Setup Analyser for real-time visualizer
    const sourceNode = ctx.createMediaStreamSource(this.mediaStream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    sourceNode.connect(this.analyser);
    // Note: Do NOT connect sourceNode to ctx.destination to avoid mic feedback loop!

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    this.startMeterLoop();

    // 3. Prepare MediaRecorder (prefer audio/webm;codecs=opus or audio/mp4 or fallback)
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.mediaStream, mimeType ? { mimeType } : undefined);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // 4. Setup backing audio element for simultaneous sync start
    this.backingAudioEl = new Audio(backingAudioUrl);
    this.backingAudioEl.preload = 'auto';

    // Wait until backing track is ready to play to ensure tight synchronization
    await new Promise<void>((resolve, reject) => {
      if (!this.backingAudioEl) return resolve();
      
      const onCanPlay = () => {
        cleanup();
        resolve();
      };
      const onError = (e: any) => {
        cleanup();
        reject(new Error('Failed to load backing track for recording: ' + (e?.message || 'network error')));
      };

      const cleanup = () => {
        this.backingAudioEl?.removeEventListener('canplaythrough', onCanPlay);
        this.backingAudioEl?.removeEventListener('error', onError);
      };

      this.backingAudioEl.addEventListener('canplaythrough', onCanPlay);
      this.backingAudioEl.addEventListener('error', onError);

      // In case it was already cached
      if (this.backingAudioEl.readyState >= 3) {
        cleanup();
        resolve();
      }
    });

    // Start recorder and backing audio simultaneously
    this.backingAudioEl.currentTime = 0;
    this.mediaRecorder.start(100); // 100ms slice for low latency chunking
    await this.backingAudioEl.play();
  }

  public getRecordingCurrentTime(): number {
    return this.backingAudioEl ? this.backingAudioEl.currentTime : 0;
  }

  private startMeterLoop() {
    const update = () => {
      if (this.analyser && this.dataArray && this.onMeterLevelCallback) {
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i];
        }
        const avg = sum / this.dataArray.length;
        const normalized = Math.min(1, avg / 128); // 0.0 to 1.0
        this.onMeterLevelCallback(normalized);
      }
      this.meterAnimationId = requestAnimationFrame(update);
    };
    this.meterAnimationId = requestAnimationFrame(update);
  }

  private stopMeterLoop() {
    if (this.meterAnimationId !== null) {
      cancelAnimationFrame(this.meterAnimationId);
      this.meterAnimationId = null;
    }
    if (this.onMeterLevelCallback) {
      this.onMeterLevelCallback(0);
    }
  }

  /**
   * Stop recording and return the recorded voice Blob
   */
  public async stopRecording(): Promise<{ blob: Blob; duration: number }> {
    this.stopMeterLoop();

    // Stop backing playback
    if (this.backingAudioEl) {
      this.backingAudioEl.pause();
      this.backingAudioEl.currentTime = 0;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const fallbackBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.cleanupMicrophone();
        return resolve({ blob: fallbackBlob, duration: 0 });
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const finalBlob = new Blob(this.recordedChunks, { type: mimeType });
        this.cleanupMicrophone();
        resolve({ blob: finalBlob, duration: 0 });
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanupMicrophone() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
  }

  /**
   * Play combined preview (backing track + recorded voice in sync with mixer gains)
   */
  public playPreview(
    backingAudioUrl: string,
    voiceBlobUrl: string,
    settings: StudioMixerSettings,
    onEnded?: () => void
  ) {
    this.stopPreview();

    this.backingAudioEl = new Audio(backingAudioUrl);
    this.voiceAudioEl = new Audio(voiceBlobUrl);

    // Apply independent volume controls
    this.backingAudioEl.volume = Math.max(0, Math.min(1, settings.backingVolume));
    this.voiceAudioEl.volume = Math.max(0, Math.min(1, settings.voiceVolume));

    // Handle ended event
    this.backingAudioEl.onended = () => {
      this.stopPreview();
      if (onEnded) onEnded();
    };

    // Synchronized playback
    this.backingAudioEl.currentTime = 0;
    this.voiceAudioEl.currentTime = 0;

    this.backingAudioEl.play().catch(console.warn);
    this.voiceAudioEl.play().catch(console.warn);
  }

  /**
   * Stop combined preview
   */
  public stopPreview() {
    if (this.backingAudioEl) {
      this.backingAudioEl.pause();
      this.backingAudioEl.currentTime = 0;
      this.backingAudioEl = null;
    }
    if (this.voiceAudioEl) {
      this.voiceAudioEl.pause();
      this.voiceAudioEl.currentTime = 0;
      this.voiceAudioEl = null;
    }
  }

  public isPreviewPlaying(): boolean {
    return !!(this.backingAudioEl && !this.backingAudioEl.paused);
  }

  /**
   * Mix backing track and vocal recording into a single, combined 16-bit stereo WAV file
   * Uses OfflineAudioContext for deterministic non-real-time audio rendering.
   */
  public async mixAndExport(
    backingAudioBlobOrUrl: Blob | string,
    voiceBlob: Blob,
    settings: StudioMixerSettings,
    songTitle: string
  ): Promise<CombinedMixResult> {
    const ctx = this.getAudioContext();

    // 1. Decode Backing Track Audio
    let backingBuffer: AudioBuffer;
    if (typeof backingAudioBlobOrUrl === 'string') {
      const resp = await fetch(backingAudioBlobOrUrl);
      const arrayBuf = await resp.arrayBuffer();
      backingBuffer = await ctx.decodeAudioData(arrayBuf);
    } else {
      const arrayBuf = await backingAudioBlobOrUrl.arrayBuffer();
      backingBuffer = await ctx.decodeAudioData(arrayBuf);
    }

    // 2. Decode Voice Audio
    const voiceArrayBuf = await voiceBlob.arrayBuffer();
    const voiceBuffer = await ctx.decodeAudioData(voiceArrayBuf);

    // 3. Setup OfflineAudioContext with the maximum duration of the two tracks
    const sampleRate = 44100;
    const duration = Math.max(backingBuffer.duration, voiceBuffer.duration);
    const totalFrames = Math.ceil(sampleRate * duration);

    const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

    // Backing Track Node & Gain
    const backingSource = offlineCtx.createBufferSource();
    backingSource.buffer = backingBuffer;
    const backingGain = offlineCtx.createGain();
    backingGain.gain.setValueAtTime(settings.backingVolume, 0);
    backingSource.connect(backingGain);
    backingGain.connect(offlineCtx.destination);

    // Voice Track Node & Gain
    const voiceSource = offlineCtx.createBufferSource();
    voiceSource.buffer = voiceBuffer;
    const voiceGain = offlineCtx.createGain();
    voiceGain.gain.setValueAtTime(settings.voiceVolume, 0);

    // Subtle vocal reverb / studio ambience if enabled
    if (settings.reverbAmount > 0.05) {
      const convolver = offlineCtx.createConvolver();
      convolver.buffer = this.createSyntheticImpulseResponse(offlineCtx, 1.2, 2.0);
      const reverbGain = offlineCtx.createGain();
      reverbGain.gain.setValueAtTime(settings.reverbAmount * 0.35, 0);

      voiceSource.connect(convolver);
      convolver.connect(reverbGain);
      reverbGain.connect(offlineCtx.destination);
    }

    voiceSource.connect(voiceGain);
    voiceGain.connect(offlineCtx.destination);

    // Start both at time 0 (with optional latency offset compensation)
    backingSource.start(0);
    const voiceStartOffsetSec = Math.max(0, (settings.voiceDelayMs || 0) / 1000);
    voiceSource.start(voiceStartOffsetSec);

    // 4. Render the mix
    const mixedBuffer = await offlineCtx.startRendering();

    // 5. Encode to standard WAV
    const mixedWavBlob = audioBufferToWavBlob(mixedBuffer);
    const mixedUrl = URL.createObjectURL(mixedWavBlob);

    const safeTitle = songTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Muzic_Studio_${safeTitle}_${Date.now()}.wav`;

    return {
      blob: mixedWavBlob,
      url: mixedUrl,
      duration,
      fileName,
      fileSize: mixedWavBlob.size
    };
  }

  /**
   * Helper to trigger saving / downloading the mixed WAV file
   */
  public downloadMix(result: CombinedMixResult) {
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Generates a synthetic studio room impulse response for realistic vocal reverb
   */
  private createSyntheticImpulseResponse(
    ctx: BaseAudioContext,
    duration: number,
    decay: number
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i;
      // Exponential decay envelope
      const env = Math.exp(-n / (sampleRate * (duration / decay)));
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  private getSupportedMimeType(): string | undefined {
    const candidateTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    for (const type of candidateTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return undefined;
  }
}

export const studioEngine = new AudioStudioEngine();
