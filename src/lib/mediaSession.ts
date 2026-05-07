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

    // Set up action handlers
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
  }

  updateTrack(track: MediaSessionTrack, playlistName?: string) {
    if (!('mediaSession' in navigator)) return;

    this.currentTrack = track;
    this.duration = track.duration;

    // Update metadata with the app icon as artwork (shown on lockscreen)
    const artworkUrl = `${window.location.origin}/app-icon.png`;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: playlistName ? `${track.artist} • ${playlistName}` : track.artist,
      album: track.album || '',
      artwork: [
        { src: artworkUrl, sizes: '96x96', type: 'image/png' },
        { src: artworkUrl, sizes: '192x192', type: 'image/png' },
        { src: artworkUrl, sizes: '256x256', type: 'image/png' },
        { src: artworkUrl, sizes: '384x384', type: 'image/png' },
        { src: artworkUrl, sizes: '512x512', type: 'image/png' },
        { src: artworkUrl, sizes: '1024x1024', type: 'image/png' },
      ],
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
      navigator.mediaSession.setPositionState({
        duration: this.duration,
        playbackRate: 1.0,
        position: this.currentTime,
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
