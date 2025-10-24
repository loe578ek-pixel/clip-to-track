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
    
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Initializing native features...');
      
      // Set status bar style for mobile
      await StatusBar.setStyle({ style: Style.Dark });
      console.log('✅ Status bar configured');
    }
    
    // Render the app
    console.log('🎨 Rendering React app...');
    console.log('Document ready state:', document.readyState);
    console.log('Window location:', window.location.href);
    
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error('❌ Root element not found!');
      console.error('Document body HTML:', document.body.innerHTML);
      throw new Error('Root element not found');
    }
    
    console.log('✅ Root element found, creating React root...');
    createRoot(rootElement).render(<App />);
    console.log('✅ React app rendered successfully');
    
    // Hide splash screen after React is ready
    if (Capacitor.isNativePlatform()) {
      setTimeout(async () => {
        await SplashScreen.hide();
        console.log('✅ Splash screen hidden');
      }, 100);
    }
  } catch (error) {
    console.error('❌ App initialization error:', error);
    // Show error on screen for debugging
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
