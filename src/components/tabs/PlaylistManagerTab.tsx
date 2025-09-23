import { useState } from "react";
import { Edit3, Plus, Trash2, GripVertical, RotateCcw, Play, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Track, Playlist } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HeartButton } from "@/components/HeartButton";

interface PlaylistManagerTabProps {
  tracks: Track[];
  playlists: Playlist[];
  trackRepeatCounts: Record<string, number>;
  onCreatePlaylist: (name: string) => void;
  onRenamePlaylist: (playlistId: string, newName: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  onUpdateTrackRepeat: (trackId: string, repeatCount: number) => void;
  onPlayPlaylist: (playlistId: string) => void;
  onPlayTrack: (track: Track) => void;
  likedTracks: Set<string>;
  onToggleLike: (trackId: string) => void; // Add this missing property
  onReorderPlaylistTracks: (playlistId: string, trackIds: string[]) => void;
}

export const PlaylistManagerTab = ({
  tracks,
  playlists,
  trackRepeatCounts,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onUpdateTrackRepeat,
  onPlayPlaylist,
  onPlayTrack,
  likedTracks,
  onToggleLike,
  onReorderPlaylistTracks
}: PlaylistManagerTabProps) => {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
      setIsCreateDialogOpen(false);
    }
  };

  const handleRenamePlaylist = (playlistId: string) => {
    if (editName.trim()) {
      onRenamePlaylist(playlistId, editName.trim());
      setEditingPlaylist(null);
      setEditName("");
    }
  };

  const getTrackById = (trackId: string) => tracks.find(t => t.id === trackId);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlaylistExpansion = (playlistId: string) => {
    setExpandedPlaylists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  };

  return (
    <div className="flex-1 overflow-auto pb-20 p-4 space-y-6">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Playlist Manager</h1>
          <p className="text-muted-foreground">Manage your playlists and song repeats</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="soundwave-button-primary">
              <Plus className="h-4 w-4 mr-2" />
              New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10">
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="playlist-name">Playlist Name</Label>
                <Input
                  id="playlist-name"
                  placeholder="My Awesome Playlist"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                  className="bg-secondary border-white/10"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="soundwave-button-primary"
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Playlists */}
      {playlists.length > 0 ? (
        <div className="space-y-6">
          {playlists.map((playlist) => {
            const playlistTracks = playlist.tracks.map(getTrackById).filter(Boolean) as Track[];
            const totalDuration = playlistTracks.reduce((sum, track) => sum + track.duration, 0);

            return (
              <div key={playlist.id} className="soundwave-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {editingPlaylist === playlist.id ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRenamePlaylist(playlist.id)}
                          onBlur={() => handleRenamePlaylist(playlist.id)}
                          className="bg-secondary border-white/10 text-lg font-semibold"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-xl font-semibold">{playlist.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {playlist.tracks.length} songs • {formatTime(totalDuration)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => onPlayPlaylist(playlist.id)}
                      className="soundwave-button-primary"
                      disabled={playlist.tracks.length === 0}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Play
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingPlaylist(playlist.id);
                        setEditName(playlist.name);
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-white/10">
                        <DialogHeader>
                          <DialogTitle>Delete Playlist</DialogTitle>
                        </DialogHeader>
                        <p className="text-muted-foreground">
                          Are you sure you want to delete "{playlist.name}"? This will permanently remove the playlist and cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button variant="outline">Cancel</Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => onDeletePlaylist(playlist.id)}
                          >
                            Delete Playlist
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Playlist Tracks */}
                {playlistTracks.length > 0 ? (
                  <div className="space-y-2">
                    {/* Display tracks based on expansion state */}
                    {(() => {
                      const isExpanded = expandedPlaylists.has(playlist.id);
                      const tracksToShow = isExpanded ? playlistTracks : playlistTracks.slice(0, 2);
                      
                      return tracksToShow.map((track, index) => (
                        <div key={`${playlist.id}-${track.id}`} className="flex items-center space-x-4 p-3 rounded-lg bg-secondary/30">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          
                          <span className="w-8 text-sm text-muted-foreground text-center">
                            {index + 1}
                          </span>

                          <img
                            src={track.thumbnailUrl}
                            alt={track.title}
                            className="w-10 h-10 rounded object-cover"
                          />

                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{track.title}</h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {formatTime(track.duration)}
                            </p>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">
                              <RotateCcw className="h-4 w-4 text-primary" />
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={trackRepeatCounts[track.id] || 1}
                                onChange={(e) => onUpdateTrackRepeat(track.id, parseInt(e.target.value) || 1)}
                                className="w-14 h-7 text-sm bg-card border border-primary/30 rounded-md px-2 text-center font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                              <span className="text-sm font-medium text-primary">×</span>
                            </div>
                            <HeartButton
                              isLiked={likedTracks.has(track.id)}
                              onToggle={() => onToggleLike(track.id)}
                              size="sm"
                            />
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-card border-white/10">
                                <DialogHeader>
                                  <DialogTitle>Remove Track</DialogTitle>
                                </DialogHeader>
                                <p className="text-muted-foreground">
                                  Are you sure you want to remove "{track.title}" from this playlist?
                                </p>
                                <div className="flex justify-end space-x-2 mt-4">
                                  <Button variant="outline">Cancel</Button>
                                  <Button 
                                    variant="destructive" 
                                    onClick={() => onRemoveFromPlaylist(playlist.id, track.id)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ));
                    })()}
                    
                    {/* Expand/Collapse Button */}
                    {playlistTracks.length > 2 && (
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="ghost"
                          onClick={() => togglePlaylistExpansion(playlist.id)}
                          className="flex items-center space-x-2 text-primary hover:text-primary/80 hover:bg-primary/10 transition-all rounded-full px-4 py-2 text-sm font-medium"
                        >
                          {expandedPlaylists.has(playlist.id) ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              <span>Less</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              <span>More ({playlistTracks.length - 2} more songs)</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">This playlist is empty</p>
                    <p className="text-xs">Add songs from your library</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 soundwave-card">
          <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No playlists yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first playlist to organize your music
          </p>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="soundwave-button-primary"
          >
            Create Playlist
          </Button>
        </div>
      )}
    </div>
  );
};