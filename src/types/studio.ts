/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InstrumentalTrack {
  id: string;
  title: string;
  category: InstrumentalCategory;
  categoryLabel: string;
  styleDescription: string;
  duration: number; // in seconds
  bpm: number;
  key: string;
  previewUrl?: string;
  isPlaceholder?: boolean;
  rightsStatus: 'royalty-free-original' | 'placeholder-catalog' | 'user-local' | 'ai-separated';
  tags: string[];
}

export type InstrumentalCategory =
  | 'bollywood-1'
  | 'bollywood-2'
  | 'punjabi-1'
  | 'punjabi-2'
  | 'sad-bollywood'
  | 'sad-punjabi';

export interface StudioRecording {
  id: string;
  blob: Blob;
  url: string;
  duration: number; // in seconds
  recordedAt: number;
  backingTrackId: string;
  backingTrackTitle: string;
}

export interface StudioMixerSettings {
  backingVolume: number; // 0.0 to 1.5 (1.0 = 100%)
  voiceVolume: number;   // 0.0 to 1.5 (1.0 = 100%)
  reverbAmount: number;  // 0.0 to 1.0 (subtle studio ambience)
  voiceDelayMs: number;  // Latency offset compensation (-100ms to +100ms)
}

export interface CombinedMixResult {
  blob: Blob;
  url: string;
  duration: number;
  fileName: string;
  fileSize: number;
}

// --- Online AI Vocal Separation Types ---
export type SeparationJobStatus = 
  | 'idle' 
  | 'consented' 
  | 'uploading' 
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'backend_unconfigured';

export interface SeparationJob {
  jobId: string;
  fileName: string;
  fileSizeBytes: number;
  status: SeparationJobStatus;
  progressPercent: number; // 0 to 100
  createdAt: number;
  instrumentalDownloadUrl?: string;
  vocalsDownloadUrl?: string;
  expiresAt?: number;
  error?: string;
}

// --- Subscription & Monetization Types ---
export type SubscriptionTierId = 'free' | 'pro' | 'studio_pass';

export interface SubscriptionTier {
  id: SubscriptionTierId;
  name: string;
  badge: string;
  priceDisplay: string;
  billingPeriod: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

export interface UserEntitlements {
  tier: SubscriptionTierId;
  isPremium: boolean;
  canExportLosslessWav: boolean;
  canUseStudioReverb: boolean;
  adFree: boolean;
  monthlyAiSeparationMinutesTotal: number;
  monthlyAiSeparationMinutesUsed: number;
  monthlyLocalUploadLimit: number;
  monthlyLocalUploadUsed: number;
  isBillingConfigured: boolean;
}

