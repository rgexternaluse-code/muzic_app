/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SubscriptionTier, SubscriptionTierId, UserEntitlements } from '../types/studio';

export const MONTHLY_LOCAL_UPLOAD_LIMITS: Record<SubscriptionTierId, number> = {
  free: 5,
  pro: 20,
  studio_pass: 50
};

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Muzic Free',
    badge: 'Standard',
    priceDisplay: '₹0 / Forever',
    billingPeriod: 'free',
    description: 'Offline music player with standard singing studio and procedural instrumental catalogue.',
    features: [
      'Unlimited local music playback',
      'Device folder scanning & auto-index',
      'Singing Studio with 6 built-in categories',
      '5 phone song uploads / month for studio singing',
      'Dual volume faders (backing + voice)',
      'Combined audio preview and export',
      '5-Band Parametric Audio Equalizer'
    ]
  },
  {
    id: 'pro',
    name: 'Muzic Pro',
    badge: 'Popular',
    priceDisplay: '₹79 / month (Est.)',
    billingPeriod: 'monthly',
    isPopular: true,
    description: 'Enhanced vocal acoustics, studio ambience reverb, and ad-free offline playback.',
    features: [
      'Everything in Free',
      '20 phone song uploads / month for studio singing',
      'Studio Vocal Reverb & Ambience processor',
      'Mic latency offset compensation fine-tuning',
      'Uncompressed 24-bit/48kHz WAV export',
      'Ad-free uninterrupted experience',
      'Priority offline indexing'
    ]
  },
  {
    id: 'studio_pass',
    name: 'Muzic Studio Pass',
    badge: 'AI Powered',
    priceDisplay: '₹199 / month (Est.)',
    billingPeriod: 'monthly',
    description: 'Includes cloud AI vocal separation credits once backend compute is deployed.',
    features: [
      'Everything in Muzic Pro',
      '50 phone song uploads / month for studio singing',
      '30 min/month Cloud AI Vocal Separation (once backend online)',
      'Acapella & Instrumental stem download',
      'Early access to new Bollywood & Punjabi stems',
      'Exclusive Studio Vocal Presets (Sufi Hall, Ghazal Warmth, Pop Clarity)'
    ]
  }
];

export interface LocalUploadQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface ISubscriptionService {
  getCurrentTier(): SubscriptionTierId;
  getEntitlements(): UserEntitlements;
  getLocalUploadQuota(): LocalUploadQuota;
  setCloudSyncedQuota(count: number): void;
  canUploadLocalTrack(): boolean;
  recordLocalUpload(): { success: boolean; used: number; limit: number; remaining: number };
  isGooglePlayBillingConfigured(): boolean;
  purchaseProduct(tierId: SubscriptionTierId): Promise<{ success: boolean; message: string; requiresStoreSetup?: boolean }>;
  restorePurchases(): Promise<{ restored: boolean; message: string }>;
  subscribeToEntitlements(callback: (entitlements: UserEntitlements) => void): () => void;
}

class SubscriptionService implements ISubscriptionService {
  private currentTier: SubscriptionTierId = 'free';
  private listeners: Set<(entitlements: UserEntitlements) => void> = new Set();
  private readonly UPLOAD_STORAGE_KEY = 'muzic_studio_monthly_uploads';
  
  // Set to false: Real Google Play Billing requires signed release APK & Google Play Console product IDs
  private billingConfigured: boolean = false;

  constructor() {
    // In production, sync with RevenueCat or Google Play Billing Client
    this.currentTier = 'free';
  }

  private getCurrentMonthKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getStoredUploadCount(): number {
    try {
      const raw = localStorage.getItem(this.UPLOAD_STORAGE_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.month === this.getCurrentMonthKey() && typeof parsed.count === 'number') {
        return parsed.count;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private saveStoredUploadCount(count: number): void {
    try {
      localStorage.setItem(
        this.UPLOAD_STORAGE_KEY,
        JSON.stringify({
          month: this.getCurrentMonthKey(),
          count
        })
      );
    } catch {
      // storage unavailable / quota exceeded
    }
  }

  public getCurrentTier(): SubscriptionTierId {
    return this.currentTier;
  }

  public isGooglePlayBillingConfigured(): boolean {
    return this.billingConfigured;
  }

  public getLocalUploadQuota(): LocalUploadQuota {
    const limit = MONTHLY_LOCAL_UPLOAD_LIMITS[this.currentTier] ?? 5;
    const used = this.getStoredUploadCount();
    const remaining = Math.max(0, limit - used);
    return { used, limit, remaining };
  }

  public setCloudSyncedQuota(count: number): void {
    if (typeof count === 'number' && count >= 0) {
      this.saveStoredUploadCount(count);
      this.notifyListeners();
    }
  }

  public canUploadLocalTrack(): boolean {
    const { remaining } = this.getLocalUploadQuota();
    return remaining > 0;
  }

  public recordLocalUpload(): { success: boolean; used: number; limit: number; remaining: number } {
    const quota = this.getLocalUploadQuota();
    if (quota.remaining <= 0) {
      return { success: false, ...quota };
    }
    const newUsed = quota.used + 1;
    this.saveStoredUploadCount(newUsed);
    this.notifyListeners();
    return {
      success: true,
      used: newUsed,
      limit: quota.limit,
      remaining: Math.max(0, quota.limit - newUsed)
    };
  }

  public getEntitlements(): UserEntitlements {
    const isPremium = this.currentTier === 'pro' || this.currentTier === 'studio_pass';
    const quota = this.getLocalUploadQuota();
    return {
      tier: this.currentTier,
      isPremium,
      canExportLosslessWav: isPremium,
      canUseStudioReverb: isPremium,
      adFree: isPremium,
      monthlyAiSeparationMinutesTotal: this.currentTier === 'studio_pass' ? 30 : 0,
      monthlyAiSeparationMinutesUsed: 0,
      monthlyLocalUploadLimit: quota.limit,
      monthlyLocalUploadUsed: quota.used,
      isBillingConfigured: this.billingConfigured
    };
  }

  public subscribeToEntitlements(callback: (entitlements: UserEntitlements) => void): () => void {
    this.listeners.add(callback);
    callback(this.getEntitlements());
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const entitlements = this.getEntitlements();
    this.listeners.forEach(cb => cb(entitlements));
  }

  /**
   * Safe purchase handler. Per implementation brief Section 7, never pretend payments succeed without Google Play Console setup.
   */
  public async purchaseProduct(tierId: SubscriptionTierId): Promise<{ success: boolean; message: string; requiresStoreSetup?: boolean }> {
    if (tierId === 'free') {
      this.currentTier = 'free';
      this.notifyListeners();
      return { success: true, message: 'Switched to Muzic Free.' };
    }

    if (!this.billingConfigured) {
      // Per Section 7: Explain which steps require Google Play Console, signed build, etc.
      return {
        success: false,
        requiresStoreSetup: true,
        message: 'Google Play Billing is currently in preparation mode. Live in-app subscriptions require Google Play Console merchant account setup, product SKU registration (e.g. "muzic_pro_monthly"), and signed release APK.'
      };
    }

    return {
      success: false,
      message: 'Google Play Billing client not initialized.'
    };
  }

  /**
   * Restore purchases handler
   */
  public async restorePurchases(): Promise<{ restored: boolean; message: string }> {
    if (!this.billingConfigured) {
      return {
        restored: false,
        message: 'No Google Play account connected yet. In-app purchases require a production Google Play Console build.'
      };
    }

    return {
      restored: false,
      message: 'No active subscriptions found for this Google account.'
    };
  }
}

export const subscriptionService = new SubscriptionService();
