import { useState } from "react";
import { ArrowLeft, Trash2, Music, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeartButton } from "@/components/HeartButton";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Track } from "@/pages/Index";
import { audioStorageService } from "@/lib/audioStorage";

interface MusicManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  onDeleteTrack: (trackId: string) => void;
  likedTracks: Set<string>;
  onToggleLike: (trackId: string) => void;
}

export const MusicManagementDialog = ({ 
  isOpen, 
  onClose, 
  tracks, 
  onDeleteTrack,
  likedTracks,
  onToggleLike
}: MusicManagementDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);

  // Filter tracks based on search query
  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.originalFileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (sizeBytes?: number) => {
    if (!sizeBytes) return "~ 3 MB";
    const sizeMB = sizeBytes / (1024 * 1024);
    return `${sizeMB.toFixed(1)} MB`;
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        // Delete audio file from storage
        await audioStorageService.deleteAudioTrack(track);
        
        // Call parent callback to update the tracks list
        onDeleteTrack(trackId);
        
        setDeletingTrackId(null);
      }
    } catch (error) {
      console.error('Error deleting track:', error);
      setDeletingTrackId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-white/10 max-w-md w-full h-[80vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-lg font-semibold">Manage Music</DialogTitle>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for music..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-white/10"
            />
          </div>
        </div>

        {/* Music Files List */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {filteredTracks.length > 0 ? (
              filteredTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  {/* Delete Button - Positioned on the left */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-10 w-10 p-0 bg-red-500 hover:bg-red-600 text-white border-0 shrink-0"
                        disabled={deletingTrackId === track.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-white/10 mx-4">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this song?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          This action will permanently delete "{track.title}" from your device and all playlists.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setDeletingTrackId(track.id);
                            handleDeleteTrack(track.id);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Thumbnail */}
                  <img
                    src={track.thumbnailUrl}
                    alt={track.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate text-sm">{track.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.originalFileName}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                      <span>{formatTime(track.duration)}</span>
                      <span>•</span>
                      <span>{formatFileSize()}</span>
                    </div>
                  </div>

                  {/* Heart Button - Now on the right */}
                  <HeartButton
                    isLiked={likedTracks.has(track.id)}
                    onToggle={() => onToggleLike(track.id)}
                    size="sm"
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                {searchQuery ? (
                  <div>
                    <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No music found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <div>
                    <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No music in library</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Add music from the "Add" tab
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with statistics */}
        {tracks.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-secondary/20">
            <p className="text-sm text-center text-muted-foreground">
              {filteredTracks.length} song{filteredTracks.length !== 1 ? 's' : ''} 
              {searchQuery && ` found`}
              {!searchQuery && ` total`}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};