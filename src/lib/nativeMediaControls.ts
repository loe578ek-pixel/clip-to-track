import { Capacitor } from '@capacitor/core';
import { CapacitorMusicControls } from 'capacitor-music-controls-plugin-v3';

// Check if POST_NOTIFICATIONS permission is available (Android 13+)
const checkNotificationPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return true; // iOS doesn't need explicit permission check for media controls
  }

  try {
    // On Android, try to check permission status via the plugin
    // If it fails, we'll assume we need to request permission
    return true; // We'll let the plugin handle permission internally
  } catch (error) {
    console.log('Permission check not available, will request when needed');
    return false;
  }
};

export interface NativeMediaTrack {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  elapsed?: number;
  artwork?: string;
}

export interface NativeMediaCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek?: (time: number) => void;
}

class NativeMediaControlsService {
  private callbacks: NativeMediaCallbacks | null = null;
  private currentTrack: NativeMediaTrack | null = null;
  private isPlaying = false;
  private isNative = false;
  private listenersSet = false;
  private initialized = false;
  private notificationCreated = false; // Track if notification was ever created

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  private async ensureInitialized() {
    if (this.initialized || !this.isNative) return;
    
    this.initialized = true;
    
    try {
      await this.setupNativeControls();
    } catch (error) {
      console.log('⚠️ Native media controls init skipped:', error);
    }
  }

  private async setupNativeControls() {
    console.log('🎵 Initializing native media controls...');
    if (!this.listenersSet) {
      this.setupActionHandlers();
      this.listenersSet = true;
      console.log('✅ Native media control listeners set up');
    }
  }

  setCallbacks(callbacks: NativeMediaCallbacks) {
    this.callbacks = callbacks;
  }

  async updateTrack(track: NativeMediaTrack, playlistName?: string) {
    if (!this.isNative) return;
    await this.ensureInitialized();

    this.currentTrack = track;

    try {
      const config = {
        track: track.title,
        artist: track.artist,
        album: playlistName || track.album || 'Unknown Album',
        cover: track.artwork || '',
        isPlaying: this.isPlaying,
        dismissable: false,
        hasPrev: true,
        hasNext: true,
        hasClose: false,
        duration: Math.round(track.duration),
        elapsed: Math.round(track.elapsed || 0),
        hasSkipForward: false,
        hasSkipBackward: false,
        skipForwardInterval: 0,
        skipBackwardInterval: 0,
        hasScrubbing: true,
        notificationIcon: 'ic_launcher',
        playIcon: 'media_play',
        pauseIcon: 'media_pause',
        prevIcon: 'media_prev',
        nextIcon: 'media_next',
        closeIcon: 'media_close',
        ticker: `Now playing "${track.title}"`
      };

      if (!this.notificationCreated) {
        // FIRST TIME: Create notification (this shows permission dialog on Android 13+)
        console.log('📱 Creating notification for FIRST time - permission dialog will appear');
        console.log('⏳ Waiting for user to grant permission...');
        
        await CapacitorMusicControls.create(config);
        
        this.notificationCreated = true;
        console.log('✅ Permission granted! Notification created');
      } else {
        // SUBSEQUENT TIMES: Just update the existing notification (no permission dialog)
        console.log('🔄 Updating existing notification for:', track.title);
        await CapacitorMusicControls.create(config);
      }
      
      await CapacitorMusicControls.updateIsPlaying({ isPlaying: this.isPlaying });
      
      console.log('✅ Media controls updated successfully');
    } catch (error) {
      console.error('❌ Error with media controls:', error);
      
      if (error instanceof Error && error.message?.includes('permission')) {
        console.error('🚫 Permission denied - enable notifications in Settings → Apps → ClipToTrack');
      }
    }
  }

  private setupActionHandlers() {
    if (!this.isNative) return;

    console.log('🎮 Setting up native media control action handlers...');

    // iOS: Use addListener
    CapacitorMusicControls.addListener('controlsNotification', (info: any) => {
      console.log('🎵 Native media control action (iOS):', info.message);
      this.handleControlEvent(info);
    });

    // Android 13+: Use document.addEventListener
    document.addEventListener('controlsNotification', ((event: any) => {
      console.log('🎵 Native media control action (Android):', event.message);
      const info = { message: event.message, position: event.position || 0 };
      this.handleControlEvent(info);
    }) as EventListener);

    // Listen to when the notification is destroyed
    CapacitorMusicControls.addListener('controlsDestroyed', () => {
      console.log('🗑️ Native media controls notification destroyed');
    });
  }

  private handleControlEvent(info: any) {
    switch (info.message) {
      case 'music-controls-play':
        console.log('▶️ Play button pressed on lockscreen');
        this.callbacks?.onPlay();
        break;
      case 'music-controls-pause':
        console.log('⏸️ Pause button pressed on lockscreen');
        this.callbacks?.onPause();
        break;
      case 'music-controls-previous':
        console.log('⏮️ Previous button pressed on lockscreen');
        this.callbacks?.onPrevious();
        break;
      case 'music-controls-next':
        console.log('⏭️ Next button pressed on lockscreen');
        this.callbacks?.onNext();
        break;
      case 'music-controls-seek-to':
        console.log('⏩ Seek to:', info.position);
        if (this.callbacks?.onSeek && info.position !== undefined) {
          this.callbacks.onSeek(info.position);
        }
        break;
      default:
        console.log('❓ Unknown media control action:', info.message);
    }
  }

  async updatePlaybackState(isPlaying: boolean, currentTime: number) {
    if (!this.isNative || !this.currentTrack) return;
    await this.ensureInitialized();

    this.isPlaying = isPlaying;

    try {
      await CapacitorMusicControls.updateIsPlaying({ isPlaying: isPlaying });
      await CapacitorMusicControls.updateElapsed({ 
        elapsed: currentTime,
        isPlaying: isPlaying 
      });
      console.log(`🎵 Playback state: ${isPlaying ? 'PLAYING' : 'PAUSED'} at ${currentTime.toFixed(1)}s`);
    } catch (error) {
      console.error('❌ Error updating playback state:', error);
    }
  }

  async destroy() {
    if (!this.isNative) return;

    try {
      await CapacitorMusicControls.destroy();
      console.log('🗑️ Native media controls destroyed');
    } catch (error) {
      console.error('❌ Error destroying media controls:', error);
    }
  }
}

export const nativeMediaControls = new NativeMediaControlsService();
