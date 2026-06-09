import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

// AppData drive scope
const DRIVE_APP_DATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export interface User {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

let cachedAccessToken: string | null = null;
let googleTokenClient: any = null;
let onAuthSuccessCallback: ((user: User, token: string) => void) | null = null;
let cachedUser: User | null = null;

const STORAGE_KEY_TOKEN = 'app_google_token';
const STORAGE_KEY_USER = 'app_google_user';
const STORAGE_KEY_EXPIRY = 'app_google_token_expiry';

try {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  const userStr = localStorage.getItem(STORAGE_KEY_USER);
  const expiryStr = localStorage.getItem(STORAGE_KEY_EXPIRY);
  if (token && userStr && expiryStr) {
    const expiry = parseInt(expiryStr, 10);
    // 세션 만료 검증 (현재 시간이 만료 시간보다 이전인지)
    if (Date.now() < expiry) {
      cachedAccessToken = token;
      cachedUser = JSON.parse(userStr);
    } else {
      // 세션 만료 시 로컬 저장소 초기화하여 재로그인 요구
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_EXPIRY);
    }
  }
} catch (e) {
  console.log('Failed to restore auth from local storage', e);
}

// Replace with the user's Web Client ID later
const WEB_CLIENT_ID = '926621621039-b6idpq9gvm3h1gn5ltb2p609pf401aaf.apps.googleusercontent.com';

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (onAuthSuccess) setOnAuthSuccessCallback(onAuthSuccess);
  if (onAuthFailure) setOnAuthFailureCallback(onAuthFailure);

  const performSilentLogin = async () => {
    if (cachedAccessToken && cachedUser) {
      // We already have a valid token from local storage
      return;
    }
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await GoogleSignIn.initialize({
            clientId: WEB_CLIENT_ID,
            scopes: ['profile', 'email', DRIVE_APP_DATA_SCOPE],
          });
        } catch (e) {
          console.log('Silent login failed for native', e);
        }
      } else {
        // Web silent login skip
      }
    } catch (err) {
      console.log('Init auth error:', err);
    }
    if (onAuthFailure) onAuthFailure();
  };

  performSilentLogin();

  return () => {};
};

const fetchUserInfoFromWeb = async (token: string): Promise<User> => {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  const data = await res.json();
  return {
    displayName: data.name || null,
    email: data.email || null,
    photoURL: data.picture || null,
  };
};

export const googleSignIn = async (): Promise<{ user: User, accessToken: string } | null> => {
  if (Capacitor.isNativePlatform()) {
    const result = await GoogleSignIn.signIn();
    if (result && result.accessToken) {
      cachedAccessToken = result.accessToken;
      cachedUser = {
        displayName: result.displayName || `${result.givenName || ''} ${result.familyName || ''}`.trim(),
        email: result.email || null,
        photoURL: result.imageUrl || null,
      };
      if (onAuthSuccessCallback) onAuthSuccessCallback(cachedUser, cachedAccessToken);
      
      try {
        localStorage.setItem(STORAGE_KEY_TOKEN, cachedAccessToken);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cachedUser));
        localStorage.setItem(STORAGE_KEY_EXPIRY, (Date.now() + 3500 * 1000).toString());
      } catch (e) {}

      return { user: cachedUser, accessToken: cachedAccessToken };
    }
    throw new Error('Google Sign-In failed on Native');
  } else {
    // Web GIS
    return new Promise((resolve, reject) => {
      // @ts-ignore
      if (!window.google) {
        reject(new Error('Google Identity Services script not loaded.'));
        return;
      }
      
      if (!googleTokenClient) {
        // @ts-ignore
        googleTokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: WEB_CLIENT_ID,
          scope: `profile email ${DRIVE_APP_DATA_SCOPE}`,
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                cachedAccessToken = tokenResponse.access_token;
                const user = await fetchUserInfoFromWeb(cachedAccessToken!);
                cachedUser = user;
                if (onAuthSuccessCallback) onAuthSuccessCallback(cachedUser, cachedAccessToken!);
                
                try {
                  localStorage.setItem(STORAGE_KEY_TOKEN, cachedAccessToken!);
                  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cachedUser));
                  localStorage.setItem(STORAGE_KEY_EXPIRY, (Date.now() + 3500 * 1000).toString());
                } catch (e) {}

                resolve({ user: cachedUser, accessToken: cachedAccessToken! });
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error('Token response missing access_token'));
            }
          },
          error_callback: (err: any) => {
            reject(err);
          }
        });
      }
      
      googleTokenClient.requestAccessToken();
    });
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setOnAuthSuccessCallback = (cb: (user: User, token: string) => void) => {
  onAuthSuccessCallback = cb;
  if (cachedUser && cachedAccessToken) {
    cb(cachedUser, cachedAccessToken);
  }
};

let onAuthFailureCallback: (() => void) | null = null;

export const setOnAuthFailureCallback = (cb: () => void) => {
  onAuthFailureCallback = cb;
};

export const logout = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleSignIn.signOut();
    } catch(e) {}
  }
  cachedAccessToken = null;
  cachedUser = null;
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
  } catch (e) {}
  
  if (onAuthFailureCallback) {
    onAuthFailureCallback();
  }
};