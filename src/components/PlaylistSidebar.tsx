import { Music, List, PlayCircle } from "lucide-react";
import { Playlist } from "@/pages/Index";

interface PlaylistSidebarProps {
  playlists: Playlist[];
  currentPlaylist: string | null;
  onSelectPlaylist: (playlistId: string | null) => void;
}

export const PlaylistSidebar = ({
  playlists,
  currentPlaylist,
  onSelectPlaylist
}: PlaylistSidebarProps) => {

  return (
    <div className="w-64 bg-card border-r border-glass flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-glass">
        <div className="flex items-center space-x-2">
          <Music className="h-6 w-6 text-primary" />
          <h2 className="font-semibold text-lg">Library</h2>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-2">
        {/* All Tracks */}
        <button
          onClick={() => onSelectPlaylist(null)}
          className={`
            w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all
            ${currentPlaylist === null 
              ? 'bg-primary/20 text-primary border border-primary/30' 
              : 'hover:bg-secondary/50'
            }
          `}
        >
          <List className="h-5 w-5" />
          <span className="font-medium">All Tracks</span>
        </button>

        {/* Playlists */}
        <div className="space-y-1">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => onSelectPlaylist(playlist.id)}
              className={`
                w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all
                ${currentPlaylist === playlist.id 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'hover:bg-secondary/50'
                }
              `}
            >
              <PlayCircle className="h-5 w-5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{playlist.name}</div>
                <div className="text-xs text-muted-foreground">
                  {playlist.tracks.length} tracks
                </div>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};