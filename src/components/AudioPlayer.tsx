import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { VolumeRange } from "@/components/ui/volume-range";
import { Track } from "@/pages/Index";
import { useAudioElementGain } from "@/hooks/useAudioElementGain";

interface AudioPlayerProps {
  track: Track;
  onNext: () => void;
  onPrevious: () => void;
}

export const AudioPlayer = ({ track, onNext, onPrevious }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      onNext();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onNext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = track.audioUrl;
    audio.load();
    setCurrentTime(0);
    setIsPlaying(false);
  }, [track]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = (value[0] / 100) * track.duration;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleTouchVolumeChange = (nextValue: number) => {
    const audio = audioRef.current;
    const newVolume = nextValue / 100;

    setVolume(newVolume);
    if (audio) audio.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = track.duration > 0 ? (currentTime / track.duration) * 100 : 0;

  return (
    <>
      <audio ref={audioRef} />
      <div className="flex items-center justify-between p-4 space-x-4">
        {/* Track Info */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="min-w-0">
            <h4 className="font-medium truncate">{track.title}</h4>
            <p className="text-sm text-muted-foreground truncate">
              {track.originalFileName}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="hover:bg-primary/10"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-gradient-primary border-0 hover:scale-105 transition-transform shadow-glow"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="h-6 w-6 text-white ml-1" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="hover:bg-primary/10"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress */}
        <div className="flex items-center space-x-3 flex-1 max-w-md">
          <span className="text-xs text-muted-foreground min-w-[40px]">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground min-w-[40px]">
            {formatTime(track.duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="hover:bg-primary/10"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <VolumeRange
            value={isMuted ? 0 : volume * 100}
            onValueChange={handleTouchVolumeChange}
            max={100}
            step={1}
            className="w-20"
            ariaLabel="Player volume"
          />
        </div>
      </div>
    </>
  );
};