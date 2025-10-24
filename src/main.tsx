import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

// Initialize Capacitor for mobile
const initializeApp = async () => {
  try {
    console.log('🚀 Starting app initialization...');
    console.log('Platform:', Capacitor.getPlatform());
    console.log('Is Native:', Capacitor.isNativePlatform());
    
    // Render the app FIRST (don't wait for native features)
    console.log('🎨 Rendering React app...');
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error('❌ Root element not found!');
      throw new Error('Root element not found');
    }
    
    console.log('✅ Root element found, creating React root...');
    createRoot(rootElement).render(<App />);
    console.log('✅ React app rendered successfully');
    
    // Initialize native features AFTER React loads (non-blocking)
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Initializing native features...');
      
      setTimeout(async () => {
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          console.log('✅ Status bar configured');
        } catch (err) {
          console.log('⚠️ Status bar init skipped:', err);
        }
        
        try {
          await SplashScreen.hide();
          console.log('✅ Splash screen hidden');
        } catch (err) {
          console.log('⚠️ Splash screen init skipped:', err);
        }
      }, 500);
    }
  } catch (error) {
    console.error('❌ App initialization error:', error);
    document.body.innerHTML = `
      <div style="padding: 20px; color: white; background: #0F0F11; font-family: monospace;">
        <h1>Initialization Error</h1>
        <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
        <pre>${error instanceof Error ? error.stack : ''}</pre>
      </div>
    `;
  }
}

// Initialize the app
initializeApp();
