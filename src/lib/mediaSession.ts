export interface MediaSessionTrack {
  title: string;
  artist: string;
  album?: string;
  duration: number;
}

export interface MediaSessionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
}

class MediaSessionService {
  private callbacks: MediaSessionCallbacks | null = null;
  private currentTrack: MediaSessionTrack | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private duration = 0;

  constructor() {
    this.setupMediaSession();
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) {
      console.warn('Media Session API not supported');
      return;
    }
    this.registerHandlers();
  }

  /**
   * (Re)registers every lockscreen action. On iOS the WebView owns the
   * lockscreen widget, so previous/next only stay enabled while these
   * handlers exist; re-registering on each track keeps them active.
   */
  private registerHandlers() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => {
      this.callbacks?.onPlay();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.callbacks?.onPause();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.callbacks?.onPrevious();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.callbacks?.onNext();
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        this.callbacks?.onSeek(details.seekTime);
      }
    });

    // Disable seek backward/forward (the +10/-10 buttons) so iOS shows
    // previous/next track buttons instead on the lockscreen.
    try {
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    } catch (e) {
      // Some browsers throw if null isn't supported; safely ignore.
    }
  }

  setCallbacks(callbacks: MediaSessionCallbacks) {
    this.callbacks = callbacks;
    this.registerHandlers();
  }

  updateTrack(track: MediaSessionTrack, playlistName?: string, artworkUrl?: string | null) {
    if (!('mediaSession' in navigator)) return;

    this.currentTrack = track;
    this.duration = track.duration;
    this.registerHandlers();

    // Use the track's square video thumbnail when available, otherwise the app icon.
    const fallbackIcon = `${window.location.origin}/app-icon.png`;
    const artwork = artworkUrl
      ? [
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
          { src: fallbackIcon, sizes: '512x512', type: 'image/png' },
        ]
      : [
          { src: fallbackIcon, sizes: '96x96', type: 'image/png' },
          { src: fallbackIcon, sizes: '192x192', type: 'image/png' },
          { src: fallbackIcon, sizes: '256x256', type: 'image/png' },
          { src: fallbackIcon, sizes: '384x384', type: 'image/png' },
          { src: fallbackIcon, sizes: '512x512', type: 'image/png' },
          { src: fallbackIcon, sizes: '1024x1024', type: 'image/png' },
        ];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || 'TKPlaylist',
      album: track.album || '',
      artwork,
    });

    this.updatePositionState();
  }

  updatePlaybackState(isPlaying: boolean, currentTime: number) {
    if (!('mediaSession' in navigator)) return;

    this.isPlaying = isPlaying;
    this.currentTime = currentTime;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    this.updatePositionState();
  }

  private updatePositionState() {
    if (!('mediaSession' in navigator) || !this.currentTrack) return;

    try {
      if (!Number.isFinite(this.duration) || this.duration <= 0) return;
      navigator.mediaSession.setPositionState({
        duration: this.duration,
        playbackRate: 1.0,
        position: Math.min(Math.max(0, this.currentTime), this.duration),
      });
    } catch (error) {
      console.error('Error updating position state:', error);
    }
  }

  enableBackgroundPlayback() {
    // Enable background audio by preventing the default behavior
    // This works with the media session to keep audio playing in background
    if ('serviceWorker' in navigator) {
      // Register a minimal service worker for background functionality
      this.registerServiceWorker();
    }
  }

  private async registerServiceWorker() {
    try {
      // Create a minimal service worker blob for background playback
      const swBlob = new Blob([`
        self.addEventListener('message', (event) => {
          // Handle background playback messages
          if (event.data && event.data.type === 'KEEP_ALIVE') {
            // Keep the service worker alive for background audio
          }
        });
      `], { type: 'application/javascript' });
      
      const swUrl = URL.createObjectURL(swBlob);
      await navigator.serviceWorker.register(swUrl);
      console.log('Background playback service worker registered');
    } catch (error) {
      console.error('Failed to register service worker:', error);
    }
  }
}

export const mediaSession = new MediaSessionService();
