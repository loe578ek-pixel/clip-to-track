import { Capacitor } from '@capacitor/core';
import * as MusicControlsModule from 'capacitor-music-controls-plugin-v3';

// Access the MusicControls object from the module
const MusicControls = (MusicControlsModule as any).MusicControls || MusicControlsModule;

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

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    // Don't initialize immediately - wait for first use
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
      
      // CRITICAL: Must call listen() to start listening for control events
      try {
        await MusicControls.listen();
        console.log('✅ Native media controls listening for events');
      } catch (error) {
        console.error('❌ Error starting to listen:', error);
      }
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
      
      await MusicControls.create(config);
      await MusicControls.updateIsPlaying({ isPlaying: this.isPlaying });
      
      console.log('✅ Native media notification created successfully');
      console.log('📊 Notification state - isPlaying:', this.isPlaying, 'duration:', track.duration);
    } catch (error) {
      console.error('❌ Error creating native media notification:', error);
      console.error('📋 Error details:', JSON.stringify(error));
      console.error('📋 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
  }

  private setupActionHandlers() {
    if (!this.isNative) return;

    console.log('🎮 Setting up native media control action handlers...');

    // Subscribe to control events
    MusicControls.addListener('controlsNotification', (info: any) => {
      console.log('🎵 Native media control action:', info.message);
      
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
    });

    // Listen to when the notification is destroyed
    MusicControls.addListener('controlsDestroyed', () => {
      console.log('🗑️ Native media controls notification destroyed');
    });
  }

  async updatePlaybackState(isPlaying: boolean, currentTime: number) {
    if (!this.isNative || !this.currentTrack) return;
    await this.ensureInitialized();

    this.isPlaying = isPlaying;

    try {
      await MusicControls.updateIsPlaying({ isPlaying: isPlaying });
      await MusicControls.updateElapsed({ 
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
      await MusicControls.destroy();
      console.log('🗑️ Native media controls destroyed');
    } catch (error) {
      console.error('❌ Error destroying media controls:', error);
    }
  }
}

export const nativeMediaControls = new NativeMediaControlsService();
