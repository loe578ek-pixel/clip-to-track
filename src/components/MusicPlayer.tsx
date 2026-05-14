import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Track } from "@/pages/Index";
import { useVolume } from "@/contexts/VolumeContext";
import { mediaSession } from "@/lib/mediaSession";
import { nativeMediaControls } from "@/lib/nativeMediaControls";
import { NowPlayingNative } from "@/lib/iosNowPlaying";
import { storageService } from "@/lib/storageService";
import { Capacitor } from "@capacitor/core";

interface MusicPlayerProps {
  track: Track;
  onNext?: () => void;
  onPrevious?: () => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  playlistName?: string;
}

// On iOS we use a native AVPlayer (Swift) for playback so the lockscreen
// pause/play/seek/next/prev controls work reliably even when JS is frozen
// in background. On web/Android we keep the HTML5 <audio> element.
const IS_IOS_NATIVE = Capacitor.getPlatform() === 'ios';

export const MusicPlayer = ({ track, onNext, onPrevious, onEnded, autoPlay = false, playlistName }: MusicPlayerProps) => {
  const { masterVolume } = useVolume();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState([75]);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Decide whether to use native AVPlayer for the current track.
  // We need a non-empty file URI (Capacitor Filesystem) for AVPlayer; if missing OR if it
  // failed at load time, fall back to HTML5.
  const [nativeFailed, setNativeFailed] = useState(false);
  const hasLocalPath = !!(track.localFilePath && track.localFilePath.trim() !== '');
  const useNative = IS_IOS_NATIVE && hasLocalPath && !nativeFailed;

  // ---- Native AVPlayer event listener (iOS only) ----
  useEffect(() => {
    if (!IS_IOS_NATIVE) return;
    let removeFn: (() => Promise<void>) | null = null;
    let cancelled = false;

    NowPlayingNative.addListener('nativeAudio', (event) => {
      if (event.event === 'timeupdate') {
        setCurrentTime((event as any).currentTime || 0);
      } else if (event.event === 'play') {
        setIsPlaying(true);
      } else if (event.event === 'pause') {
        setIsPlaying(false);
      } else if (event.event === 'ended') {
        setIsPlaying(false);
        setCurrentTime(0);
        if (onEnded) onEnded();
      }
    }).then((handle) => {
      if (cancelled) {
        handle.remove();
      } else {
        removeFn = handle.remove.bind(handle);
      }
    });

    return () => {
      cancelled = true;
      if (removeFn) removeFn();
    };
  }, [onEnded]);

  // Set up media session callbacks (for next/previous from lockscreen).
  // On iOS, play/pause/toggle/seek are handled natively by AVPlayer in Swift.
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    
    const callbacks = {
      onPlay: () => {
        if (useNative) {
          NowPlayingNative.playNative().catch(() => {});
        } else if (audioRef.current) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(err => {
            console.error('Error playing from media controls:', err);
          });
        }
      },
      onPause: () => {
        if (useNative) {
          NowPlayingNative.pauseNative().catch(() => {});
        } else if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      },
      onNext: () => { if (onNext) onNext(); },
      onPrevious: () => { if (onPrevious) onPrevious(); },
      onSeek: (time: number) => {
        if (useNative) {
          NowPlayingNative.seekNative({ position: time }).catch(() => {});
          setCurrentTime(time);
        } else if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
        }
      }
    };
    
    if (isNative) {
      nativeMediaControls.setCallbacks(callbacks);
    } else {
      mediaSession.setCallbacks(callbacks);
    }
  }, [onNext, onPrevious, useNative]);

  // Load track when it changes
  useEffect(() => {
    // Reset native-failure flag whenever the track identity changes
    setNativeFailed(false);

    console.log('[MusicPlayer] Loading track:', {
      id: track.id,
      title: track.title,
      hasLocalPath,
      localFilePath: track.localFilePath,
      audioUrl: track.audioUrl ? track.audioUrl.slice(0, 60) + '...' : '(none)',
      useNative,
      platform: Capacitor.getPlatform(),
    });

    if (useNative) {
      // Native AVPlayer: load via Swift plugin
      NowPlayingNative.loadTrack({
        uri: track.localFilePath!,
        title: track.title,
        artist: track.originalFileName,
        album: playlistName || '',
        duration: track.duration,
        autoPlay,
      }).then(() => {
        if (autoPlay) setIsPlaying(true);
        const finalVolume = isMuted ? 0 : (volume[0] / 100) * (masterVolume / 100);
        NowPlayingNative.setVolumeNative({ volume: finalVolume }).catch(() => {});
      }).catch(err => {
        console.error('[MusicPlayer] Native loadTrack failed, falling back to HTML5:', err);
        setNativeFailed(true);
      });
      nativeMediaControls.updateTrack({
        title: track.title,
        artist: track.originalFileName,
        duration: track.duration
      }, playlistName);
      setCurrentTime(0);
      return;
    }

    // HTML5 audio path (web / Android / iOS without localFilePath / native fallback)
    let cancelled = false;
    const setupHtml5 = async () => {
      if (!audioRef.current) {
        console.error('[MusicPlayer] HTML5 audio element not mounted');
        return;
      }

      // Resolve a usable src: prefer existing audioUrl, otherwise pull from local storage
      let src = track.audioUrl;
      if ((!src || src === '') && track.localFilePath) {
        try {
          src = await storageService.getAudioFile(track.localFilePath);
          console.log('[MusicPlayer] Resolved HTML5 src from localFilePath');
        } catch (err) {
          console.error('[MusicPlayer] Failed to resolve audio from localFilePath:', err);
        }
      }

      if (!src) {
        console.error('[MusicPlayer] No playable source for track', track.id);
        return;
      }
      if (cancelled || !audioRef.current) return;

      audioRef.current.src = src;
      audioRef.current.load();

      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        nativeMediaControls.updateTrack({
          title: track.title,
          artist: track.originalFileName,
          duration: track.duration
        }, playlistName);
      } else {
        mediaSession.enableBackgroundPlayback();
        mediaSession.updateTrack({
          title: track.title,
          artist: track.originalFileName,
          duration: track.duration
        }, playlistName);
      }

      if (autoPlay) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          if (isNative) nativeMediaControls.updatePlaybackState(true, currentTime);
          else mediaSession.updatePlaybackState(true, currentTime);
        } catch (error) {
          console.error('[MusicPlayer] Error playing audio:', error);
        }
      }
    };
    setupHtml5();
    return () => { cancelled = true; };
  }, [track.id, track.audioUrl, track.localFilePath, track.playbackKey, autoPlay, playlistName, useNative, hasLocalPath]);

  // HTML5 audio element listeners (skipped on native iOS path)
  useEffect(() => {
    if (useNative) return;
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => {
      setIsPlaying(true);
      const isNative = Capacitor.isNativePlatform();
      if (isNative) nativeMediaControls.updatePlaybackState(true, audio.currentTime);
      else mediaSession.updatePlaybackState(true, audio.currentTime);
    };
    const handlePause = () => {
      setIsPlaying(false);
      const isNative = Capacitor.isNativePlatform();
      if (isNative) nativeMediaControls.updatePlaybackState(false, audio.currentTime);
      else mediaSession.updatePlaybackState(false, audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      const isNative = Capacitor.isNativePlatform();
      if (isNative) nativeMediaControls.updatePlaybackState(false, 0);
      else mediaSession.updatePlaybackState(false, 0);
      if (onEnded) onEnded();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onEnded, useNative]);

  // Smooth lockscreen position updates (HTML5 only; native AVPlayer pushes its own)
  useEffect(() => {
    if (useNative) return;
    if (!isPlaying || !audioRef.current) return;

    const isNative = Capacitor.isNativePlatform();
    const updateInterval = setInterval(() => {
      const audio = audioRef.current;
      if (audio && !isNaN(audio.currentTime)) {
        if (isNative) nativeMediaControls.updatePlaybackState(true, audio.currentTime);
        else mediaSession.updatePlaybackState(true, audio.currentTime);
      }
    }, 1000);

    return () => clearInterval(updateInterval);
  }, [isPlaying, useNative]);

  // Volume sync
  useEffect(() => {
    const finalVolume = isMuted ? 0 : (volume[0] / 100) * (masterVolume / 100);
    if (useNative) {
      NowPlayingNative.setVolumeNative({ volume: finalVolume }).catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.volume = finalVolume;
    }
  }, [volume, isMuted, masterVolume, useNative]);

  const togglePlayPause = async () => {
    if (useNative) {
      try {
        if (isPlaying) {
          await NowPlayingNative.pauseNative();
        } else {
          await NowPlayingNative.playNative();
        }
        return;
      } catch (e) {
        console.error('[MusicPlayer] Native toggle failed, falling back to HTML5:', e);
        setNativeFailed(true);
        // fall through to HTML5 path below
      }
    }

    if (!audioRef.current) return;
    const isNative = Capacitor.isNativePlatform();
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (isNative) nativeMediaControls.updatePlaybackState(false, currentTime);
      else mediaSession.updatePlaybackState(false, currentTime);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        if (isNative) nativeMediaControls.updatePlaybackState(true, currentTime);
        else mediaSession.updatePlaybackState(true, currentTime);
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (!track.duration) return;
    const newTime = (value[0] / 100) * track.duration;
    if (useNative) {
      NowPlayingNative.seekNative({ position: newTime }).catch(() => {});
      setCurrentTime(newTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRepeatIcon = () => <Repeat className="h-4 w-4" />;

  const toggleRepeat = () => {
    const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const progressPercentage = track.duration ? (currentTime / track.duration) * 100 : 0;

  return (
    <div className="bg-card/95 backdrop-blur-md border-t border-white/10 p-4">
      {/* HTML5 audio element kept mounted always so we can fall back at runtime */}
      <audio ref={audioRef} style={{ display: useNative ? 'none' : undefined }} preload="auto" />
      
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <div className="min-w-0">
            <h4 className="font-medium truncate text-white">{track.title}</h4>
            <p className="text-sm text-muted-foreground truncate">
              {track.originalFileName}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2 flex-1 max-w-md">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShuffled(!isShuffled)}
              className={`transition-colors ${isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={!onPrevious}
              className="text-muted-foreground hover:text-white"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              onClick={togglePlayPause}
              className="w-8 h-8 rounded-full bg-white hover:bg-white/90 text-black hover:scale-105 transition-all"
              size="icon"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={!onNext}
              className="text-muted-foreground hover:text-white"
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              className={`transition-colors ${repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
            >
              {getRepeatIcon()}
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>
          </div>

          <div className="flex items-center space-x-2 w-full">
            <span className="text-xs text-muted-foreground min-w-10">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1">
              <Slider
                value={[progressPercentage]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="w-full"
              />
            </div>
            <span className="text-xs text-muted-foreground min-w-10">
              {formatTime(track.duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="text-muted-foreground hover:text-white"
          >
            {isMuted || volume[0] === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <div className="w-20">
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
