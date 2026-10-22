/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeparationJob, SeparationJobStatus } from '../types/studio';

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
