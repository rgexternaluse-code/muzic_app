/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithGoogleOneTap, 
  signOutCurrentUser,
  fetchCloudStudioQuota,
  recordCloudStudioUpload
} from '../services/firebase';
import { subscriptionService } from '../services/subscriptionService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
  isVerified: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  signInWithGoogle: async () => null,
  signOut: async () => {},
  isVerified: false
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        // Sync cloud quota with local subscription service
        const month = new Date().toISOString().slice(0, 7);
        try {
          const used = await fetchCloudStudioQuota(user.uid, month);
          subscriptionService.setCloudSyncedQuota(used);
        } catch (e) {
          console.warn('Quota sync deferred:', e);
        }
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async (): Promise<User | null> => {
    try {
      const user = await signInWithGoogleOneTap();
      if (!user) {
        return null;
      }
      setCurrentUser(user);
      const month = new Date().toISOString().slice(0, 7);
      try {
        const used = await fetchCloudStudioQuota(user.uid, month);
        subscriptionService.setCloudSyncedQuota(used);
      } catch (e) {
        console.warn('Quota sync deferred:', e);
      }
      return user;
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        (typeof err?.message === 'string' && (err.message.includes('popup-closed-by-user') || err.message.includes('cancelled-popup-request')))
      ) {
        return null;
      }
      throw err;
    }
  };

  const signOut = async () => {
    await signOutCurrentUser();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      signInWithGoogle,
      signOut,
      isVerified: !!currentUser && !!currentUser.email
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
