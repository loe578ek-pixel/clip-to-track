import { useState } from "react";
import { Play, MoreHorizontal, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Track, Playlist } from "@/pages/Index";

interface TrackListProps {
  tracks: Track[];
  currentTrack: Track | null;
  playlists: Playlist[];
  onPlayTrack: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
}

export const TrackList = ({
  tracks,
  currentTrack,
  playlists,
  onPlayTrack,
  onAddToPlaylist,
  onDeleteTrack
}: TrackListProps) => {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  if (tracks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mb-6 shadow-glow">
          <Play className="h-12 w-12 text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No tracks yet</h3>
        <p className="text-muted-foreground">
          Upload a video file to extract audio and start building your collection
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tracks</h2>
        <span className="text-muted-foreground">{tracks.length} tracks</span>
      </div>

      <div className="space-y-2">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className={`
              group flex items-center space-x-4 p-4 rounded-xl transition-all hover:bg-secondary/30
              ${currentTrack?.id === track.id ? 'bg-primary/10 border border-primary/20' : ''}
            `}
          >
            {/* Index/Play Button */}
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
              className="w-12 h-12 rounded-lg object-cover shadow-card"
            />

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{track.title}</h4>
              <p className="text-sm text-muted-foreground truncate">
                {track.originalFileName}
              </p>
            </div>

            {/* Duration */}
            <div className="text-sm text-muted-foreground">
              {formatTime(track.duration)}
            </div>

            {/* Date Added */}
            <div className="text-sm text-muted-foreground hidden md:block">
              {formatDate(track.createdAt)}
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-glass">
                <DropdownMenuItem onClick={() => onPlayTrack(track)}>
                  <Play className="mr-2 h-4 w-4" />
                  Play
                </DropdownMenuItem>
                
                {playlists.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Plus className="mr-2 h-4 w-4" />
                      Add to Playlist
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="bg-card border-glass">
                      {playlists.map((playlist) => (
                        <DropdownMenuItem
                          key={playlist.id}
                          onClick={() => onAddToPlaylist(playlist.id, track.id)}
                          disabled={playlist.tracks.includes(track.id)}
                        >
                          {playlist.name}
                          {playlist.tracks.includes(track.id) && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Added)
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                
                <DropdownMenuSeparator />
                <Dialog>
                  <DialogTrigger asChild>
                    <DropdownMenuItem 
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-white/10">
                    <DialogHeader>
                      <DialogTitle>Delete Track</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">
                      Are you sure you want to delete "{track.title}"? This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline">Cancel</Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => onDeleteTrack(track.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
};