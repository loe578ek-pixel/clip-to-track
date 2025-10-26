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
    console.log('Native media controls initialized');
    if (!this.listenersSet) {
      await this.setupActionHandlers();
      this.listenersSet = true;
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
      await MusicControls.create({
        track: track.title,
        artist: track.artist,
        album: playlistName || track.album || '',
        cover: track.artwork || '',
        isPlaying: this.isPlaying,
        dismissable: false,
        hasPrev: true,
        hasNext: true,
        hasClose: false,
        duration: track.duration,
        elapsed: track.elapsed || 0,
        hasSkipForward: false,
        hasSkipBackward: false,
        skipForwardInterval: 0,
        skipBackwardInterval: 0,
        hasScrubbing: true,
        notificationIcon: 'notification'
      });

      await MusicControls.updateIsPlaying({ isPlaying: this.isPlaying });
      console.log('✅ Native media notification created with track:', track.title);
    } catch (error) {
      console.error('❌ Error updating native media controls:', error);
    }
  }

  private setupActionHandlers() {
    if (!this.isNative) return;

    // Subscribe to control events
    MusicControls.addListener('controlsNotification', (info: any) => {
      console.log('Native media control action:', info.message);
      
      switch (info.message) {
        case 'music-controls-play':
          this.callbacks?.onPlay();
          break;
        case 'music-controls-pause':
          this.callbacks?.onPause();
          break;
        case 'music-controls-previous':
          this.callbacks?.onPrevious();
          break;
        case 'music-controls-next':
          this.callbacks?.onNext();
          break;
        case 'music-controls-seek-to':
          if (this.callbacks?.onSeek && info.position !== undefined) {
            this.callbacks.onSeek(info.position);
          }
          break;
      }
    });

    // Listen to when the notification is destroyed
    MusicControls.addListener('controlsDestroyed', () => {
      console.log('Native media controls destroyed');
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
    } catch (error) {
      console.error('Error destroying media controls:', error);
    }
  }

  async listen() {
    if (!this.isNative) return;

    try {
      await MusicControls.listen();
    } catch (error) {
      console.error('Error starting to listen:', error);
    }
  }
}

export const nativeMediaControls = new NativeMediaControlsService();
