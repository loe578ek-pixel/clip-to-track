import { Play, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartButton } from "@/components/HeartButton";
import { Track } from "@/pages/Index";
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PlaylistSortableTrackItemProps {
  track: Track;
  index: number;
  sortableId?: string;
  isLiked: boolean;
  repeatCount: number;
  onPlayTrack: (track: Track) => void;
  onToggleLike: (trackId: string) => void;
  onUpdateTrackRepeat: (trackId: string, repeatCount: number) => void;
  onRemoveFromPlaylist: () => void;
  formatTime: (time: number) => string;
}

export const PlaylistSortableTrackItem = ({
  track,
  index,
  sortableId,
  isLiked,
  repeatCount,
  onPlayTrack,
  onToggleLike,
  onUpdateTrackRepeat,
  onRemoveFromPlaylist,
  formatTime,
}: PlaylistSortableTrackItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId ?? track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative flex items-center gap-2 px-2 py-2 my-0.5 rounded-xl cursor-grab active:cursor-grabbing touch-none transition-all
        hover:bg-white/[0.04]
        ${isDragging ? 'opacity-60 shadow-2xl bg-white/[0.06] scale-[1.01]' : ''}
      `}
    >
      {/* Index */}
      <div className="w-5 flex justify-center flex-shrink-0">
        <span className="text-muted-foreground/70 text-[11px] font-semibold tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Play */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => { e.stopPropagation(); onPlayTrack(track); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-7 h-7 flex-shrink-0 rounded-full bg-primary/15 hover:bg-primary/30 text-primary p-0"
      >
        <Play className="h-3 w-3 fill-current" />
      </Button>

      {/* Title + duration */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-[12px] truncate leading-snug">{track.title}</h4>
        <p className="text-[10px] text-muted-foreground/70 leading-tight tabular-nums">
          {formatTime(track.duration)}
        </p>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Repeat pill */}
        <div
          className="flex items-center rounded-full bg-white/[0.06] border border-white/[0.08] h-8"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onUpdateTrackRepeat(track.id, Math.max(1, repeatCount - 1)); }}
            className="w-7 h-8 text-base text-muted-foreground hover:text-foreground hover:bg-white/[0.06] rounded-l-full"
            disabled={repeatCount <= 1}
          >
            −
          </Button>
          <span className="text-[12px] font-semibold text-foreground/90 w-8 text-center tabular-nums">
            ×{repeatCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onUpdateTrackRepeat(track.id, repeatCount + 1); }}
            className="w-7 h-8 text-base text-muted-foreground hover:text-foreground hover:bg-white/[0.06] rounded-r-full"
          >
            +
          </Button>
        </div>

        <div onPointerDown={(e) => e.stopPropagation()}>
          <HeartButton
            isLiked={isLiked}
            onToggle={() => onToggleLike(track.id)}
            size="sm"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onRemoveFromPlaylist(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-7 h-7 -translate-y-[2px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};