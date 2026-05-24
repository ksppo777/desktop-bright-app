import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(user);
      }
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User } | null> => {
  try {
    isSigningIn = true;

    if (Capacitor.isNativePlatform()) {
      const nativeResult = await FirebaseAuthentication.signInWithGoogle({
        useCredentialManager: false
      });

      if (!nativeResult.credential?.idToken) {
        throw new Error('Failed to get ID token from native Google Sign-In');
      }

      const credential = GoogleAuthProvider.credential(
        nativeResult.credential.idToken,
        nativeResult.credential.accessToken
      );
      const result = await signInWithCredential(auth, credential);

      if (onAuthSuccessCallback) onAuthSuccessCallback(result.user);
      return { user: result.user };
    } 
    else {
      const result = await signInWithPopup(auth, provider);
      
      if (onAuthSuccessCallback) onAuthSuccessCallback(result.user);
      return { user: result.user };
    }
  } catch (error: any) {
    if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
      console.error('Sign in error:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

let onAuthSuccessCallback: ((user: User) => void) | null = null;
export const setOnAuthSuccessCallback = (cb: (user: User) => void) => {
  onAuthSuccessCallback = cb;
};

export const logout = async () => {
  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut();
  }
  await auth.signOut();
};