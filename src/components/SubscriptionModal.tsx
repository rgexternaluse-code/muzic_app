/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Crown, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw,
  Zap,
  Sliders,
  Layers
} from 'lucide-react';
import { SUBSCRIPTION_TIERS, subscriptionService } from '../services/subscriptionService';
import { SubscriptionTierId } from '../types/studio';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, icon?: React.ReactNode, subtitle?: string) => void;
}

export function SubscriptionModal({ isOpen, onClose, onShowToast }: SubscriptionModalProps) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierId>('pro');
  const [isProcessing, setIsProcessing] = useState(false);
  const [storeNotice, setStoreNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTier = subscriptionService.getCurrentTier();

  const handleSubscribe = async (tierId: SubscriptionTierId) => {
    setIsProcessing(true);
    setStoreNotice(null);

    try {
      const res = await subscriptionService.purchaseProduct(tierId);
      if (res.success) {
        onShowToast(res.message, <Crown size={16} className="text-amber-400" />);
        onClose();
      } else {
        setStoreNotice(res.message);
      }
    } catch (err: any) {
      setStoreNotice(err.message || 'Subscription initialization failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    setStoreNotice(null);
    try {
      const res = await subscriptionService.restorePurchases();
      setStoreNotice(res.message);
      onShowToast(res.message, <RefreshCw size={16} className="text-[#8E7CFF]" />);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-md bg-[#120F24] border border-[#6355FE]/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-[#1C153E]/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center text-amber-400 border border-amber-400/30 shadow-md">
              <Crown size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Muzic Premium
                <span className="text-[10px] bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black px-2 py-0.5 rounded-full">PRO</span>
              </h2>
              <p className="text-[11px] font-bold text-[#8F8E9C]">Unlock Studio Reverb, Lossless Audio & Cloud Stems</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Plan Cards */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
          {storeNotice && (
            <div className="p-3.5 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
              <AlertCircle size={18} className="shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider block">Google Play Store Boundary</span>
                <p className="opacity-90 leading-relaxed text-[11px]">{storeNotice}</p>
              </div>
            </div>
          )}

          {/* Current Studio Phone Upload Usage */}
          {(() => {
            const quota = subscriptionService.getLocalUploadQuota();
            return (
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-[#8F8E9C]">Studio Phone Uploads (This Month):</span>
                <span className="font-bold text-white">
                  {quota.used} / {quota.limit} used ({quota.remaining} left)
                </span>
              </div>
            );
          })()}

          <div className="space-y-3">
            {SUBSCRIPTION_TIERS.map(tier => {
              const isSelected = selectedTier === tier.id;
              const isCurrent = currentTier === tier.id;

              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#1C153E] border-[#6355FE] shadow-[0_0_24px_rgba(99,85,254,0.25)]'
                      : 'bg-white/5 border-white/5 hover:border-white/15'
                  }`}
                >
                  {tier.isPopular && (
                    <span className="absolute -top-2.5 right-4 bg-[#6355FE] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
                      Best Value
                    </span>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-black text-white">{tier.name}</h3>
                      <p className="text-[10px] text-[#8F8E9C] font-semibold">{tier.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-[#8E7CFF]">{tier.priceDisplay}</span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 mt-3 pt-3 border-t border-white/5">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-[11px] text-white/80 font-medium">
                        <Check size={12} className="text-[#8E7CFF] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent && (
                    <div className="mt-3 text-center py-1 bg-white/10 rounded-xl text-[10px] font-bold text-white/70">
                      Current Plan
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Honest Store Notice */}
          <div className="p-3 bg-black/20 rounded-2xl border border-white/5 flex items-center gap-2.5 text-[10px] text-[#8F8E9C]">
            <ShieldCheck size={14} className="text-[#8E7CFF] shrink-0" />
            <span>Honest architecture: Subscriptions use official Google Play Billing SDK. No fake simulated payments.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-3 border-t border-white/5 flex flex-col gap-2.5 bg-[#0E0B20]">
          <button
            onClick={() => handleSubscribe(selectedTier)}
            disabled={isProcessing}
            className="w-full py-3.5 bg-gradient-to-r from-[#6355FE] to-[#8E7CFF] hover:from-[#7265FF] hover:to-[#9E8EFF] active:scale-[0.98] transition-all rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-[#6355FE]/30 cursor-pointer flex items-center justify-center gap-2"
          >
            <Crown size={15} />
            <span>{selectedTier === 'free' ? 'Continue with Free' : `Get ${selectedTier === 'pro' ? 'Muzic Pro' : 'Studio Pass'}`}</span>
          </button>

          <button
            onClick={handleRestore}
            disabled={isProcessing}
            className="w-full py-2 text-[10px] font-bold uppercase tracking-wider text-[#8F8E9C] hover:text-white transition-colors cursor-pointer"
          >
            Restore Google Play Purchases
          </button>
        </div>
      </motion.div>
    </div>
  );
}
