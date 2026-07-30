import { ArrowLeft, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Track, Playlist } from "@/pages/Index";
import { PlaylistSortableTrackItem } from "@/components/PlaylistSortableTrackItem";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface ManagePlaylistDialogProps {
  playlist: Playlist;
  tracks: Track[];
  likedTracks: Set<string>;
  onToggleLike: (trackId: string) => void;
  onPlayTrack: (track: Track) => void;
  onUpdateTrackRepeat: (trackId: string, repeatCount: number) => void;
  onRemoveFromPlaylist: (index: number) => void;
  onReorderTracks: (trackIds: string[]) => void;
  onBack: () => void;
}

export const ManagePlaylistDialog = ({
  playlist,
  tracks,
  likedTracks,
  onToggleLike,
  onPlayTrack,
  onUpdateTrackRepeat,
  onRemoveFromPlaylist,
  onReorderTracks,
  onBack,
}: ManagePlaylistDialogProps) => {
  const playlistTracks = playlist.tracks
    .map((id) => tracks.find((t) => t.id === id))
    .filter(Boolean) as Track[];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = playlist.tracks.map((id, i) => `${id}__${i}`);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    onReorderTracks(arrayMove(playlist.tracks, oldIndex, newIndex));
  };

  const totalDuration = playlistTracks.reduce((sum, t) => sum + t.duration, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)",
      }}
    >
      <div className="px-3 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <ListMusic className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{playlist.name}</h1>
            <p className="text-xs text-muted-foreground">
              {playlistTracks.length} songs • {formatTime(totalDuration)} • Hold and drag to reorder
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pt-2">
        {playlistTracks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={playlist.tracks.map((id, i) => `${id}__${i}`)}
              strategy={verticalListSortingStrategy}
            >
              {playlistTracks.map((track, index) => (
                <PlaylistSortableTrackItem
                  key={`${track.id}__${index}`}
                  sortableId={`${track.id}__${index}`}
                  manageMode
                  track={track}
                  index={index}
                  isLiked={likedTracks.has(track.id)}
                  repeatCount={playlist.repeatCounts?.[track.id] || 1}
                  onPlayTrack={onPlayTrack}
                  onToggleLike={onToggleLike}
                  onUpdateTrackRepeat={onUpdateTrackRepeat}
                  onRemoveFromPlaylist={() => onRemoveFromPlaylist(index)}
                  formatTime={formatTime}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Empty — add songs from your library</p>
          </div>
        )}
      </div>
    </div>
  );
};
