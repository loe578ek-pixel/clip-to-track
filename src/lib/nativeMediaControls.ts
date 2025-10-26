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
  private permissionGranted = false;
  private permissionChecked = false;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    // Don't initialize immediately - wait for first use
  }

  private async ensureInitialized() {
    if (this.initialized || !this.isNative) return;
    
    // Check permissions first (only once)
    if (!this.permissionChecked) {
      this.permissionChecked = true;
      this.permissionGranted = await checkNotificationPermission();
      console.log('📋 Notification permission status:', this.permissionGranted ? 'Granted' : 'Pending');
    }
    
    // Don't initialize if we don't have permission yet
    // The plugin will handle permission request on first create() call
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
      console.log('🎵 Creating native media notification for:', track.title);
      console.log('📊 Track details:', { 
        title: track.title, 
        artist: track.artist, 
        duration: track.duration,
        hasArtwork: !!track.artwork 
      });
      
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

      console.log('📱 Creating notification with config:', JSON.stringify(config, null, 2));
      console.log('📋 About to call CapacitorMusicControls.create() - permission dialog may appear on Android 13+');
      
      // This call will trigger permission request on Android 13+ if not already granted
      await CapacitorMusicControls.create(config);
      
      // Mark permission as granted if we got here successfully
      this.permissionGranted = true;
      
      await CapacitorMusicControls.updateIsPlaying({ isPlaying: this.isPlaying });
      
      console.log('✅ Native media notification created successfully');
      console.log('📊 Notification state - isPlaying:', this.isPlaying, 'duration:', track.duration);
    } catch (error) {
      console.error('❌ Error creating native media notification:', error);
      console.error('📋 Error details:', JSON.stringify(error));
      console.error('📋 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // If permission was denied, log it
      if (error instanceof Error && error.message?.includes('permission')) {
        console.error('🚫 Permission denied - user needs to grant notification permission in Android settings');
        console.error('💡 Go to: Settings → Apps → ClipToTrack → Notifications → Enable notifications');
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
