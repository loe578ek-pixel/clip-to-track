import { useState } from "react";
import { Edit3, Plus, Trash2, GripVertical, RotateCcw, Play, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Track, Playlist } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HeartButton } from "@/components/HeartButton";
import { PlaylistSortableTrackItem } from "@/components/PlaylistSortableTrackItem";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface PlaylistManagerTabProps {
  tracks: Track[];
  playlists: Playlist[];
  onRenamePlaylist: (playlistId: string, newName: string) => void;
  onClearPlaylistTracks: (playlistId: string) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  onUpdatePlaylistTrackRepeat: (playlistId: string, trackId: string, repeatCount: number) => void;
  onPlayPlaylist: (playlistId: string) => void;
  onPlayTrack: (track: Track) => void;
  likedTracks: Set<string>;
  onToggleLike: (trackId: string) => void;
  onReorderPlaylistTracks: (playlistId: string, trackIds: string[]) => void;
}

export const PlaylistManagerTab = ({
  tracks,
  playlists,
  onRenamePlaylist,
  onClearPlaylistTracks,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onUpdatePlaylistTrackRepeat,
  onPlayPlaylist,
  onPlayTrack,
  likedTracks,
  onToggleLike,
  onReorderPlaylistTracks
}: PlaylistManagerTabProps) => {
  const [editingPlaylist, setEditingPlaylist] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());

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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for playlist tracks
  const handleDragEnd = (event: DragEndEvent, playlistId: string) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist) return;

      const trackIds = playlist.tracks;
      const oldIndex = trackIds.findIndex((id: string) => id === active.id);
      const newIndex = trackIds.findIndex((id: string) => id === over?.id);

      const newTrackIds = arrayMove(trackIds, oldIndex, newIndex);
      onReorderPlaylistTracks(playlistId, newTrackIds);
    }
  };

  return (
    <div className="flex-1 overflow-auto space-y-6" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: '6rem' }}>
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 pb-4 pl-4">
        <h1 className="text-3xl font-bold mb-2">Playlist Manager</h1>
        <p className="text-muted-foreground">Rename playlists and manage song repeats</p>
      </div>

      {/* Playlists */}
      <div className="space-y-6">
        {playlists.map((playlist) => {
          const playlistTracks = playlist.tracks.map(getTrackById).filter(Boolean) as Track[];
          const totalDuration = playlistTracks.reduce((sum, track) => sum + track.duration, 0);

          return (
            <div key={playlist.id} className="soundwave-card py-6 pl-0 pr-2">
              <div className="flex items-center justify-between mb-4 pl-4">
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
                        disabled={playlist.tracks.length === 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-white/10">
                      <DialogHeader>
                        <DialogTitle>Clear All Tracks</DialogTitle>
                      </DialogHeader>
                      <p className="text-muted-foreground">
                        Are you sure you want to clear all tracks from "{playlist.name}"? The playlist will be kept but all tracks will be removed.
                      </p>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline">Cancel</Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => onClearPlaylistTracks(playlist.id)}
                        >
                          Clear Tracks
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Playlist Tracks */}
              {playlistTracks.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleDragEnd(event, playlist.id)}
                >
                  <div className="space-y-2">
                    {/* Display tracks based on expansion state */}
                    {(() => {
                      const isExpanded = expandedPlaylists.has(playlist.id);
                      const tracksToShow = isExpanded ? playlistTracks : playlistTracks.slice(0, 2);
                      const trackIdsToShow = tracksToShow.map(track => track.id);
                      
                      return (
                        <SortableContext items={trackIdsToShow} strategy={verticalListSortingStrategy}>
                          {tracksToShow.map((track, index) => (
                            <PlaylistSortableTrackItem
                              key={track.id}
                              track={track}
                              index={index}
                              isLiked={likedTracks.has(track.id)}
                              repeatCount={playlist.repeatCounts?.[track.id] || 1}
                              onPlayTrack={onPlayTrack}
                              onToggleLike={onToggleLike}
                              onUpdateTrackRepeat={(trackId, count) => onUpdatePlaylistTrackRepeat(playlist.id, trackId, count)}
                              onRemoveFromPlaylist={() => onRemoveFromPlaylist(playlist.id, track.id)}
                              formatTime={formatTime}
                            />
                          ))}
                        </SortableContext>
                      );
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
                </DndContext>
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
    </div>
  );
};