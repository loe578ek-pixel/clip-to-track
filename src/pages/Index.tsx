import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { AudioPlayer } from "@/components/AudioPlayer";
import { PlaylistSidebar } from "@/components/PlaylistSidebar";
import { TrackList } from "@/components/TrackList";
import { useToast } from "@/hooks/use-toast";

export interface Track {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  thumbnailUrl: string;
  originalFileName: string;
  createdAt: Date;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: string[];
  createdAt: Date;
}

const Index = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTracks = localStorage.getItem('audio-extractor-tracks');
    const savedPlaylists = localStorage.getItem('audio-extractor-playlists');
    
    if (savedTracks) {
      try {
        const parsedTracks = JSON.parse(savedTracks).map((track: any) => ({
          ...track,
          createdAt: new Date(track.createdAt)
        }));
        setTracks(parsedTracks);
      } catch (error) {
        console.error('Error loading tracks:', error);
      }
    }
    
    if (savedPlaylists) {
      try {
        const parsedPlaylists = JSON.parse(savedPlaylists).map((playlist: any) => ({
          ...playlist,
          createdAt: new Date(playlist.createdAt)
        }));
        setPlaylists(parsedPlaylists);
      } catch (error) {
        console.error('Error loading playlists:', error);
      }
    }
  }, []);

  // Save to localStorage whenever tracks or playlists change
  useEffect(() => {
    localStorage.setItem('audio-extractor-tracks', JSON.stringify(tracks));
  }, [tracks]);

  useEffect(() => {
    localStorage.setItem('audio-extractor-playlists', JSON.stringify(playlists));
  }, [playlists]);

  const handleTrackExtracted = (track: Track) => {
    setTracks(prev => [track, ...prev]);
    toast({
      title: "Audio Extracted",
      description: `Successfully extracted audio from ${track.originalFileName}`,
    });
  };

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
  };

  const handleCreatePlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      tracks: [],
      createdAt: new Date()
    };
    setPlaylists(prev => [newPlaylist, ...prev]);
    toast({
      title: "Playlist Created",
      description: `Created playlist "${name}"`,
    });
  };

  const handleAddToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(playlist => 
      playlist.id === playlistId 
        ? { ...playlist, tracks: [...playlist.tracks, trackId] }
        : playlist
    ));
  };

  const handleDeleteTrack = (trackId: string) => {
    setTracks(prev => prev.filter(track => track.id !== trackId));
    if (currentTrack?.id === trackId) {
      setCurrentTrack(null);
    }
    // Remove from all playlists
    setPlaylists(prev => prev.map(playlist => ({
      ...playlist,
      tracks: playlist.tracks.filter(id => id !== trackId)
    })));
  };

  const getCurrentPlaylistTracks = () => {
    if (!currentPlaylist) return tracks;
    const playlist = playlists.find(p => p.id === currentPlaylist);
    if (!playlist) return tracks;
    return playlist.tracks.map(trackId => tracks.find(t => t.id === trackId)).filter(Boolean) as Track[];
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        {/* Sidebar */}
        <PlaylistSidebar
          playlists={playlists}
          currentPlaylist={currentPlaylist}
          onSelectPlaylist={setCurrentPlaylist}
          onCreatePlaylist={handleCreatePlaylist}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b border-glass p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Audio Extractor
                </h1>
                <p className="text-muted-foreground mt-1">
                  Extract audio from videos and manage your collection
                </p>
              </div>
            </div>
          </header>

          {/* Upload Area */}
          <div className="p-6 border-b border-glass">
            <FileUpload
              onTrackExtracted={handleTrackExtracted}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </div>

          {/* Track List */}
          <div className="flex-1 p-6 overflow-auto">
            <TrackList
              tracks={getCurrentPlaylistTracks()}
              currentTrack={currentTrack}
              playlists={playlists}
              onPlayTrack={handlePlayTrack}
              onAddToPlaylist={handleAddToPlaylist}
              onDeleteTrack={handleDeleteTrack}
            />
          </div>
        </div>
      </div>

      {/* Audio Player */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-glass bg-glass backdrop-blur-md">
          <AudioPlayer
            track={currentTrack}
            onNext={() => {
              const currentTracks = getCurrentPlaylistTracks();
              const currentIndex = currentTracks.findIndex(t => t.id === currentTrack.id);
              const nextTrack = currentTracks[currentIndex + 1];
              if (nextTrack) setCurrentTrack(nextTrack);
            }}
            onPrevious={() => {
              const currentTracks = getCurrentPlaylistTracks();
              const currentIndex = currentTracks.findIndex(t => t.id === currentTrack.id);
              const prevTrack = currentTracks[currentIndex - 1];
              if (prevTrack) setCurrentTrack(prevTrack);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Index;