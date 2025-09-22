import { Play, Plus, Trash2, Clock, Calendar } from "lucide-react";
import { LikedMusicSection } from "@/components/LikedMusicSection";
import { HeartButton } from "@/components/HeartButton";
import { ManageLikedMusic } from "@/components/ManageLikedMusic";
import { Track, Playlist } from "@/pages/Index";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

interface HomeTabProps {
  tracks: Track[];
  playlists: Playlist[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  onPlayPlaylist: (playlistId: string) => void;
  onAddToPlaylist: (trackId: string, playlistId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  likedTracks: Set<string>;
  onToggleLike: (trackId: string) => void;
  onPlayLikedMusic: () => void;
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
  onToggleLike,
  onPlayLikedMusic
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
    return (
      <ManageLikedMusic 
        tracks={tracks}
        likedTracks={likedTracks}
        trackRepeatCounts={{}} // You might want to pass actual repeat counts if needed
        onToggleLike={onToggleLike}
        onPlayTrack={onPlayTrack}
        onUpdateTrackRepeat={() => {}} // Add repeat functionality if needed
        onBack={() => setShowManageLikedMusic(false)}
      />
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-6" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 pb-4">
        <h1 className="text-3xl font-bold mb-2">Good evening</h1>
        <p className="text-muted-foreground">Welcome back to your music</p>
      </div>

      {/* Quick Access Playlists */}
      {playlists.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Playlists</h2>
          <div className="grid grid-cols-1 gap-3">
            {playlists.slice(0, 3).map((playlist) => (
              <div key={playlist.id} className="playlist-item">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0 mr-3">
                  <h3 className="font-medium truncate text-base">{playlist.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {playlist.tracks.length} songs
                  </p>
                </div>
                <Button
                  onClick={() => onPlayPlaylist(playlist.id)}
                  size="icon"
                  className="soundwave-button-primary w-12 h-12 rounded-full flex-shrink-0"
                >
                  <Play className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liked Music Section */}
      <LikedMusicSection 
        tracks={tracks}
        likedTracks={likedTracks}
        onPlayLikedMusic={onPlayLikedMusic}
        onManageLikedMusic={() => setShowManageLikedMusic(true)}
      />

      {/* Recently Added */}
      {recentTracks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recently Added</h2>
          <div className="space-y-2">
            {recentTracks.map((track, index) => (
              <div
                key={track.id}
                className={`group track-item ${currentTrack?.id === track.id ? 'playing' : ''}`}
              >
                {/* Track Number / Play Button */}
                <div className="w-10 flex justify-center items-center flex-shrink-0">
                  {currentTrack?.id === track.id ? (
                    <div className="w-4 h-4 bg-primary rounded-sm animate-pulse" />
                  ) : (
                    <>
                      <span className="text-muted-foreground text-sm group-hover:hidden">
                        {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPlayTrack(track)}
                        className="hidden group-hover:flex w-8 h-8 hover:bg-primary/20"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Thumbnail */}
                <img
                  src={track.thumbnailUrl}
                  alt={track.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />

                {/* Track Info */}
                <div className="flex-1 min-w-0 mr-2">
                  <h4 className="font-medium truncate text-base leading-tight">{track.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.originalFileName}
                  </p>
                </div>

                {/* Duration & Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="hidden sm:flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{formatTime(track.duration)}</span>
                  </div>
                  
                  {/* Heart Button */}
                  <HeartButton
                    isLiked={likedTracks.has(track.id)}
                    onToggle={() => onToggleLike(track.id)}
                    size="sm"
                    className="opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 opacity-60 group-hover:opacity-100 transition-opacity sm:hidden"
                    onClick={() => onPlayTrack(track)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  
                  {/* Add to Playlist Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-white/10">
                      {playlists.length > 0 ? (
                        playlists.map((playlist) => (
                          <DropdownMenuItem
                            key={playlist.id}
                            onClick={() => onAddToPlaylist(track.id, playlist.id)}
                            className="cursor-pointer"
                          >
                            {playlist.name}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>
                          No playlists available
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        disabled={deletingTrackId === track.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-white/10 mx-4">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this song from the app?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          This action will permanently delete "{track.title}" from your device and all playlists.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setDeletingTrackId(track.id);
                            onDeleteTrack(track.id);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tracks.length === 0 && playlists.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mb-6 shadow-glow">
            <Play className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Start your music journey</h3>
          <p className="text-muted-foreground mb-6">
            Add your first song to get started
          </p>
          <Button className="soundwave-button-primary">
            Add Music
          </Button>
        </div>
      )}
    </div>
  );
};