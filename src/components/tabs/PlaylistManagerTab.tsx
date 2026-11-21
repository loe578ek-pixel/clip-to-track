import { useState } from "react";
import { Edit3, Trash2, Play, ChevronRight, ListMusic } from "lucide-react";
import { Track, Playlist } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HeartButton } from "@/components/HeartButton";
import { PlaylistSortableTrackItem } from "@/components/PlaylistSortableTrackItem";
import { ManagePlaylistDialog } from "@/components/ManagePlaylistDialog";
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
  const [managingPlaylistId, setManagingPlaylistId] = useState<string | null>(null);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());

  const managingPlaylist = playlists.find(p => p.id === managingPlaylistId) || null;

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
        delay: 220,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for playlist tracks (uses positional ids: "trackId__index")
  const handleDragEnd = (event: DragEndEvent, playlistId: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist) return;

      const ids = playlist.tracks.map((id, i) => `${id}__${i}`);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      const newTrackIds = arrayMove(playlist.tracks, oldIndex, newIndex);
      onReorderPlaylistTracks(playlistId, newTrackIds);
    }
  };

  return (
    <div className="playlists-tab flex flex-col absolute inset-0 overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
      {/* Header */}
      <div className="px-4 pb-3 pt-1 shrink-0">
        <h1 className="text-2xl font-bold">Playlists</h1>
      </div>

      {/* Playlists - flex to fill remaining space equally */}
      <div className="flex-1 flex flex-col gap-2.5 px-3 min-h-0 overflow-y-auto no-scrollbar pb-4">
        {playlists.map((playlist) => {
          const playlistTracks = playlist.tracks.map(getTrackById).filter(Boolean) as Track[];
          const totalDuration = playlistTracks.reduce((sum, track) => sum + track.duration, 0);

          return (
            <div
              key={playlist.id}
              role="button"
              tabIndex={0}
              onClick={() => editingPlaylist !== playlist.id && setManagingPlaylistId(playlist.id)}
              onKeyDown={(e) => e.key === 'Enter' && editingPlaylist !== playlist.id && setManagingPlaylistId(playlist.id)}
              className="shrink-0 flex items-center gap-3 px-3 py-3 rounded-2xl border border-white/[0.06] bg-card/60 transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <ListMusic className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1" onClick={(e) => editingPlaylist === playlist.id && e.stopPropagation()}>
                {editingPlaylist === playlist.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenamePlaylist(playlist.id)}
                    onBlur={() => handleRenamePlaylist(playlist.id)}
                    className="bg-secondary border-white/10 text-sm font-semibold h-8"
                    autoFocus
                  />
                ) : (
                  <>
                    <h2 className="text-[15px] font-semibold truncate leading-tight">{playlist.name}</h2>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      {playlist.tracks.length} songs • {formatTime(totalDuration)}
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground" aria-label="Rename"
                  onClick={() => { setEditingPlaylist(playlist.id); setEditName(playlist.name); }}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Clear playlist" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive" disabled={playlist.tracks.length === 0}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-white/10">
                    <DialogHeader><DialogTitle>Clear All Tracks</DialogTitle></DialogHeader>
                    <p className="text-muted-foreground">Are you sure you want to clear all tracks from "{playlist.name}"?</p>
                    <div className="flex justify-end space-x-2 mt-4">
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <DialogClose asChild><Button variant="destructive" onClick={() => onClearPlaylistTracks(playlist.id)}>Clear Tracks</Button></DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button size="icon" aria-label="Play" onClick={() => onPlayPlaylist(playlist.id)} disabled={playlist.tracks.length === 0}
                  className="h-10 w-10 rounded-full bg-primary hover:bg-primary/80 text-primary-foreground">
                  <Play className="h-4 w-4 fill-current" />
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </div>
            </div>
          );
        })}
      </div>

      {managingPlaylist && (
        <ManagePlaylistDialog
          playlist={managingPlaylist}
          tracks={tracks}
          likedTracks={likedTracks}
          onToggleLike={onToggleLike}
          onPlayTrack={onPlayTrack}
          onUpdateTrackRepeat={(trackId, count) => onUpdatePlaylistTrackRepeat(managingPlaylist.id, trackId, count)}
          onRemoveFromPlaylist={(index) => onRemoveFromPlaylist(managingPlaylist.id, index)}
          onReorderTracks={(trackIds) => onReorderPlaylistTracks(managingPlaylist.id, trackIds)}
          onBack={() => setManagingPlaylistId(null)}
        />
      )}
    </div>
  );
};