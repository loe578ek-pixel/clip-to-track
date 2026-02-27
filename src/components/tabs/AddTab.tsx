import { useState } from "react";
import { Upload, Plus, Clock, Calendar, Trash2, Edit3 } from "lucide-react";
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
    <div className="flex-1 overflow-auto p-4 space-y-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: '6rem' }}>
      {/* Header */}
      <div className="sticky bg-background/80 backdrop-blur-md z-10 pb-4" style={{ top: 'calc(env(safe-area-inset-top) + 4px)' }}>
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
                <div className="flex items-center gap-3">
                  {/* Track Info */}
                  <div className="flex-1 min-w-0 mr-4 overflow-hidden">
                    <EditableTitle
                      title={track.title}
                      onSave={(newTitle) => onRenameTrack(track.id, newTitle)}
                      className="font-medium truncate text-base block"
                      inputClassName="h-8"
                      showButton={false}
                    />
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

                  {/* Actions - All buttons inline */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Pencil Button */}
                    <Button variant="ghost" size="icon" onClick={() => {
                      const newTitle = prompt("Enter new title:", track.title);
                      if (newTitle && newTitle.trim() && newTitle.trim() !== track.title) {
                        onRenameTrack(track.id, newTitle.trim());
                      }
                    }} className="w-8 h-8 hover:bg-accent/50">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    
                    {/* Heart Button */}
                    <HeartButton
                      isLiked={likedTracks.has(track.id)}
                      onToggle={() => onToggleLike(track.id)}
                      size="sm"
                    />
                    
                    {/* Add to Playlist */}
                    {playlists.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8">
                            <Plus className="h-4 w-4" />
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