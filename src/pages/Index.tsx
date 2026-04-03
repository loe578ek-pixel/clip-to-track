import { useState, useEffect } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { HomeTab } from "@/components/tabs/HomeTab";
import { AddTab } from "@/components/tabs/AddTab";
import { PlaylistManagerTab } from "@/components/tabs/PlaylistManagerTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { MusicPlayer } from "@/components/MusicPlayer";
import { VolumeProvider } from "@/contexts/VolumeContext";
import { usePremium } from "@/hooks/usePremium";

import { storageService } from "@/lib/storageService";
import { audioStorageService } from "@/lib/audioStorage";
import { toast } from "sonner";

// Type definition
type UserProfile = {
  id: string;
  display_name?: string;
  avatar_url?: string;
  email?: string;
  is_premium?: boolean;
  premium_type?: string;
  premium_expires_at?: string;
} | null;

export interface Track {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  originalFileName: string;
  createdAt: Date;
  fileSize?: number; // File size in bytes
  repeatCount?: number; // For repeat functionality
  playbackKey?: string; // Force re-render for repeats
  localFilePath?: string; // Local storage path for offline access
  isLiked?: boolean; // Like status for heart system
}

export interface Playlist {
  id: string;
  name: string;
  tracks: string[];
  createdAt: Date;
  isPermanent?: boolean;
  repeatCounts?: Record<string, number>; // Independent repeat counts per playlist
}

const Index = () => {
  const { loading: trialLoading, trialExpired, isPremium, daysRemaining, purchase, restore } = usePremium();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [currentPlaylistName, setCurrentPlaylistName] = useState<string | null>(null);
  const [trackRepeatCounts, setTrackRepeatCounts] = useState<Record<string, number>>({});
  const [currentTrackPlayCount, setCurrentTrackPlayCount] = useState<Record<string, number>>({});
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [likedTracksOrder, setLikedTracksOrder] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(true);

  // Load all app data using Capacitor storage service
  useEffect(() => {
    const loadAppData = async () => {
      console.log('🚀 Starting app load...');
      try {
        const [
          savedTracks,
          savedPlaylists,
          savedRepeatCounts,
          savedLikedTracks
        ] = await Promise.all([
          storageService.loadTracks(),
          storageService.loadPlaylists(),
          storageService.loadRepeatCounts(),
          storageService.loadLikedTracks()
        ]);
        
        setTracks(savedTracks);
        setPlaylists(savedPlaylists.length > 0 ? savedPlaylists : [
          { id: 'playlist-1', name: 'Playlist 1', tracks: [], createdAt: new Date(), repeatCounts: {} },
          { id: 'playlist-2', name: 'Playlist 2', tracks: [], createdAt: new Date(), repeatCounts: {} },
          { id: 'playlist-3', name: 'Playlist 3', tracks: [], createdAt: new Date(), repeatCounts: {} }
        ]);
        setTrackRepeatCounts(savedRepeatCounts);
        setLikedTracks(new Set(savedLikedTracks));
        setLikedTracksOrder(savedLikedTracks);
        
        console.log(`✅ Loaded ${savedTracks.length} tracks, ${savedLikedTracks.length} liked tracks`);
        setIsDataLoaded(true);
        console.log('✅ App ready!');
      } catch (error) {
        console.error('❌ Load error:', error);
        setIsDataLoaded(true);
      }
    };
    
    loadAppData();
  }, []);

  // Save tracks with Capacitor storage
  useEffect(() => {
    if (!isDataLoaded) return;
    storageService.saveTracks(tracks);
    console.log('💾 Saved tracks:', tracks.length);
  }, [tracks, isDataLoaded]);

  // Save playlists with Capacitor storage
  useEffect(() => {
    if (!isDataLoaded) return;
    storageService.savePlaylists(playlists);
    console.log('💾 Saved playlists:', playlists.length);
  }, [playlists, isDataLoaded]);

  // Save repeat counts with Capacitor storage
  useEffect(() => {
    if (!isDataLoaded) return;
    storageService.saveRepeatCounts(trackRepeatCounts);
  }, [trackRepeatCounts, isDataLoaded]);

  // Save liked tracks with Capacitor storage
  useEffect(() => {
    if (!isDataLoaded) return;
    const likedArray = Array.from(likedTracks);
    storageService.saveLikedTracks(likedArray);
    console.log('💾 Saved liked tracks:', likedArray.length);
  }, [likedTracks, isDataLoaded]);

  const handleTrackExtracted = (track: Track) => {
    setTracks(prev => [track, ...prev]);
  };

  // Helper to load audio before playing
  const loadTrackAudio = async (track: Track): Promise<Track> => {
    try {
      const loadedTrack = await audioStorageService.loadAudioTrack(track);
      console.log('✅ Track audio loaded:', loadedTrack.title);
      return loadedTrack;
    } catch (error) {
      console.error('❌ Error loading track audio:', error);
      return track;
    }
  };

  const handlePlayTrack = async (track: Track) => {
    // Block playback if trial expired and not premium
    if (trialExpired && !isPremium) {
      toast.error("Your free trial has ended. Subscribe to Premium to continue playing.");
      return;
    }
    const loadedTrack = await loadTrackAudio(track);
    setCurrentTrack(loadedTrack);
    setCurrentPlaylistId(null);
    setCurrentPlaylistName(null);
    setIsAutoPlaying(false);
    setCurrentTrackPlayCount(prev => ({
      ...prev,
      [track.id]: 0
    }));
  };

  // Initialize 3 permanent playlists - always ensure they exist
  useEffect(() => {
    if (isDataLoaded && playlists.length < 3) {
      const defaultPlaylists = [
        { id: 'playlist-1', name: "Playlist 1", tracks: [], createdAt: new Date(), isPermanent: true, repeatCounts: {} },
        { id: 'playlist-2', name: "Playlist 2", tracks: [], createdAt: new Date(), isPermanent: true, repeatCounts: {} },
        { id: 'playlist-3', name: "Playlist 3", tracks: [], createdAt: new Date(), isPermanent: true, repeatCounts: {} }
      ];
      
      // Merge existing playlists with defaults to prevent duplicates
      const existingIds = new Set(playlists.map(p => p.id));
      const missingDefaults = defaultPlaylists.filter(p => !existingIds.has(p.id));
      
      if (missingDefaults.length > 0) {
        setPlaylists([...playlists, ...missingDefaults]);
      }
    }
  }, [isDataLoaded, playlists.length]);

  // Removed - playlists are now permanent and cannot be created

  const handleAddToPlaylist = (playlistId: string, trackId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    const track = tracks.find(t => t.id === trackId);
    
    // Check if track is already in playlist
    if (playlist && track && !playlist.tracks.includes(trackId)) {
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId ? { 
          ...p, 
          tracks: [...p.tracks, trackId],
          repeatCounts: { ...(p.repeatCounts || {}), [trackId]: 1 } // Initialize with 1x repeat
        } : p
      ));
    }
  };

  const handleRemoveFromPlaylist = (playlistId: string, trackId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    const track = tracks.find(t => t.id === trackId);
    
    if (playlist && track) {
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { 
              ...p, 
              tracks: p.tracks.filter(id => id !== trackId),
              repeatCounts: Object.fromEntries(
                Object.entries(p.repeatCounts || {}).filter(([id]) => id !== trackId)
              )
            }
          : p
      ));
    }
  };

  const handleRenamePlaylist = (playlistId: string, newName: string) => {
    setPlaylists(prev => prev.map(p => 
      p.id === playlistId ? { ...p, name: newName } : p
    ));
  };

  const handleClearPlaylistTracks = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId ? { ...p, tracks: [], repeatCounts: {} } : p
      ));
    }
  };

  // Global repeat counts (for liked music and standalone tracks)
  const handleUpdateTrackRepeat = (trackId: string, repeatCount: number) => {
    setTrackRepeatCounts(prev => ({ 
      ...prev, 
      [trackId]: Math.max(1, repeatCount) 
    }));
  };

  // Playlist-specific repeat counts
  const handleUpdatePlaylistTrackRepeat = (playlistId: string, trackId: string, repeatCount: number) => {
    setPlaylists(prev => prev.map(p => 
      p.id === playlistId 
        ? { 
            ...p, 
            repeatCounts: { 
              ...(p.repeatCounts || {}), 
              [trackId]: Math.max(1, repeatCount) 
            }
          }
        : p
    ));
  };

  const handleTrackEnded = () => {
    if (!currentTrack || !currentPlaylistId) return;
    
    // Get playlist-specific repeat count
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    const savedRepeatCount = playlist?.repeatCounts?.[currentTrack.id] || 1;
    const currentPlayCount = currentTrackPlayCount[currentTrack.id] || 0;
    
    if (currentPlayCount + 1 < savedRepeatCount) {
      // Increase play count and replay same track
      setCurrentTrackPlayCount(prev => ({
        ...prev,
        [currentTrack.id]: currentPlayCount + 1
      }));
      
      // Replay current track with new playback key to force re-render and autoplay
      setIsAutoPlaying(true);
      setCurrentTrack({ 
        ...currentTrack, 
        playbackKey: crypto.randomUUID() // Force re-render for autoplay
      });
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

  const handleNextTrack = async () => {
    if (!currentTrack) return;
    
    // Handle liked music playlist
    if (currentPlaylistId === 'liked-music') {
      const likedTracksList = tracks.filter(track => likedTracks.has(track.id));
      const currentIndex = likedTracksList.findIndex(track => track.id === currentTrack.id);
      
      if (currentIndex !== -1) {
        const nextTrack = likedTracksList[currentIndex + 1];
        if (nextTrack) {
          const loadedTrack = await loadTrackAudio(nextTrack);
          setCurrentTrack(loadedTrack);
        } else {
          // Loop back to first track
          const firstTrack = likedTracksList[0];
          if (firstTrack) {
            const loadedTrack = await loadTrackAudio(firstTrack);
            setCurrentTrack(loadedTrack);
          }
        }
      }
      return;
    }
    
    // Handle regular playlists
    if (!currentPlaylistId) return;
    
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (!playlist) return;
    
    const currentIndex = playlist.tracks.findIndex(id => id === currentTrack.id);
    if (currentIndex === -1) return;
    
    const nextTrackId = playlist.tracks[currentIndex + 1];
    if (nextTrackId) {
      const nextTrack = tracks.find(t => t.id === nextTrackId);
      if (nextTrack) {
        const loadedTrack = await loadTrackAudio(nextTrack);
        setCurrentTrack(loadedTrack);
      }
    } else {
      const firstTrackId = playlist.tracks[0];
      if (firstTrackId) {
        const firstTrack = tracks.find(t => t.id === firstTrackId);
        if (firstTrack) {
          const loadedTrack = await loadTrackAudio(firstTrack);
          setCurrentTrack(loadedTrack);
        }
      }
    }
  };

  const handlePreviousTrack = async () => {
    if (!currentTrack) return;
    
    // Handle liked music playlist
    if (currentPlaylistId === 'liked-music') {
      const likedTracksList = tracks.filter(track => likedTracks.has(track.id));
      const currentIndex = likedTracksList.findIndex(track => track.id === currentTrack.id);
      
      if (currentIndex !== -1) {
        const prevTrack = likedTracksList[currentIndex - 1];
        if (prevTrack) {
          const loadedTrack = await loadTrackAudio(prevTrack);
          setCurrentTrack(loadedTrack);
        } else {
          // Loop back to last track
          const lastTrack = likedTracksList[likedTracksList.length - 1];
          if (lastTrack) {
            const loadedTrack = await loadTrackAudio(lastTrack);
            setCurrentTrack(loadedTrack);
          }
        }
      }
      return;
    }
    
    // Handle regular playlists
    if (!currentPlaylistId) return;
    
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (!playlist) return;
    
    const currentIndex = playlist.tracks.findIndex(id => id === currentTrack.id);
    if (currentIndex === -1) return;
    
    const prevTrackId = playlist.tracks[currentIndex - 1];
    if (prevTrackId) {
      const prevTrack = tracks.find(t => t.id === prevTrackId);
      if (prevTrack) {
        const loadedTrack = await loadTrackAudio(prevTrack);
        setCurrentTrack(loadedTrack);
      }
    } else {
      // Loop back to last track
      const lastTrackId = playlist.tracks[playlist.tracks.length - 1];
      if (lastTrackId) {
        const lastTrack = tracks.find(t => t.id === lastTrackId);
        if (lastTrack) {
          const loadedTrack = await loadTrackAudio(lastTrack);
          setCurrentTrack(loadedTrack);
        }
      }
    }
  };

  const handlePlayPlaylistFromTrack = async (playlistId: string, trackId: string) => {
    if (trialExpired && !isPremium) {
      toast.error("Your free trial has ended. Subscribe to Premium to continue playing.");
      return;
    }
    setCurrentTrack(null);
    setIsAutoPlaying(false);
    
    setTimeout(async () => {
      setCurrentPlaylistId(playlistId);
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist) {
        setCurrentPlaylistName(playlist.name);
      }
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const loadedTrack = await loadTrackAudio(track);
        setCurrentTrack(loadedTrack);
        setIsAutoPlaying(true);
        setCurrentTrackPlayCount(prev => ({
          ...prev,
          [track.id]: 0
        }));
      }
    }, 10);
  };

  const handlePlayPlaylist = async (playlistId: string) => {
    if (trialExpired && !isPremium) {
      toast.error("Votre essai gratuit est terminé. Passez à Premium pour continuer.");
      return;
    }
    setCurrentTrack(null);
    setIsAutoPlaying(false);
    
    setTimeout(async () => {
      setCurrentPlaylistId(playlistId);
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist && playlist.tracks.length > 0) {
        setCurrentPlaylistName(playlist.name);
        const firstTrack = tracks.find(t => t.id === playlist.tracks[0]);
        if (firstTrack) {
          const loadedTrack = await loadTrackAudio(firstTrack);
          setCurrentTrack(loadedTrack);
          setIsAutoPlaying(true);
          setCurrentTrackPlayCount(prev => ({
            ...prev,
            [firstTrack.id]: 0
          }));
        }
      }
    }, 10);
  };

  const handleClearAllData = async () => {
    try {
      // Clear from native storage
      await storageService.clearAllData();
      
      // Clear state
      setTracks([]);
      setPlaylists([]);
      setCurrentTrack(null);
      setCurrentPlaylistId(null);
      setCurrentPlaylistName(null);
      setTrackRepeatCounts({});
      setLikedTracks(new Set());
      
      // Clear localStorage as fallback
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing data:', error);
      
      // Fallback to localStorage clearing
      setTracks([]);
      setPlaylists([]);
      setCurrentTrack(null);
      setCurrentPlaylistId(null);
      setCurrentPlaylistName(null);
      setTrackRepeatCounts({});
      setLikedTracks(new Set());
      localStorage.clear();
    }
  };

  const handleClearMusicFiles = async () => {
    try {
      // Clear tracks and audio files, but keep the 3 permanent playlists (empty them)
      const emptyPlaylists = playlists.map(p => ({ ...p, tracks: [] }));
      
      await Promise.all([
        storageService.saveTracks([]),
        storageService.savePlaylists(emptyPlaylists),
        storageService.clearAudioFiles()
      ]);
      
      // Clear state (but keep the 3 playlists empty)
      setTracks([]);
      setPlaylists(emptyPlaylists);
      setCurrentTrack(null);
      setCurrentPlaylistId(null);
      setTrackRepeatCounts({});
      setCurrentTrackPlayCount({});
      setLikedTracks(new Set());
      
      // Clear music-related localStorage as fallback
      localStorage.removeItem('soundwave-tracks');
      localStorage.removeItem('soundwave-repeat-counts');
      localStorage.removeItem('soundwave-liked-tracks');
    } catch (error) {
      console.error('Error clearing music files:', error);
      
      // Fallback to clearing state and localStorage
      const emptyPlaylists = playlists.map(p => ({ ...p, tracks: [] }));
      setTracks([]);
      setPlaylists(emptyPlaylists);
      setCurrentTrack(null);
      setCurrentPlaylistId(null);
      setTrackRepeatCounts({});
      setCurrentTrackPlayCount({});
      setLikedTracks(new Set());
      
      localStorage.removeItem('soundwave-tracks');
      localStorage.removeItem('soundwave-playlists');
      localStorage.removeItem('soundwave-repeat-counts');
      localStorage.removeItem('soundwave-liked-tracks');
    }
  };

  const handleDeleteTrack = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      // Remove track from storage and delete audio file
      audioStorageService.deleteAudioTrack(track).catch(error => {
        console.error('Error deleting audio file:', error);
      });
      
      // Update tracks state
      setTracks(prev => prev.filter(t => t.id !== trackId));
      
      // Remove track from all playlists
      setPlaylists(prev => prev.map(playlist => ({
        ...playlist,
        tracks: playlist.tracks.filter(id => id !== trackId)
      })));
      
      // Clear track repeat count
      setTrackRepeatCounts(prev => {
        const { [trackId]: _, ...rest } = prev;
        return rest;
      });
      
      // Clear current track if it's the deleted one
      if (currentTrack?.id === trackId) {
        setCurrentTrack(null);
      }
    }
  };

  const handleToggleLike = (trackId: string) => {
    setLikedTracks(prev => {
      const newLikedTracks = new Set(prev);
      if (newLikedTracks.has(trackId)) {
        newLikedTracks.delete(trackId);
      } else {
        newLikedTracks.add(trackId);
      }
      return newLikedTracks;
    });
  };

  const handlePlayLikedMusic = async () => {
    if (trialExpired && !isPremium) {
      toast.error("Votre essai gratuit est terminé. Passez à Premium pour continuer.");
      return;
    }
    const likedTracksList = tracks.filter(track => likedTracks.has(track.id));
    if (likedTracksList.length > 0) {
      setCurrentTrack(null);
      setIsAutoPlaying(false);
      
      setTimeout(async () => {
        const loadedTrack = await loadTrackAudio(likedTracksList[0]);
        setCurrentTrack(loadedTrack);
        setCurrentPlaylistId('liked-music');
        setCurrentPlaylistName('Liked Music');
        setIsAutoPlaying(true);
        setCurrentTrackPlayCount(prev => ({
          ...prev,
          [likedTracksList[0].id]: 0
        }));
      }, 10);
    }
  };

  const handleReorderLikedTracks = async (trackIds: string[]) => {
    setLikedTracksOrder(trackIds);
    await storageService.reorderLikedTracks(trackIds);
  };

  const handleReorderPlaylistTracks = async (playlistId: string, trackIds: string[]) => {
    // Update playlist in state
    setPlaylists(prev => prev.map(playlist => 
      playlist.id === playlistId 
        ? { ...playlist, tracks: trackIds }
        : playlist
    ));
    
    // Save to storage
    await storageService.reorderPlaylistTracks(playlistId, trackIds);
  };

  const handleRenameTrack = async (trackId: string, newTitle: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, title: newTitle }
        : track
    ));
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab 
          tracks={tracks} 
          playlists={playlists} 
          currentTrack={currentTrack} 
          onPlayTrack={handlePlayTrack} 
          onPlayPlaylist={handlePlayPlaylist} 
          onAddToPlaylist={handleAddToPlaylist} 
          onDeleteTrack={handleDeleteTrack} 
          likedTracks={likedTracks} 
          likedTracksOrder={likedTracksOrder}
          onToggleLike={handleToggleLike} 
          onPlayLikedMusic={handlePlayLikedMusic} 
          trackRepeatCounts={trackRepeatCounts}
          onUpdateTrackRepeat={handleUpdateTrackRepeat}
          onReorderLikedTracks={handleReorderLikedTracks}
          onRenameTrack={handleRenameTrack}
        />;
      case 'add':
        return <AddTab tracks={tracks} playlists={playlists} isProcessing={isProcessing} setIsProcessing={setIsProcessing} onTrackExtracted={handleTrackExtracted} onAddToPlaylist={handleAddToPlaylist} likedTracks={likedTracks} onToggleLike={handleToggleLike} onRenameTrack={handleRenameTrack} />;
      case 'playlists':
        return (
          <PlaylistManagerTab 
            tracks={tracks} 
            playlists={playlists}
            onRenamePlaylist={handleRenamePlaylist} 
            onClearPlaylistTracks={handleClearPlaylistTracks} 
            onAddToPlaylist={handleAddToPlaylist} 
            onRemoveFromPlaylist={handleRemoveFromPlaylist} 
            onUpdatePlaylistTrackRepeat={handleUpdatePlaylistTrackRepeat} 
            onPlayPlaylist={handlePlayPlaylist}
            onPlayTrack={handlePlayTrack}
            likedTracks={likedTracks}
            onToggleLike={handleToggleLike}
            onReorderPlaylistTracks={handleReorderPlaylistTracks}
          />
        );
      case 'settings':
        return <SettingsTab onClearAllData={handleClearAllData} onClearMusicFiles={handleClearMusicFiles} tracks={tracks} onDeleteTrack={handleDeleteTrack} likedTracks={likedTracks} onToggleLike={handleToggleLike} onRenameTrack={handleRenameTrack} isPremium={isPremium} daysRemaining={daysRemaining} onPurchase={purchase} onRestore={restore} />;
      default:
        return <HomeTab 
          tracks={tracks} 
          playlists={playlists} 
          currentTrack={currentTrack} 
          onPlayTrack={handlePlayTrack} 
          onPlayPlaylist={handlePlayPlaylist} 
          onAddToPlaylist={handleAddToPlaylist} 
          onDeleteTrack={handleDeleteTrack} 
          likedTracks={likedTracks} 
          likedTracksOrder={likedTracksOrder}
          onToggleLike={handleToggleLike} 
          onPlayLikedMusic={handlePlayLikedMusic} 
          trackRepeatCounts={trackRepeatCounts}
          onUpdateTrackRepeat={handleUpdateTrackRepeat}
          onReorderLikedTracks={handleReorderLikedTracks}
          onRenameTrack={handleRenameTrack}
        />;
    }
  };

  return (
    <VolumeProvider>
      {trialLoading ? (
        <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground">
          <div className="animate-pulse mb-4">
            <svg className="w-16 h-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-lg text-muted-foreground">Loading SoundWave...</p>
        </div>
      ) : trialExpired ? (
        <SubscriptionRequired onPurchase={purchase} onRestore={restore} />
      ) : !isAppReady ? (
        <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground">
          <div className="animate-pulse mb-4">
            <svg className="w-16 h-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-lg text-muted-foreground">Loading SoundWave...</p>
        </div>
      ) : (
        <div className="h-full max-h-screen bg-background text-foreground overflow-hidden" style={{ paddingBottom: '4.5rem' }}>
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
                playlistName={currentPlaylistName}
              />
            </div>
          )}
        </div>
      )}
    </VolumeProvider>
  );
};

export default Index;