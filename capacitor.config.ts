import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.muzic',
  appName: 'Muzic',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'muzic'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0A0818'
  },
  android: {
    backgroundColor: '#0A0818'
  }
};

export default config;
