import { GripVertical, Play, RotateCcw } from "lucide-react";
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
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group track-item ${isDragging ? 'opacity-50 shadow-lg scale-105' : ''}`}
    >
      {/* Drag Handle */}
      <div 
        {...attributes}
        {...listeners}
        className="w-6 flex justify-center items-center flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Track Number / Play Button */}
      <div className="w-8 flex justify-center items-center flex-shrink-0">
        <span className="text-muted-foreground text-sm group-hover:hidden">
          {index + 1}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPlayTrack(track)}
          className="hidden group-hover:flex w-6 h-6 hover:bg-primary/20"
        >
          <Play className="h-3 w-3" />
        </Button>
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0 mr-2">
        <h4 className="font-medium text-sm truncate leading-tight">{track.title}</h4>
        <p className="text-xs text-muted-foreground truncate">
          {formatTime(track.duration)}
        </p>
      </div>

      {/* Repeat Count */}
      <div className="flex items-center gap-1 mr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onUpdateTrackRepeat(track.id, Math.max(1, repeatCount - 1))}
          className="w-5 h-5 text-xs text-muted-foreground hover:text-foreground"
          disabled={repeatCount <= 1}
        >
          -
        </Button>
        <div className="flex items-center gap-1 min-w-[40px] justify-center">
          <RotateCcw className="h-2 w-2 text-muted-foreground" />
          <span className="text-xs font-medium">{repeatCount}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onUpdateTrackRepeat(track.id, repeatCount + 1)}
          className="w-5 h-5 text-xs text-muted-foreground hover:text-foreground"
        >
          +
        </Button>
      </div>

      {/* Heart Button */}
      <HeartButton
        isLiked={isLiked}
        onToggle={() => onToggleLike(track.id)}
        size="sm"
        className="mr-2"
      />

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemoveFromPlaylist}
        className="w-6 h-6 text-xs text-destructive hover:bg-destructive/20"
      >
        ×
      </Button>
    </div>
  );
};