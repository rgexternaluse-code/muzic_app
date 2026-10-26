/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeparationJob, SeparationJobStatus } from '../types/studio';
import { audioBufferToWavBlob } from '../data/instrumentals';

/**
 * Online AI Vocal Separation Service Boundary
 * 
 * Architecture Specification (per Section 6 of Muzic Implementation Brief):
 * - Initial AI hosting budget: ₹0.
 * - No backend is currently provisioned for Muzic.
 * - Processing heavy deep learning models (such as Demucs v4 or Spleeter) on lower-end
 *   Android phones freezes the device and exhausts RAM. Cloud separation is the design target.
 * - This service provides the complete typed contract and interface for future backend integration.
 * - When no backend URL is configured, it surfaces an explicit, honest "Backend Not Configured" state.
 */

export interface CreateJobRequest {
  audioFile: File | Blob;
  fileName: string;
  userConsentGiven: boolean;
  modelTarget?: 'vocals_instrumental' | '4stem' | 'drums_bass_other_vocals';
}

export interface CreateJobResponse {
  jobId: string;
  status: SeparationJobStatus;
  estimatedWaitSeconds: number;
  message: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: SeparationJobStatus;
  progressPercent: number;
  instrumentalDownloadUrl?: string;
  vocalsDownloadUrl?: string;
  expiresAt?: number;
  error?: string;
}

export class VocalSeparationService {
  // Configurable backend URL. Empty by default (₹0 initial budget).
  private apiBaseUrl: string = (import.meta as any).env?.VITE_SEPARATION_API_BASE_URL || '';

  /**
   * Check if an active cloud backend is configured
   */
  public isBackendConfigured(): boolean {
    return !!this.apiBaseUrl && this.apiBaseUrl.trim().length > 0;
  }

  public getBackendUrl(): string {
    return this.apiBaseUrl;
  }

  public setBackendUrl(url: string) {
    this.apiBaseUrl = url.trim();
  }

  /**
   * Submit audio file for server-side AI vocal separation
   * Contract: POST /api/v1/separation-jobs
   */
  public async submitSeparationJob(req: CreateJobRequest): Promise<SeparationJob> {
    if (!req.userConsentGiven) {
      throw new Error('User consent is required prior to uploading device audio to remote servers.');
    }

    if (!this.isBackendConfigured()) {
      // Per Section 6: Do not invent endpoints or fake cloud compute when no backend exists.
      return {
        jobId: `local_unconfigured_${Date.now()}`,
        fileName: req.fileName,
        fileSizeBytes: req.audioFile.size,
        status: 'backend_unconfigured',
        progressPercent: 0,
        createdAt: Date.now(),
        error: 'Cloud AI Vocal Separation backend is not yet deployed (Initial budget: ₹0). To enable, deploy a server worker (e.g. FastAPI + Demucs v4) and configure VITE_SEPARATION_API_BASE_URL.'
      };
    }

    // Real HTTP POST to configured backend
    const formData = new FormData();
    formData.append('file', req.audioFile, req.fileName);
    formData.append('model', req.modelTarget || 'vocals_instrumental');

    const res = await fetch(`${this.apiBaseUrl}/api/v1/separation-jobs`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
      body: formData
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Separation job creation failed (${res.status}): ${errorText}`);
    }

    const data: CreateJobResponse = await res.json();
    return {
      jobId: data.jobId,
      fileName: req.fileName,
      fileSizeBytes: req.audioFile.size,
      status: data.status,
      progressPercent: 0,
      createdAt: Date.now()
    };
  }

  /**
   * Poll status of an active job
   * Contract: GET /api/v1/separation-jobs/{jobId}
   */
  public async pollJobStatus(jobId: string): Promise<JobStatusResponse> {
    if (!this.isBackendConfigured()) {
      return {
        jobId,
        status: 'backend_unconfigured',
        progressPercent: 0,
        error: 'Backend offline or unconfigured.'
      };
    }

    const res = await fetch(`${this.apiBaseUrl}/api/v1/separation-jobs/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Status polling failed (${res.status})`);
    }

    return await res.json();
  }

  /**
   * Cancel an active separation job
   * Contract: DELETE /api/v1/separation-jobs/{jobId}
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    if (!this.isBackendConfigured()) return true;

    try {
      const res = await fetch(`${this.apiBaseUrl}/api/v1/separation-jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const vocalSeparationService = new VocalSeparationService();

/**
 * Real-Time Client-Side Vocal Suppression / Karaoke Extractor
 * Uses Mid-Side Phase Inversion & Stereo Demixing with Bass Bypass (0ms latency, zero cloud cost).
 * Cancels out center-panned lead vocals while preserving stereo instruments and low-end bass/kick drums.
 */
export async function extractClientSideKaraokeAudio(
  audioInput: Blob | string
): Promise<{ blob: Blob; url: string; duration: number }> {
  let arrayBuffer: ArrayBuffer;
  if (typeof audioInput === 'string') {
    const res = await fetch(audioInput);
    arrayBuffer = await res.arrayBuffer();
  } else {
    arrayBuffer = await audioInput.arrayBuffer();
  }

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const numChannels = decodedBuffer.numberOfChannels;
  const sampleRate = decodedBuffer.sampleRate;
  const length = decodedBuffer.length;
  const duration = decodedBuffer.duration;

  if (numChannels < 2) {
    // If mono, apply vocal frequency attenuation notch
    const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;

    const notch = offlineCtx.createBiquadFilter();
    notch.type = 'notch';
    notch.frequency.value = 1800;
    notch.Q.value = 1.2;

    source.connect(notch);
    notch.connect(offlineCtx.destination);
    source.start();

    const rendered = await offlineCtx.startRendering();
    const blob = audioBufferToWavBlob(rendered);
    return { blob, url: URL.createObjectURL(blob), duration };
  }

  // High-fidelity Stereo Mid-Side Vocal Cancellation
  const offlineCtx = new OfflineAudioContext(2, length, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decodedBuffer;

  const splitter = offlineCtx.createChannelSplitter(2);
  source.connect(splitter);

  // Left minus Right (L - R)
  const diffMerger = offlineCtx.createChannelMerger(2);
  
  const gainL = offlineCtx.createGain();
  gainL.gain.value = 0.9;
  splitter.connect(gainL, 0); // L
  
  const invGainR = offlineCtx.createGain();
  invGainR.gain.value = -0.9;
  splitter.connect(invGainR, 1); // -R
  
  gainL.connect(diffMerger, 0, 0); // L to Left
  invGainR.connect(diffMerger, 0, 0); // -R to Left (so Left = L - R)

  // Right minus Left (R - L)
  const gainR = offlineCtx.createGain();
  gainR.gain.value = 0.9;
  splitter.connect(gainR, 1); // R

  const invGainL = offlineCtx.createGain();
  invGainL.gain.value = -0.9;
  splitter.connect(invGainL, 0); // -L

  gainR.connect(diffMerger, 0, 1); // R to Right
  invGainL.connect(diffMerger, 0, 1); // -L to Right (so Right = R - L)

  // Bass & Kick Drum Bypass (< 140 Hz center preservation)
  const lowPassL = offlineCtx.createBiquadFilter();
  lowPassL.type = 'lowpass';
  lowPassL.frequency.value = 140;
  splitter.connect(lowPassL, 0);

  const lowPassR = offlineCtx.createBiquadFilter();
  lowPassR.type = 'lowpass';
  lowPassR.frequency.value = 140;
  splitter.connect(lowPassR, 1);

  lowPassL.connect(diffMerger, 0, 0);
  lowPassR.connect(diffMerger, 0, 1);

  diffMerger.connect(offlineCtx.destination);
  source.start();

  const rendered = await offlineCtx.startRendering();
  const blob = audioBufferToWavBlob(rendered);
  return { blob, url: URL.createObjectURL(blob), duration };
}
