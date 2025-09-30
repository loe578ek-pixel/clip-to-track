import { Play, Plus, Trash2, Clock, Calendar, Edit3 } from "lucide-react";
import { EditableTitle } from "@/components/EditableTitle";
import { LikedMusicSection } from "@/components/LikedMusicSection";
import { HeartButton } from "@/components/HeartButton";
import { ManageLikedMusic } from "@/components/ManageLikedMusic";
import { Track, Playlist } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
interface HomeTabProps {
  tracks: Track[];
  playlists: Playlist[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  onPlayPlaylist: (playlistId: string) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  likedTracks: Set<string>;
  likedTracksOrder: string[];
  onToggleLike: (trackId: string) => void;
  onPlayLikedMusic: () => void;
  trackRepeatCounts: Record<string, number>;
  onUpdateTrackRepeat: (trackId: string, repeatCount: number) => void;
  onReorderLikedTracks: (trackIds: string[]) => void;
  onRenameTrack: (trackId: string, newTitle: string) => void;
}
export const HomeTab = ({
  tracks,
  playlists,
  currentTrack,
  onPlayTrack,
  onPlayPlaylist,
  onAddToPlaylist,
  onDeleteTrack,
  likedTracks,
  likedTracksOrder,
  onToggleLike,
  onPlayLikedMusic,
  trackRepeatCounts,
  onUpdateTrackRepeat,
  onReorderLikedTracks,
  onRenameTrack
}: HomeTabProps) => {
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  const [showManageLikedMusic, setShowManageLikedMusic] = useState(false);
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  const recentTracks = tracks.slice(0, 6);
  if (showManageLikedMusic) {
    return <ManageLikedMusic tracks={tracks} likedTracks={likedTracks} likedTracksOrder={likedTracksOrder} trackRepeatCounts={trackRepeatCounts} onToggleLike={onToggleLike} onPlayTrack={onPlayTrack} onUpdateTrackRepeat={onUpdateTrackRepeat} onReorderLikedTracks={onReorderLikedTracks} onBack={() => setShowManageLikedMusic(false)} />;
  }
  return <div className="flex-1 overflow-auto p-4 space-y-6" style={{
    paddingBottom: '6rem'
  }}>
      {/* Header */}
      

      {/* Quick Access Playlists */}
      {playlists.length > 0 && <div>
          <h2 className="text-xl font-semibold mb-4">Your Playlists</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {playlists.slice(0, 3).map(playlist => {
          const playlistTracks = playlist.tracks.map(trackId => tracks.find(track => track.id === trackId)).filter(Boolean) as Track[];
          const totalDuration = playlistTracks.reduce((sum, track) => sum + track.duration, 0);
          const firstTrack = playlistTracks[0];
          return <div key={playlist.id} className="bg-card rounded-lg p-4 border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-primary/20 rounded-md flex items-center justify-center flex-shrink-0">
                        <Play className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{playlist.name}</h3>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onPlayPlaylist(playlist.id)} className="w-8 h-8 hover:bg-primary/20 flex-shrink-0" disabled={playlistTracks.length === 0}>
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>{playlist.tracks.length} songs</div>
                    <div>{formatTime(totalDuration)}</div>
                  </div>
                </div>;
        })}
          </div>
        </div>}

      {/* Liked Music Section */}
      <LikedMusicSection likedTracks={likedTracks} tracks={tracks} onPlayLikedMusic={onPlayLikedMusic} onManageLikedMusic={() => setShowManageLikedMusic(true)} />

      {/* Recently Added */}
      {recentTracks.length > 0 && <div>
          <h2 className="text-xl font-semibold mb-4">Recently Added</h2>
          <div className="space-y-3">
            {recentTracks.map(track => <div key={track.id} className="group track-item">
                <div className="flex-1 min-w-0 mr-4 overflow-hidden">
                  <EditableTitle
                    title={track.title}
                    onSave={(newTitle) => onRenameTrack(track.id, newTitle)}
                    className="font-medium truncate text-base leading-tight block"
                    inputClassName="h-8"
                    showButton={false}
                  />
                </div>
                <div className="hidden sm:flex items-center text-sm text-muted-foreground mr-3 flex-shrink-0">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{formatTime(track.duration)}</span>
                </div>
                
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
                  <HeartButton isLiked={likedTracks.has(track.id)} onToggle={() => onToggleLike(track.id)} size="sm" />

                  <Button variant="ghost" size="icon" onClick={() => onPlayTrack(track)} className="w-8 h-8 hover:bg-primary/20">
                    <Play className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {playlists.map(playlist => <DropdownMenuItem key={playlist.id} onClick={() => onAddToPlaylist(playlist.id, track.id)}>
                          Add to {playlist.name}
                        </DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-destructive/20 text-destructive" onClick={() => setDeletingTrackId(track.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Song</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{track.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingTrackId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                    if (deletingTrackId) {
                      onDeleteTrack(deletingTrackId);
                      setDeletingTrackId(null);
                    }
                  }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>)}
          </div>
        </div>}

      {/* Empty State */}
      {tracks.length === 0 && playlists.length === 0 && <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-primary-foreground rounded-full flex items-center justify-center mb-6 shadow-glow">
            <Play className="h-12 w-12 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No music yet</h3>
          <p className="text-muted-foreground mb-6">
            Start by adding some music to your collection
          </p>
          <Button onClick={() => {}} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Music
          </Button>
        </div>}
    </div>;
};