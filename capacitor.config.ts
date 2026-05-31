import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cliptotrack',
  appName: 'TKPlaylist',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'cliptotrack',
    hostname: 'app.lovable.cliptotrack'
  },
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
