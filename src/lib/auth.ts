import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { supabase } from '../supabaseUpdate';

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
  if (token) {
    cachedAccessToken = token;
    if (userStr) {
      cachedUser = JSON.parse(userStr);
    }
  }
} catch (e) {
  console.log('Failed to restore auth from local storage', e);
}

// Replace with the user's Web Client ID later
const WEB_CLIENT_ID = '926621621039-b6idpq9gvm3h1gn5ltb2p609pf401aaf.apps.googleusercontent.com';

const isTauri = () => (typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window));

supabase.auth.onAuthStateChange((event, session) => {
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
    let providerToken = session.provider_token;
    
    // Fallback: Check if captured early
    if (!providerToken && typeof window !== 'undefined') {
       try {
         const earlyToken = localStorage.getItem('app_google_token');
         if (earlyToken) {
           providerToken = earlyToken;
         }
       } catch(e) {}
    }
    
    // Fallback 2: Parse from URL if still missing
    if (!providerToken && typeof window !== 'undefined') {
       const hashStr = window.location.hash.substring(1);
       if (hashStr.includes('provider_token=')) {
          const params = new URLSearchParams(hashStr);
          providerToken = params.get('provider_token') || undefined;
       }
    }

    if (providerToken) {
      cachedAccessToken = providerToken;
      try {
        localStorage.setItem(STORAGE_KEY_TOKEN, cachedAccessToken);
        localStorage.setItem(STORAGE_KEY_EXPIRY, (Date.now() + 3500 * 1000).toString());
      } catch(e) {}
    }
    
    const meta = session.user?.user_metadata;
    if (meta) {
      cachedUser = {
        displayName: meta.full_name || meta.name || null,
        email: session.user?.email || null,
        photoURL: meta.avatar_url || meta.picture || null
      };
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cachedUser));
      } catch(e) {}
    }

    if (cachedAccessToken && cachedUser && onAuthSuccessCallback) {
      onAuthSuccessCallback(cachedUser, cachedAccessToken);
    }
  }
});

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (onAuthSuccess) setOnAuthSuccessCallback(onAuthSuccess);
  if (onAuthFailure) setOnAuthFailureCallback(onAuthFailure);

  const performSilentLogin = async () => {
    // 1. URL 해시 혹은 Supabase Session을 통해 데스크톱(Tauri) 환경에서 리턴된 토큰 추출
    if (isTauri()) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          const providerToken = data.session.provider_token;
          if (providerToken) {
            cachedAccessToken = providerToken;
            localStorage.setItem(STORAGE_KEY_TOKEN, cachedAccessToken);
            localStorage.setItem(STORAGE_KEY_EXPIRY, (Date.now() + 3500 * 1000).toString());
          }
          
          const meta = data.session.user?.user_metadata;
          if (meta) {
            cachedUser = {
              displayName: meta.full_name || meta.name || null,
              email: data.session.user?.email || null,
              photoURL: meta.avatar_url || meta.picture || null
            };
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cachedUser));
          }
        }
      } catch(e) {
        console.error("Failed to parse Tauri Supabase session info:", e);
      }
    }

    const expiryStr = localStorage.getItem(STORAGE_KEY_EXPIRY);
    const isExpired = expiryStr ? (Date.now() >= parseInt(expiryStr, 10)) : true;

    if (cachedAccessToken && cachedUser && !isExpired) {
      // We already have a valid token from local storage and it's not expired
      if (onAuthSuccessCallback) onAuthSuccessCallback(cachedUser, cachedAccessToken);
      return;
    }

    // Attempt silent sign-in to refresh or recover the token
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await GoogleSignIn.initialize({
            clientId: WEB_CLIENT_ID,
            scopes: ['profile', 'email', DRIVE_APP_DATA_SCOPE],
          });
          
          console.log('auth.ts: Native Google Sign-In Silent 복구 시도...');
          const result = await GoogleSignIn.signIn(); // 기존 세션을 바탕으로 자동 로그인 시도
          if (result && result.accessToken) {
            cachedAccessToken = result.accessToken;
            cachedUser = {
              displayName: result.displayName || `${result.givenName || ''} ${result.familyName || ''}`.trim(),
              email: result.email || null,
              photoURL: result.imageUrl || null,
            };
            localStorage.setItem(STORAGE_KEY_TOKEN, cachedAccessToken);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cachedUser));
            localStorage.setItem(STORAGE_KEY_EXPIRY, (Date.now() + 3500 * 1000).toString());
            if (onAuthSuccessCallback) onAuthSuccessCallback(cachedUser, cachedAccessToken);
            return;
          }
        } catch (e) {
          console.log('Silent login failed for native', e);
        }
      } else {
        // Web silent login skip
      }
    } catch (err) {
      console.log('Init auth error:', err);
    }

    // 만약 자동 로그인 실패했고 기존 토큰이 이미 만료된 경우 최종 로그아웃 처리
    if (isExpired && cachedAccessToken) {
      console.log('auth.ts: Silent 로그인 실패 및 세션 만료로 로그아웃 처리');
      await logout();
    } else if (cachedAccessToken && cachedUser && isExpired) {
      // 1시간이 지났으나 로그인 시도가 오프라인 등으로 임시 실패한 경우, 
      // 일단 기존 토큰을 그대로 유지하여 오프라인에서 앱은 쓸 수 있게 하고, 
      // API 통신 시 401이 나면 그때 다시 로그아웃을 시도하도록 임시 패스함.
      if (onAuthSuccessCallback) onAuthSuccessCallback(cachedUser, cachedAccessToken);
    } else {
      if (onAuthFailureCallback) onAuthFailureCallback();
    }
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
    // Web GIS & Tauri
    if (isTauri()) {
      // Tauri 환경에서는 구글 클라우드 리디렉트 Origin 에러(localhost 제한)를 우회하기 위해
      // "앱에 이미 연동되어 있는" Supabase Auth를 브릿지로 사용합니다.
      // 이렇게 하면 구글은 통과된 도메인(.supabase.co)에서 요청이 왔다고 착각하므로 완벽히 동작합니다.
      const redirectUri = window.location.origin; // e.g. http://tauri.localhost
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: `profile email ${DRIVE_APP_DATA_SCOPE}`,
          redirectTo: redirectUri,
          queryParams: {
            prompt: 'select_account',
          }
        }
      });
      if (error) {
         console.error("Supabase OAuth error:", error);
         throw error;
      }

      // 페이지가 이동하므로 이 프로미스는 반환되지 않음
      return new Promise(() => {});
    }

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
      
      googleTokenClient.requestAccessToken({ prompt: 'select_account' });
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
  
  if (isTauri()) {
     await supabase.auth.signOut();
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