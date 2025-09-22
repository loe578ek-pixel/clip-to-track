import { Heart, Play, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Track } from "@/pages/Index";

interface LikedMusicSectionProps {
  tracks: Track[];
  likedTracks: Set<string>;
  onPlayLikedMusic: () => void;
  onManageLikedMusic: () => void;
}

export const LikedMusicSection = ({
  tracks,
  likedTracks,
  onPlayLikedMusic,
  onManageLikedMusic
}: LikedMusicSectionProps) => {
  const likedTracksList = tracks.filter(track => likedTracks.has(track.id));

  if (likedTracksList.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Liked Music</h2>
      <div className="playlist-item">
        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Heart className="h-6 w-6 text-white fill-white" />
        </div>
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-medium truncate text-base">Liked Songs</h3>
          <p className="text-sm text-muted-foreground">
            {likedTracksList.length} song{likedTracksList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onManageLikedMusic}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4 mr-1" />
            Manage
          </Button>
          <Button
            onClick={onPlayLikedMusic}
            size="icon"
            className="soundwave-button-primary w-12 h-12 rounded-full flex-shrink-0"
          >
            <Play className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};