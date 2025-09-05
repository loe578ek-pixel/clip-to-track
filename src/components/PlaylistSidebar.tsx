import { useState } from "react";
import { Plus, Music, List, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Playlist } from "@/pages/Index";

interface PlaylistSidebarProps {
  playlists: Playlist[];
  currentPlaylist: string | null;
  onSelectPlaylist: (playlistId: string | null) => void;
  onCreatePlaylist: (name: string) => void;
}

export const PlaylistSidebar = ({
  playlists,
  currentPlaylist,
  onSelectPlaylist,
  onCreatePlaylist
}: PlaylistSidebarProps) => {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="w-64 bg-card border-r border-glass flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-glass">
        <div className="flex items-center space-x-2 mb-4">
          <Music className="h-6 w-6 text-primary" />
          <h2 className="font-semibold text-lg">Library</h2>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-primary hover:scale-105 transition-transform shadow-glow border-0">
              <Plus className="mr-2 h-4 w-4" />
              New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-glass">
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                className="bg-secondary border-glass"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="bg-gradient-primary"
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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

        {playlists.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No playlists yet</p>
            <p className="text-xs">Create your first playlist above</p>
          </div>
        )}
      </div>
    </div>
  );
};