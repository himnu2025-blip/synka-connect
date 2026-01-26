import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.synka.app',
  appName: 'Synka',
  webDir: 'dist',
  // Deep linking configuration
  server: {
    // For development with hot reload - enable this to see live changes
    url: 'https://f179cf0b-9d7d-4683-9a9f-315f6ad3e5bb.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
  // App plugin for deep linking
  App: {
    launchShowDuration: 0,
  },

  // Splash screen control (IMPORTANT)
  SplashScreen: {
    autoHide: false,
    showSpinner: true,
  },
},
  // Android specific settings
  android: {
    // Allow deep links
    allowMixedContent: true,
  },
  // iOS specific settings  
  ios: {
    // iOS scheme for custom URL scheme deep linking
    scheme: 'synka',
  },
};

export default config;
