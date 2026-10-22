/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Music, 
  LogOut,
  FolderPlus,
  Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GoogleVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, icon?: React.ReactNode, subtitle?: string) => void;
  onSuccess?: () => void;
  customTitle?: string;
  customSubtitle?: string;
  customReason?: string;
}

export function GoogleVerificationModal({
  isOpen,
  onClose,
  onShowToast,
  onSuccess,
  customTitle,
  customSubtitle,
  customReason
}: GoogleVerificationModalProps) {
  const { currentUser, isVerified, signInWithGoogle, signOut } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      if (!user) {
        // User closed or dismissed the popup dialog cleanly
        return;
      }
      onShowToast(
        `Welcome, ${user.displayName || 'Creator'}!`,
        <CheckCircle2 size={16} className="text-emerald-400" />,
        'Google 1-Tap Verification Successful'
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        (typeof err?.message === 'string' && (err.message.includes('popup-closed-by-user') || err.message.includes('cancelled-popup-request')))
      ) {
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Sign-in popup was blocked by your browser. Please allow popups and try again.');
      } else {
        setErrorMsg(err?.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onShowToast('Signed out of Google account.', <LogOut size={16} className="text-[#8E7CFF]" />);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Sign-out failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-sm bg-[#120F24] border border-[#6355FE]/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left"
      >
        {/* Header */}
        <div className="relative p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-[#1C153E]/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6355FE]/20 flex items-center justify-center text-[#8E7CFF] border border-[#6355FE]/30 shadow-md">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                {customTitle || 'Studio Verification'}
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                  FREE
                </span>
              </h2>
              <p className="text-[11px] font-bold text-[#8F8E9C]">
                {customSubtitle || 'Google 1-Tap Account Verification'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
              <p className="text-[11px] leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {isVerified && currentUser ? (
            /* Already Verified Card */
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'User'} 
                    className="w-12 h-12 rounded-full border-2 border-emerald-400 shadow-md object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#6355FE] text-white flex items-center justify-center font-black text-lg">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-white truncate">{currentUser.displayName || 'Music Creator'}</h3>
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-[#8F8E9C] truncate">{currentUser.email}</p>
                  <span className="inline-block mt-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Account Verified
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#8F8E9C]">
                <span>Singing Studio Uploads:</span>
                <span className="font-bold text-white">Active</span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                <span>Switch or Sign Out</span>
              </button>
            </div>
          ) : (
            /* Unverified / Sign-in Request */
            <div className="space-y-4">
              <div className="p-3.5 bg-[#171330] border border-[#6355FE]/30 rounded-2xl space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8E7CFF] block">
                  {customReason ? 'Unlock Full Access Free' : 'Why verify with Google 1-Tap?'}
                </span>
                {customReason ? (
                  <p className="text-[11px] text-white/90 font-medium leading-relaxed">
                    {customReason}
                  </p>
                ) : (
                  <ul className="space-y-2 text-[11px] text-white/80 font-medium">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>100% Free Forever:</strong> No phone OTP limits or SMS delays.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Claim 5 Free Uploads/Month:</strong> Imports any song from your phone into Singing Studio.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Secure Cloud Persistence:</strong> Keeps your monthly allowance safe even if you switch devices.</span>
                    </li>
                  </ul>
                )}
              </div>

              {/* Google 1-Tap Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full py-3.5 px-4 bg-white hover:bg-neutral-100 active:scale-[0.98] text-neutral-800 rounded-2xl font-black text-xs tracking-wider cursor-pointer shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-60"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-neutral-800" />
                    <span>Verifying with Google...</span>
                  </>
                ) : (
                  <>
                    {/* Official Google G Logo SVG */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-[#8F8E9C]">
                By signing in, your account email is verified instantly. No spam.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
