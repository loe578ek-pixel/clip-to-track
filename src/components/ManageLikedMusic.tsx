import { useState } from "react";
import { Heart, Play, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartButton } from "@/components/HeartButton";
import { Track, Playlist } from "@/pages/Index";

interface ManageLikedMusicProps {
  tracks: Track[];
  likedTracks: Set<string>;
  trackRepeatCounts: Record<string, number>;
  onToggleLike: (trackId: string) => void;
  onPlayTrack: (track: Track) => void;
  onUpdateTrackRepeat: (trackId: string, repeatCount: number) => void;
  onBack: () => void;
}

export const ManageLikedMusic = ({
  tracks,
  likedTracks,
  trackRepeatCounts,
  onToggleLike,
  onPlayTrack,
  onUpdateTrackRepeat,
  onBack
}: ManageLikedMusicProps) => {
  const likedTracksList = tracks.filter(track => likedTracks.has(track.id));

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (likedTracksList.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-4 space-y-6" style={{ paddingBottom: '6rem' }}>
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 text-white fill-white" />
              </div>
              <h1 className="text-3xl font-bold">Liked Music</h1>
            </div>
          </div>
        </div>

        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center mb-6 shadow-glow">
            <Heart className="h-12 w-12 text-white fill-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No liked songs yet</h3>
          <p className="text-muted-foreground mb-6">
            Start liking songs by tapping the heart icon next to tracks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-6" style={{ paddingBottom: '6rem' }}>
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg flex items-center justify-center">
              <Heart className="h-5 w-5 text-white fill-white" />
            </div>
            <h1 className="text-3xl font-bold">Liked Music</h1>
          </div>
        </div>
        <p className="text-muted-foreground">{likedTracksList.length} liked songs</p>
      </div>

      <div className="space-y-2">
        {likedTracksList.map((track, index) => (
          <div
            key={track.id}
            className="group track-item"
          >
            {/* Track Number / Play Button */}
            <div className="w-10 flex justify-center items-center flex-shrink-0">
              <span className="text-muted-foreground text-sm group-hover:hidden">
                {index + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPlayTrack(track)}
                className="hidden group-hover:flex w-8 h-8 hover:bg-primary/20"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>

            {/* Thumbnail */}
            <img
              src={track.thumbnailUrl}
              alt={track.title}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />

            {/* Track Info */}
            <div className="flex-1 min-w-0 mr-2">
              <h4 className="font-medium truncate text-base leading-tight">{track.title}</h4>
              <p className="text-sm text-muted-foreground truncate">
                {track.originalFileName}
              </p>
            </div>

            {/* Duration */}
            <div className="hidden sm:flex items-center text-sm text-muted-foreground mr-4">
              <span>{formatTime(track.duration)}</span>
            </div>

            {/* Repeat Count Controls */}
            <div className="flex items-center gap-2 mr-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onUpdateTrackRepeat(track.id, Math.max(1, (trackRepeatCounts[track.id] || 1) - 1))}
                className="w-6 h-6 text-muted-foreground hover:text-foreground"
                disabled={(trackRepeatCounts[track.id] || 1) <= 1}
              >
                -
              </Button>
              <div className="flex items-center gap-1 min-w-[60px] justify-center">
                <RotateCcw className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-medium">{trackRepeatCounts[track.id] || 1}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onUpdateTrackRepeat(track.id, (trackRepeatCounts[track.id] || 1) + 1)}
                className="w-6 h-6 text-muted-foreground hover:text-foreground"
              >
                +
              </Button>
            </div>

            {/* Heart Button */}
            <HeartButton
              isLiked={likedTracks.has(track.id)}
              onToggle={() => onToggleLike(track.id)}
              size="md"
              className="opacity-100"
            />
          </div>
        ))}
      </div>
    </div>
  );
};