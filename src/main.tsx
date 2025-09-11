import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

// Initialize Capacitor for mobile
const initializeApp = async () => {
  if (Capacitor.isNativePlatform()) {
    // Set status bar style for mobile
    await StatusBar.setStyle({ style: Style.Dark })
    
    // Hide splash screen after initialization
    await SplashScreen.hide()
  }
}

// Initialize the app
initializeApp()

createRoot(document.getElementById("root")!).render(<App />);
