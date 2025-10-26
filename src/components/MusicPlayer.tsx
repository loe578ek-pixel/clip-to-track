import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Track } from "@/pages/Index";
import { useVolume } from "@/contexts/VolumeContext";
import { mediaSession } from "@/lib/mediaSession";
import { nativeMediaControls } from "@/lib/nativeMediaControls";
import { Capacitor } from "@capacitor/core";

interface MusicPlayerProps {
  track: Track;
  onNext?: () => void;
  onPrevious?: () => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  playlistName?: string;
}

export const MusicPlayer = ({ track, onNext, onPrevious, onEnded, autoPlay = false, playlistName }: MusicPlayerProps) => {
  const { masterVolume } = useVolume();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState([75]);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const initializeTrack = async () => {
      if (!audioRef.current) return;
      
      audioRef.current.src = track.audioUrl;
      audioRef.current.load();
      
      // Only set up media session on web (non-native)
      // On native, we'll wait until user presses play to avoid permission dialog issues
      const isNative = Capacitor.isNativePlatform();
      
      if (!isNative) {
        // Use web media session for web
        mediaSession.enableBackgroundPlayback();
        mediaSession.updateTrack({
          title: track.title,
          artist: track.originalFileName,
          duration: track.duration
        }, playlistName);
      }
      
      // Handle autoPlay for playlist transitions
      if (autoPlay) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          if (isNative) {
            nativeMediaControls.updatePlaybackState(true, 0);
          } else {
            mediaSession.updatePlaybackState(true, 0);
          }
        } catch (error) {
          console.error('Error with autoplay:', error);
        }
      } else if (isPlaying) {
        // Continue playing if was already playing
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          if (isNative) {
            nativeMediaControls.updatePlaybackState(true, currentTime);
          } else {
            mediaSession.updatePlaybackState(true, currentTime);
          }
        }).catch(error => {
          console.error('Error playing audio:', error);
        });
      }
    };
    
    initializeTrack();
  }, [track.audioUrl, track.playbackKey, autoPlay, playlistName]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      const newTime = audio.currentTime;
      setCurrentTime(newTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        nativeMediaControls.updatePlaybackState(false, 0);
      } else {
        mediaSession.updatePlaybackState(false, 0);
      }
      // Always call onEnded to let parent handle repeat logic and next track
      if (onEnded) {
        onEnded();
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onEnded, isPlaying]);

  // Smooth position updates for lockscreen notification (Android/iOS)
  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;

    const isNative = Capacitor.isNativePlatform();
    
    // Update lockscreen position every second for smooth progress
    const updateInterval = setInterval(() => {
      const audio = audioRef.current;
      if (audio && !isNaN(audio.currentTime)) {
        if (isNative) {
          nativeMediaControls.updatePlaybackState(true, audio.currentTime);
        } else {
          mediaSession.updatePlaybackState(true, audio.currentTime);
        }
      }
    }, 1000);

    return () => clearInterval(updateInterval);
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      const finalVolume = isMuted ? 0 : (volume[0] / 100) * (masterVolume / 100);
      audioRef.current.volume = finalVolume;
    }
  }, [volume, isMuted, masterVolume]);

  // Set up media session callbacks
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    
    const callbacks = {
      onPlay: () => {
        if (audioRef.current) {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error('Error playing from media controls:', error);
          });
        }
      },
      onPause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      },
      onNext: () => {
        if (onNext) onNext();
      },
      onPrevious: () => {
        if (onPrevious) onPrevious();
      },
      onSeek: (time: number) => {
        if (audioRef.current) {
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
  }, [onNext, onPrevious]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    const isNative = Capacitor.isNativePlatform();
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (isNative) {
        nativeMediaControls.updatePlaybackState(false, currentTime);
      } else {
        mediaSession.updatePlaybackState(false, currentTime);
      }
    } else {
      try {
        // On native, initialize media controls on FIRST play press
        // This ensures permission dialog appears when user is ready
        if (isNative) {
          console.log('📱 Initializing native media controls on play...');
          await nativeMediaControls.updateTrack({
            title: track.title,
            artist: track.originalFileName,
            duration: track.duration
          }, playlistName);
          console.log('✅ Media controls initialized');
        }
        
        await audioRef.current.play();
        setIsPlaying(true);
        if (isNative) {
          nativeMediaControls.updatePlaybackState(true, currentTime);
        } else {
          mediaSession.updatePlaybackState(true, currentTime);
        }
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && track.duration) {
      const newTime = (value[0] / 100) * track.duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'one') return <Repeat className="h-4 w-4" />;
    if (repeatMode === 'all') return <Repeat className="h-4 w-4" />;
    return <Repeat className="h-4 w-4" />;
  };

  const toggleRepeat = () => {
    const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const progressPercentage = track.duration ? (currentTime / track.duration) * 100 : 0;

  return (
    <div className="bg-card/95 backdrop-blur-md border-t border-white/10 p-4">
      <audio ref={audioRef} />
      
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Track Info */}
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <div className="min-w-0">
            <h4 className="font-medium truncate text-white">{track.title}</h4>
            <p className="text-sm text-muted-foreground truncate">
              {track.originalFileName}
            </p>
          </div>
        </div>

        {/* Player Controls */}
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

          {/* Progress Bar */}
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

        {/* Volume Controls */}
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