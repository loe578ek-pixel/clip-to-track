import { Play, MoreHorizontal, Clock, Calendar } from "lucide-react";
import { Track, Playlist } from "@/pages/Index";
import { Button } from "@/components/ui/button";

interface HomeTabProps {
  tracks: Track[];
  playlists: Playlist[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  onPlayPlaylist: (playlistId: string) => void;
}

export const HomeTab = ({ 
  tracks, 
  playlists, 
  currentTrack, 
  onPlayTrack, 
  onPlayPlaylist 
}: HomeTabProps) => {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const recentTracks = tracks.slice(0, 6);

  return (
    <div className="flex-1 overflow-auto pb-20 p-4 space-y-6">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 pb-4">
        <h1 className="text-3xl font-bold mb-2">Good evening</h1>
        <p className="text-muted-foreground">Welcome back to your music</p>
      </div>

      {/* Quick Access Playlists */}
      {playlists.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Playlists</h2>
          <div className="grid grid-cols-1 gap-3">
            {playlists.slice(0, 3).map((playlist) => (
              <div key={playlist.id} className="playlist-item">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{playlist.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {playlist.tracks.length} songs
                  </p>
                </div>
                <Button
                  onClick={() => onPlayPlaylist(playlist.id)}
                  size="icon"
                  className="soundwave-button-primary w-12 h-12 rounded-full"
                >
                  <Play className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Added */}
      {recentTracks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recently Added</h2>
          <div className="space-y-2">
            {recentTracks.map((track, index) => (
              <div
                key={track.id}
                className={`group track-item ${currentTrack?.id === track.id ? 'playing' : ''}`}
              >
                {/* Track Number / Play Button */}
                <div className="w-8 flex justify-center">
                  {currentTrack?.id === track.id ? (
                    <div className="w-4 h-4 bg-primary rounded-sm animate-pulse" />
                  ) : (
                    <span className="text-muted-foreground text-sm group-hover:hidden">
                      {index + 1}
                    </span>
                  )}
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
                  className="w-12 h-12 rounded-lg object-cover"
                />

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{track.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.originalFileName}
                  </p>
                </div>

                {/* Duration */}
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatTime(track.duration)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tracks.length === 0 && playlists.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mb-6 shadow-glow">
            <Play className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Start your music journey</h3>
          <p className="text-muted-foreground mb-6">
            Add your first song to get started
          </p>
          <Button className="soundwave-button-primary">
            Add Music
          </Button>
        </div>
      )}
    </div>
  );
};