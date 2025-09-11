import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Capacitor } from '@capacitor/core'

// Initialize Capacitor for mobile (non-blocking)
if (Capacitor.isNativePlatform()) {
  // Use dynamic imports to avoid blocking the main thread
  Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen')
  ]).then(async ([{ StatusBar, Style }, { SplashScreen }]) => {
    try {
      await StatusBar.setStyle({ style: Style.Dark })
      await SplashScreen.hide()
    } catch (error) {
      console.log('Capacitor initialization error:', error)
    }
  })
}

createRoot(document.getElementById("root")!).render(<App />);
