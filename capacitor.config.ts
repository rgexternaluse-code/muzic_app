import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.muzic',
  appName: 'Music Player',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
