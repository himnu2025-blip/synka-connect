import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.synka.app',
  appName: 'Synka',
  webDir: 'dist',
  // Deep linking configuration
  server: {
    // For development with hot reload (comment out for production builds)
    // url: 'https://6e8935e5-98c5-41f9-8825-fee54b2dc734.lovableproject.com?forceHideBadge=true',
    // cleartext: true,
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
