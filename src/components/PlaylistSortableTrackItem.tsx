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
      {...attributes}
      {...listeners}
      className={`group track-item cursor-grab active:cursor-grabbing touch-none flex items-center pl-2 pr-3 py-3 rounded-lg hover:bg-secondary/30 transition-colors ${isDragging ? 'opacity-50 shadow-lg scale-105' : ''}`}
    >
      {/* Tight Left Section: Number + Play + Title */}
      <div className="flex items-center flex-1 min-w-0 mr-4">
        {/* Song Number - Close to left edge */}
        <div className="w-3 flex justify-start items-center flex-shrink-0">
          <span className="text-muted-foreground text-sm font-medium">
            {index + 1}
          </span>
        </div>

        {/* Play Button - Minimal gap from number */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPlayTrack(track)}
          className="w-6 h-6 flex-shrink-0 hover:bg-primary/20 p-0 ml-1"
        >
          <Play className="h-3 w-3" />
        </Button>

        {/* Song Title - Maximum space available */}
        <div className="flex-1 min-w-0 ml-1">
          <h4 className="font-medium text-sm truncate leading-tight">{track.title}</h4>
          <p className="text-xs text-muted-foreground truncate">
            {formatTime(track.duration)}
          </p>
        </div>
      </div>

      {/* Right Side Buttons - Proper spacing */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Repeat Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onUpdateTrackRepeat(track.id, Math.max(1, repeatCount - 1))}
            className="w-6 h-6 text-xs text-muted-foreground hover:text-foreground"
            disabled={repeatCount <= 1}
          >
            -
          </Button>
          <div className="flex items-center justify-center min-w-[28px]">
            <span className="text-xs font-medium">{repeatCount}×</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onUpdateTrackRepeat(track.id, repeatCount + 1)}
            className="w-6 h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            +
          </Button>
        </div>

        {/* Like Button */}
        <HeartButton
          isLiked={isLiked}
          onToggle={() => onToggleLike(track.id)}
          size="sm"
        />

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemoveFromPlaylist}
          className="w-6 h-6 text-destructive hover:bg-destructive/20"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};