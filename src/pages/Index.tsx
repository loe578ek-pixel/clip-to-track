import { useState, useEffect } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { HomeTab } from "@/components/tabs/HomeTab";
import { AddTab } from "@/components/tabs/AddTab";
import { PlaylistManagerTab } from "@/components/tabs/PlaylistManagerTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { SpotifyPlayer } from "@/components/SpotifyPlayer";
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
  const [activeTab, setActiveTab] = useState('home');
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
    setPlaylists(prev => prev.map(p => 
      p.id === playlistId ? { ...p, tracks: [...p.tracks, trackId] } : p
    ));
    toast({ title: "Track Added", description: "Added to playlist" });
  };

  const handlePlayPlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && playlist.tracks.length > 0) {
      const firstTrack = tracks.find(t => t.id === playlist.tracks[0]);
      if (firstTrack) setCurrentTrack(firstTrack);
    }
  };

  const handleClearAllData = () => {
    setTracks([]);
    setPlaylists([]);
    setCurrentTrack(null);
    localStorage.clear();
    toast({ title: "Data Cleared", description: "All data has been removed" });
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab tracks={tracks} playlists={playlists} currentTrack={currentTrack} onPlayTrack={setCurrentTrack} onPlayPlaylist={handlePlayPlaylist} />;
      case 'add':
        return <AddTab tracks={tracks} playlists={playlists} isProcessing={isProcessing} setIsProcessing={setIsProcessing} onTrackExtracted={handleTrackExtracted} onAddToPlaylist={handleAddToPlaylist} />;
      case 'playlists':
        return <PlaylistManagerTab tracks={tracks} playlists={playlists} onCreatePlaylist={handleCreatePlaylist} onRenamePlaylist={() => {}} onDeletePlaylist={() => {}} onAddToPlaylist={handleAddToPlaylist} onRemoveFromPlaylist={() => {}} onUpdateTrackRepeat={() => {}} onPlayPlaylist={handlePlayPlaylist} />;
      case 'settings':
        return <SettingsTab onClearAllData={handleClearAllData} />;
      default:
        return <HomeTab tracks={tracks} playlists={playlists} currentTrack={currentTrack} onPlayTrack={setCurrentTrack} onPlayPlaylist={handlePlayPlaylist} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {renderActiveTab()}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      {currentTrack && (
        <div className="fixed bottom-16 left-0 right-0 z-40">
          <SpotifyPlayer track={currentTrack} onNext={() => {}} onPrevious={() => {}} />
        </div>
      )}
    </div>
  );
};

export default Index;