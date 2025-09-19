import { useState } from "react";
import { ArrowLeft, Trash2, Music, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

export const MusicManagementDialog = ({ 
  isOpen, 
  onClose, 
  tracks, 
  onDeleteTrack 
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
            <DialogTitle className="text-lg font-semibold">Gérer les musiques</DialogTitle>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une musique..."
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

                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                        disabled={deletingTrackId === track.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette musique ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          Cette action supprimera définitivement "{track.title}" de votre appareil et de toutes les playlists.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setDeletingTrackId(track.id);
                            handleDeleteTrack(track.id);
                          }}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                {searchQuery ? (
                  <div>
                    <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Aucune musique trouvée pour "{searchQuery}"</p>
                  </div>
                ) : (
                  <div>
                    <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Aucune musique dans la bibliothèque</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Ajoutez des musiques depuis l'onglet "Ajouter"
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
              {filteredTracks.length} musique{filteredTracks.length !== 1 ? 's' : ''} 
              {searchQuery && ` trouvée${filteredTracks.length !== 1 ? 's' : ''}`}
              {!searchQuery && ` au total`}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};