import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brightstudy.app',
  appName: 'Bright Study',
  webDir: 'dist',                // 💡 여기에 쉼표(,)를 꼭 찍어주세요!
  bundledWebRuntime: false,
  plugins: {
    CapacitorHttp: {
      enabled: false
    },
    GoogleAuth: {
      scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.appdata'],
      serverClientId: "926621621039-b6idpq9gvm3h1gn5ltb2p609pf401aaf.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;