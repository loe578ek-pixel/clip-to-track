import { useState } from "react";
import { Upload, Plus, Clock, Calendar, Trash2 } from "lucide-react";
import { EditableTitle } from "@/components/EditableTitle";
import { Track, Playlist } from "@/pages/Index";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { HeartButton } from "@/components/HeartButton";

interface AddTabProps {
  tracks: Track[];
  playlists: Playlist[];
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  onTrackExtracted: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  likedTracks: Set<string>;
  onToggleLike: (trackId: string) => void;
  onRenameTrack: (trackId: string, newTitle: string) => void;
}

export const AddTab = ({ 
  tracks, 
  playlists, 
  isProcessing, 
  setIsProcessing, 
  onTrackExtracted, 
  onAddToPlaylist,
  likedTracks,
  onToggleLike,
  onRenameTrack
}: AddTabProps) => {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="flex-1 overflow-auto p-4 space-y-6" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 pb-4">
        <h1 className="text-3xl font-bold mb-2">Add Music</h1>
        <p className="text-muted-foreground">Upload video files to extract audio</p>
      </div>

      {/* Upload Section */}
      <div className="soundwave-card p-6">
        <FileUpload
          onTrackExtracted={onTrackExtracted}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
        />
      </div>

      {/* History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">History</h2>
          <span className="text-sm text-muted-foreground">
            {tracks.length} songs added
          </span>
        </div>

        {tracks.length > 0 ? (
          <div className="space-y-3">
            {tracks.map((track, index) => (
              <div key={track.id} className="soundwave-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Thumbnail */}
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <EditableTitle
                        title={track.title}
                        onSave={(newTitle) => onRenameTrack(track.id, newTitle)}
                        className="font-medium truncate text-base"
                        inputClassName="h-8"
                      />
                      <p className="text-sm text-muted-foreground truncate">
                        {track.originalFileName}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(track.duration)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(track.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end sm:justify-start gap-2">
                    <HeartButton
                      isLiked={likedTracks.has(track.id)}
                      onToggle={() => onToggleLike(track.id)}
                      size="sm"
                    />
                    {playlists.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" className="soundwave-button-secondary w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            <span className="truncate">Add to Playlist</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-white/10 z-50">
                          {playlists.map((playlist) => (
                            <DropdownMenuItem
                              key={playlist.id}
                              onClick={() => onAddToPlaylist(playlist.id, track.id)}
                              disabled={playlist.tracks.includes(track.id)}
                              className="focus:bg-primary/20"
                            >
                              {playlist.name}
                              {playlist.tracks.includes(track.id) && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ✓ Added
                                </span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 soundwave-card">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">No songs added yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload your first video file to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};