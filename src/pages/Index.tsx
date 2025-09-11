import { useState, useEffect } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { HomeTab } from "@/components/tabs/HomeTab";
import { AddTab } from "@/components/tabs/AddTab";
import { PlaylistManagerTab } from "@/components/tabs/PlaylistManagerTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { MusicPlayer } from "@/components/MusicPlayer";
import { useToast } from "@/hooks/use-toast";
import { VolumeProvider } from "@/contexts/VolumeContext";
import { Toaster } from "@/components/ui/toaster";

export interface Track {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  thumbnailUrl: string;
  originalFileName: string;
  createdAt: Date;
  repeatCount?: number; // For repeat functionality
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
  const [activeTab, setActiveTab] = useState('home');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [trackRepeatCounts, setTrackRepeatCounts] = useState<Record<string, number>>({});
  const [currentTrackPlayCount, setCurrentTrackPlayCount] = useState<Record<string, number>>({});
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const { toast } = useToast();

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTracks = localStorage.getItem('soundwave-tracks');
    const savedPlaylists = localStorage.getItem('soundwave-playlists');
    const savedRepeatCounts = localStorage.getItem('soundwave-repeat-counts');
    
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

    if (savedRepeatCounts) {
      try {
        setTrackRepeatCounts(JSON.parse(savedRepeatCounts));
      } catch (error) {
        console.error('Error loading repeat counts:', error);
      }
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('soundwave-tracks', JSON.stringify(tracks));
  }, [tracks]);

  useEffect(() => {
    localStorage.setItem('soundwave-playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('soundwave-repeat-counts', JSON.stringify(trackRepeatCounts));
  }, [trackRepeatCounts]);

  const handleTrackExtracted = (track: Track) => {
    setTracks(prev => [track, ...prev]);
    toast({
      title: "Audio Extracted",
      description: `Successfully extracted audio from ${track.originalFileName}`,
    });
  };

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsAutoPlaying(false); // Reset autoplay when manually selecting a track
    // Reset play count when manually starting a track
    setCurrentTrackPlayCount(prev => ({
      ...prev,
      [track.id]: 0
    }));
  };

  // Initialize default playlists
  useEffect(() => {
    if (playlists.length === 0) {
      const defaultPlaylists = [
        { id: crypto.randomUUID(), name: "Liked Songs", tracks: [], createdAt: new Date() },
        { id: crypto.randomUUID(), name: "Recently Played", tracks: [], createdAt: new Date() },
        { id: crypto.randomUUID(), name: "My Favorites", tracks: [], createdAt: new Date() }
      ];
      setPlaylists(defaultPlaylists);
    }
  }, []);

  const handleCreatePlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      tracks: [],
      createdAt: new Date()
    };
    setPlaylists(prev => [newPlaylist, ...prev]);
    toast({ title: "Playlist Created", description: `Created "${name}"` });
  };

  const handleAddToPlaylist = (playlistId: string, trackId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    const track = tracks.find(t => t.id === trackId);
    
    // Check if track is already in playlist
    if (playlist && track && !playlist.tracks.includes(trackId)) {
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId ? { ...p, tracks: [...p.tracks, trackId] } : p
      ));
      toast({ 
        title: "Track Added", 
        description: `Added "${track.title}" to "${playlist.name}"` 
      });
    }
  };

  const handleRemoveFromPlaylist = (playlistId: string, trackId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    const track = tracks.find(t => t.id === trackId);
    
    if (playlist && track) {
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, tracks: p.tracks.filter(id => id !== trackId) }
          : p
      ));
      toast({ 
        title: "Track Removed", 
        description: `Removed "${track.title}" from "${playlist.name}"` 
      });
    }
  };

  const handleRenamePlaylist = (playlistId: string, newName: string) => {
    setPlaylists(prev => prev.map(p => 
      p.id === playlistId ? { ...p, name: newName } : p
    ));
    toast({ 
      title: "Playlist Renamed", 
      description: `Renamed to "${newName}"` 
    });
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      toast({ 
        title: "Playlist Deleted", 
        description: `Deleted "${playlist.name}"` 
      });
    }
  };

  const handleUpdateTrackRepeat = (trackId: string, repeatCount: number) => {
    setTrackRepeatCounts(prev => ({ 
      ...prev, 
      [trackId]: Math.max(1, repeatCount) 
    }));
  };

  const handleTrackEnded = () => {
    if (!currentTrack) return;
    
    // Check if current track should repeat (using saved repeat count, not temporary counter)
    const savedRepeatCount = trackRepeatCounts[currentTrack.id] || 1;
    const currentPlayCount = currentTrackPlayCount[currentTrack.id] || 0;
    
    if (currentPlayCount + 1 < savedRepeatCount) {
      // Increase play count and replay same track
      setCurrentTrackPlayCount(prev => ({
        ...prev,
        [currentTrack.id]: currentPlayCount + 1
      }));
      
      // Replay current track by setting it again with autoplay
      setIsAutoPlaying(true);
      setCurrentTrack({ ...currentTrack });
      return;
    }
    
    // Reset play count and move to next track
    setCurrentTrackPlayCount(prev => ({
      ...prev,
      [currentTrack.id]: 0
    }));
    
    setIsAutoPlaying(true);
    handleNextTrack();
  };

  const handleNextTrack = () => {
    if (!currentTrack || !currentPlaylistId) return;
    
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (!playlist) return;
    
    const currentIndex = playlist.tracks.findIndex(id => id === currentTrack.id);
    if (currentIndex === -1) return;
    
    // Move to next track
    const nextTrackId = playlist.tracks[currentIndex + 1];
    if (nextTrackId) {
      const nextTrack = tracks.find(t => t.id === nextTrackId);
      if (nextTrack) {
        setCurrentTrack(nextTrack);
      }
    } else {
      // End of playlist - loop back to first song
      const firstTrackId = playlist.tracks[0];
      if (firstTrackId) {
        const firstTrack = tracks.find(t => t.id === firstTrackId);
        if (firstTrack) {
          setCurrentTrack(firstTrack);
        }
      }
    }
  };

  const handlePreviousTrack = () => {
    if (!currentTrack || !currentPlaylistId) return;
    
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (!playlist) return;
    
    const currentIndex = playlist.tracks.findIndex(id => id === currentTrack.id);
    if (currentIndex === -1) return;
    
    const prevTrackId = playlist.tracks[currentIndex - 1];
    if (prevTrackId) {
      const prevTrack = tracks.find(t => t.id === prevTrackId);
      if (prevTrack) setCurrentTrack(prevTrack);
    }
  };

  const handlePlayPlaylistFromTrack = (playlistId: string, trackId: string) => {
    setCurrentPlaylistId(playlistId);
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      setCurrentTrack(track);
      setIsAutoPlaying(true); // Enable autoplay to start immediately
      // Reset play count when manually starting a track
      setCurrentTrackPlayCount(prev => ({
        ...prev,
        [track.id]: 0
      }));
    }
  };

  const handlePlayPlaylist = (playlistId: string) => {
    setCurrentPlaylistId(playlistId);
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && playlist.tracks.length > 0) {
      const firstTrack = tracks.find(t => t.id === playlist.tracks[0]);
      if (firstTrack) {
        setCurrentTrack(firstTrack);
        setIsAutoPlaying(true); // Enable autoplay to start immediately
        // Reset play count for the track
        setCurrentTrackPlayCount(prev => ({
          ...prev,
          [firstTrack.id]: 0
        }));
      }
    }
  };

  const handleClearAllData = () => {
    setTracks([]);
    setPlaylists([]);
    setCurrentTrack(null);
    setCurrentPlaylistId(null);
    setTrackRepeatCounts({});
    localStorage.clear();
    toast({ title: "Data Cleared", description: "All data has been removed" });
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab tracks={tracks} playlists={playlists} currentTrack={currentTrack} onPlayTrack={handlePlayTrack} onPlayPlaylist={handlePlayPlaylist} />;
      case 'add':
        return <AddTab tracks={tracks} playlists={playlists} isProcessing={isProcessing} setIsProcessing={setIsProcessing} onTrackExtracted={handleTrackExtracted} onAddToPlaylist={handleAddToPlaylist} />;
      case 'playlists':
        return (
          <PlaylistManagerTab 
            tracks={tracks} 
            playlists={playlists} 
            trackRepeatCounts={trackRepeatCounts}
            onCreatePlaylist={handleCreatePlaylist} 
            onRenamePlaylist={handleRenamePlaylist} 
            onDeletePlaylist={handleDeletePlaylist} 
            onAddToPlaylist={handleAddToPlaylist} 
            onRemoveFromPlaylist={handleRemoveFromPlaylist} 
            onUpdateTrackRepeat={handleUpdateTrackRepeat} 
            onPlayPlaylist={handlePlayPlaylist}
            onPlayTrack={handlePlayTrack}
          />
        );
      case 'settings':
        return <SettingsTab onClearAllData={handleClearAllData} />;
      default:
        return <HomeTab tracks={tracks} playlists={playlists} currentTrack={currentTrack} onPlayTrack={handlePlayTrack} onPlayPlaylist={handlePlayPlaylist} />;
    }
  };

  return (
    <VolumeProvider>
      <div className="h-full max-h-screen bg-background text-foreground pb-16 overflow-hidden">
        <div className="h-full max-h-screen overflow-y-auto overflow-x-hidden pb-20">
          {renderActiveTab()}
        </div>
        
        {/* Bottom Navigation - Always Visible */}
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Audio Player - Above Bottom Navigation */}
        {currentTrack && (
          <div className="fixed bottom-16 left-0 right-0 z-40">
            <MusicPlayer 
              track={currentTrack} 
              onNext={handleNextTrack} 
              onPrevious={handlePreviousTrack} 
              onEnded={handleTrackEnded}
              autoPlay={isAutoPlaying}
            />
          </div>
        )}
        
        <Toaster />
      </div>
    </VolumeProvider>
  );
};

export default Index;