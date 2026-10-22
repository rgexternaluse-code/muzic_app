/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider, 
  User, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth & Firestore with explicit database ID
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Google Auth Provider setup for 1-Tap Google Sign-In
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// --- Mandatory Firestore Error Handler per Security Rules Spec ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mandatory testConnection call per skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or starting up.');
    }
  }
}
testConnection();

// --- Authentication & User Identity Helpers ---

export async function signInWithGoogleOneTap(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Synchronize or create user profile in Firestore
    if (user && user.uid) {
      const userRef = doc(db, 'users', user.uid);
      const path = `users/${user.uid}`;
      try {
        const snap = await getDoc(userRef);
        const now = new Date().toISOString();
        if (!snap.exists()) {
          await setDoc(userRef, {
            email: user.email || '',
            displayName: user.displayName || 'Music Creator',
            photoURL: user.photoURL || '',
            tier: 'free',
            createdAt: now,
            updatedAt: now
          });
        } else {
          await updateDoc(userRef, {
            displayName: user.displayName || 'Music Creator',
            photoURL: user.photoURL || '',
            updatedAt: now
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    return user;
  } catch (err: any) {
    // If the user cancelled or closed the popup, handle gracefully without logging an error
    if (
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      (typeof err?.message === 'string' && (err.message.includes('popup-closed-by-user') || err.message.includes('cancelled-popup-request')))
    ) {
      return null;
    }
    if (err?.code === 'auth/popup-blocked') {
      console.warn('Google sign-in popup blocked by browser settings.');
      throw err;
    }
    console.warn('Google sign-in was not completed:', err?.code || err?.message || err);
    throw err;
  }
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
}

// --- Cloud-Backed Singing Studio Upload Quota Sync ---

export async function fetchCloudStudioQuota(userId: string, month: string): Promise<number> {
  const quotaRef = doc(db, 'users', userId, 'quota', month);
  const path = `users/${userId}/quota/${month}`;
  try {
    const snap = await getDoc(quotaRef);
    if (snap.exists()) {
      return snap.data().usedUploads ?? 0;
    }
    // Initialize for current month
    const now = new Date().toISOString();
    await setDoc(quotaRef, {
      userId,
      month,
      usedUploads: 0,
      updatedAt: now
    });
    return 0;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return 0;
  }
}

export async function recordCloudStudioUpload(userId: string, month: string): Promise<number> {
  const quotaRef = doc(db, 'users', userId, 'quota', month);
  const path = `users/${userId}/quota/${month}`;
  const now = new Date().toISOString();
  try {
    const snap = await getDoc(quotaRef);
    if (!snap.exists()) {
      await setDoc(quotaRef, {
        userId,
        month,
        usedUploads: 1,
        updatedAt: now
      });
      return 1;
    } else {
      await updateDoc(quotaRef, {
        usedUploads: increment(1),
        updatedAt: now
      });
      return (snap.data().usedUploads ?? 0) + 1;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return 1;
  }
}

export { onAuthStateChanged };
export type { User };
