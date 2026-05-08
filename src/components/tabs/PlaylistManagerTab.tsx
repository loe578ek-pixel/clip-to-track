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
  onRemoveFromPlaylist: (playlistId: string, trackIndex: number) => void;
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
    <div className="flex flex-col h-full overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: '6rem' }}>
      {/* Header */}
      <div className="px-4 pb-3 pt-1 shrink-0">
        <h1 className="text-2xl font-bold">Playlists</h1>
      </div>

      {/* Playlists - flex to fill remaining space equally */}
      <div className="flex-1 flex flex-col gap-2.5 px-3 min-h-0 overflow-hidden">
        {playlists.map((playlist) => {
          const playlistTracks = playlist.tracks.map(getTrackById).filter(Boolean) as Track[];
          const totalDuration = playlistTracks.reduce((sum, track) => sum + track.duration, 0);

          return (
            <div
              key={playlist.id}
              className="flex-1 min-h-0 flex flex-col rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm overflow-hidden transition-all"
            >
              {/* Playlist header */}
              <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {editingPlaylist === playlist.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRenamePlaylist(playlist.id)}
                      onBlur={() => handleRenamePlaylist(playlist.id)}
                      className="bg-secondary border-white/10 text-base font-semibold h-8"
                      autoFocus
                    />
                  ) : (
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold truncate">{playlist.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {playlist.tracks.length} songs • {formatTime(totalDuration)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    onClick={() => onPlayPlaylist(playlist.id)}
                    size="sm"
                    className="h-8 px-3 rounded-full bg-primary hover:bg-primary/80 text-primary-foreground text-xs font-medium"
                    disabled={playlist.tracks.length === 0}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Play
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingPlaylist(playlist.id);
                      setEditName(playlist.name);
                    }}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                        disabled={playlist.tracks.length === 0}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-white/10">
                      <DialogHeader>
                        <DialogTitle>Clear All Tracks</DialogTitle>
                      </DialogHeader>
                      <p className="text-muted-foreground">
                        Are you sure you want to clear all tracks from "{playlist.name}"?
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

              {/* Tracks list - scrollable within its card */}
              <div className="flex-1 min-h-0 overflow-y-auto px-1">
                {playlistTracks.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, playlist.id)}
                  >
                    <SortableContext items={playlist.tracks} strategy={verticalListSortingStrategy}>
                      {playlistTracks.map((track, index) => (
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
                  </DndContext>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-xs">Empty — add songs from your library</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};