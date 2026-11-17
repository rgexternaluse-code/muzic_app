/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Crown,
  Sparkles
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adminIdentifier: string) => void;
  currentUserEmail?: string | null;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUserEmail
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Accepted admin credentials for internal administration and testing
  const verifyCredentials = (user: string, pass: string): boolean => {
    const cleanUser = user.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Standard dev admin credentials
    if ((cleanUser === 'admin' || cleanUser === 'admin@muzic.app') && 
        (cleanPass === 'admin' || cleanPass === 'admin179' || cleanPass === 'muzicadmin' || cleanPass === 'admin2026')) {
      return true;
    }

    // Owner credentials
    if (cleanUser === 'r.gworkprofile@gmail.com' && 
        (cleanPass === 'admin' || cleanPass === 'admin179' || cleanPass === 'muzicadmin' || cleanPass === 'admin2026')) {
      return true;
    }

    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const isValid = verifyCredentials(username, password);
      if (isValid) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess(username.trim());
          setLoading(false);
          setSuccess(false);
          onClose();
        }, 600);
      } else {
        setLoading(false);
        setError('Invalid admin credentials. Use admin / admin179 or check password.');
      }
    }, 400);
  };

  const handleOwnerQuickAuth = () => {
    if (!currentUserEmail) return;
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setSuccess(true);
      setTimeout(() => {
        onSuccess(currentUserEmail);
        setLoading(false);
        setSuccess(false);
        onClose();
      }, 500);
    }, 400);
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('admin179');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]">
      <div 
        className="relative w-full max-w-md rounded-3xl bg-[#0E0B20] border border-white/15 p-6 shadow-2xl text-left overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/20 blur-3xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Crown size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                Admin Verification
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
                  DEV
                </span>
              </h2>
              <p className="text-[11px] text-white/50 font-medium mt-0.5">
                Verify credentials to unlock administrative mode
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 relative z-10">
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center gap-2.5 text-red-300 text-[11px] font-bold animate-[shake_0.2s_ease-in-out]">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-300 text-[11px] font-bold">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Admin credentials verified! Unlocking admin mode...</span>
            </div>
          )}

          {/* Quick Authenticate as Owner button if signed in with Google */}
          {currentUserEmail && currentUserEmail.toLowerCase() === 'r.gworkprofile@gmail.com' && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-[11px] font-bold text-amber-300 truncate">Owner Google Account Detected</p>
                <p className="text-[10px] text-white/60 truncate">{currentUserEmail}</p>
              </div>
              <button
                type="button"
                onClick={handleOwnerQuickAuth}
                disabled={loading || success}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-extrabold text-[10px] rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 shrink-0"
              >
                1-Click Verify
              </button>
            </div>
          )}

          {/* Username / Identifier */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E7CFF] flex items-center gap-1.5">
              <KeyRound size={12} />
              <span>Admin Username or Email</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              required
              className="w-full px-4 py-2.5 bg-[#14122B] border border-white/15 focus:border-[#8E7CFF] rounded-2xl text-xs text-white placeholder-white/30 focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E7CFF] flex items-center gap-1.5">
              <Lock size={12} />
              <span>Admin Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                required
                className="w-full px-4 py-2.5 pr-10 bg-[#14122B] border border-white/15 focus:border-[#8E7CFF] rounded-2xl text-xs text-white placeholder-white/30 focus:outline-none transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 p-1 cursor-pointer transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 active:scale-95 text-white/70 hover:text-white rounded-2xl text-xs font-bold transition-all cursor-pointer border border-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success || !username || !password}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-black rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-black" />
                  <span>Verifying...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={14} className="text-black" />
                  <span>Verified!</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Verify Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
