import { Capacitor } from '@capacitor/core';
import * as MusicControlsModule from 'capacitor-music-controls-plugin-v3';
import { NowPlayingNative } from './iosNowPlaying';

// Access the MusicControls object from the module (Android only)
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
  private currentPlaylistName?: string;
  private isPlaying = false;
  private isNative = false;
  private platform: 'ios' | 'android' | 'web' = 'web';
  private listenersSet = false;
  private initialized = false;
  private lastHandledRemoteEventId: number | null = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.platform = (Capacitor.getPlatform() as 'ios' | 'android' | 'web');
  }

  private async ensureInitialized() {
    if (this.initialized || !this.isNative) return;
    if (!this.callbacks) {
      console.log('⚠️ Skipping initialization - callbacks not set yet');
      return;
    }
    try {
      await this.setupNativeControls();
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      console.log('⚠️ Native media controls init skipped:', error);
    }
  }

  private async setupNativeControls() {
    if (this.listenersSet) return;
    this.listenersSet = true;

    if (this.platform === 'ios') {
      console.log('🍎 Initializing iOS NowPlayingPlugin (custom)');
      try {
        await NowPlayingNative.activate();
        await NowPlayingNative.addListener('remoteCommand', (event) => {
          this.handleIosRemoteCommand(event);
        });

        document.addEventListener('nowPlayingRemoteCommand', this.handleDocumentRemoteCommand as EventListener);
        console.log('✅ iOS NowPlayingPlugin ready');
      } catch (error) {
        this.listenersSet = false;
        console.error('❌ iOS NowPlayingPlugin init error:', error);
        throw error;
      }
      return;
    }

    // Android
    console.log('🤖 Initializing Android MusicControls plugin');
    this.setupAndroidHandlers();
    try {
      await MusicControls.listen();
      console.log('✅ Android media controls listening');
    } catch (error) {
      this.listenersSet = false;
      console.error('❌ Error starting Android listener:', error);
      throw error;
    }
  }

  setCallbacks(callbacks: NativeMediaCallbacks) {
    this.callbacks = callbacks;
    if (this.isNative && !this.initialized) {
      this.ensureInitialized();
    }
  }

  private handleDocumentRemoteCommand = (event: Event) => {
    const customEvent = event as CustomEvent<{ action: 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'seek'; position?: number; eventId?: number }>;
    if (!customEvent.detail) return;
    this.handleIosRemoteCommand(customEvent.detail);
  };

  private handleIosRemoteCommand(event: { action: 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'seek'; position?: number; eventId?: number }) {
    if (typeof event.eventId === 'number') {
      if (this.lastHandledRemoteEventId === event.eventId) {
        return;
      }
      this.lastHandledRemoteEventId = event.eventId;
    }

    console.log('🍎 iOS remote command:', event);
    switch (event.action) {
      case 'play':
        this.callbacks?.onPlay();
        break;
      case 'pause':
        this.callbacks?.onPause();
        break;
      case 'toggle':
        if (this.isPlaying) this.callbacks?.onPause();
        else this.callbacks?.onPlay();
        break;
      case 'next':
        this.callbacks?.onNext();
        break;
      case 'previous':
        this.callbacks?.onPrevious();
        break;
      case 'seek':
        if (typeof event.position === 'number') {
          this.callbacks?.onSeek?.(event.position);
        }
        break;
    }
  }

  async updateTrack(track: NativeMediaTrack, playlistName?: string) {
    if (!this.isNative) return;
    await this.ensureInitialized();

    this.currentTrack = track;
    this.currentPlaylistName = playlistName;

    if (this.platform === 'ios') {
      try {
        await NowPlayingNative.setNowPlaying({
          title: track.title,
          artist: track.artist,
          album: playlistName || track.album || '',
          duration: track.duration,
          elapsed: track.elapsed || 0,
          isPlaying: this.isPlaying,
        });
        console.log('✅ iOS Now Playing updated:', track.title);
      } catch (error) {
        console.error('❌ iOS setNowPlaying error:', error);
      }
      return;
    }

    // Android via capacitor-music-controls-plugin-v3
    try {
      const cover = track.artwork || `${window.location.origin}/app-icon.png`;
      await MusicControls.create({
        track: track.title,
        artist: track.artist,
        album: playlistName || track.album || '',
        cover,
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
      console.log('✅ Android notification created:', track.title);
    } catch (error) {
      console.error('❌ Android updateTrack error:', error);
    }
  }

  private setupAndroidHandlers() {
    document.addEventListener('controlsNotification', (event: any) => {
      const message = event.message || event.detail?.message;
      switch (message) {
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
          if (this.callbacks?.onSeek && event.position !== undefined) {
            this.callbacks.onSeek(event.position);
          }
          break;
      }
    });
  }

  async updatePlaybackState(isPlaying: boolean, currentTime: number) {
    if (!this.isNative || !this.currentTrack) return;
    await this.ensureInitialized();

    this.isPlaying = isPlaying;

    if (this.platform === 'ios') {
      try {
        await NowPlayingNative.updatePlayback({ elapsed: currentTime, isPlaying });
      } catch (error) {
        console.error('❌ iOS updatePlayback error:', error);
      }
      return;
    }

    try {
      await MusicControls.updateIsPlaying({ isPlaying });
      await MusicControls.updateElapsed({ elapsed: currentTime, isPlaying });
    } catch (error) {
      console.error('❌ Android updatePlaybackState error:', error);
    }
  }

  async destroy() {
    if (!this.isNative) return;
    try {
      if (this.platform === 'ios') {
        await NowPlayingNative.clear();
      } else {
        await MusicControls.destroy();
      }
    } catch (error) {
      console.error('❌ Error destroying media controls:', error);
    }
  }
}

export const nativeMediaControls = new NativeMediaControlsService();
