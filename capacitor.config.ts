import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cliptotrack',
  appName: 'clip-to-track',
  webDir: 'dist',
  // Remove server config for native builds - only use for hot-reload during development
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0F0F11",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#1905C8",
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F0F11"
    }
  }
};

export default config;