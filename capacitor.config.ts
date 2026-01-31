import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.platformsports.app',
  appName: 'Platform Sports',
  webDir: 'public',
  server: {
    url: 'https://platform-sports.vercel.app',
    cleartext: false,
  },
};

export default config;
