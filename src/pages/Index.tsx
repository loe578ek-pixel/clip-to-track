import { useState, useEffect } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { HomeTab } from "@/components/tabs/HomeTab";
import { AddTab } from "@/components/tabs/AddTab";
import { PlaylistManagerTab } from "@/components/tabs/PlaylistManagerTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { MusicPlayer } from "@/components/MusicPlayer";
import { VolumeProvider } from "@/contexts/VolumeContext";

import { storageService } from "@/lib/storageService";
import { audioStorageService } from "@/lib/audioStorage";

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
}

const Index = () => {
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Auth state listener - sync account data from cloud (non-blocking)
  useEffect(() => {
    let authSubscription: any = null;
    
    const initAuth = async () => {
      try {
        // Dynamically import Supabase modules
        const supabaseModule = await import("@/integrations/supabase/client");
        const cloudSyncModule = await import("@/lib/cloudSync");
        const supabase = supabaseModule.supabase;
        const syncUserProfile = cloudSyncModule.syncUserProfile;
        const getPlaylistNames = cloudSyncModule.getPlaylistNames;
        
        console.log("✅ Supabase loaded, initializing auth...");

        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000))
        ]) as any;
        
        const user = session?.user;
        setUserId(user?.id ?? null);
        
        if (user) {
          // Sync user profile from cloud (non-blocking)
          syncUserProfile(user.id).then((profile: any) => {
            if (profile) {
              setUserProfile(profile);
              console.log('User profile synced from cloud:', profile);
            }
          }).catch((err: any) => console.log('Profile sync skipped:', err.message));
          
          // Sync playlist names from cloud (non-blocking)
          getPlaylistNames(user.id).then((cloudPlaylists: any) => {
            if (cloudPlaylists.length > 0) {
              console.log('Playlist names synced from cloud:', cloudPlaylists);
              setPlaylists(prev => {
                return prev.map((localPlaylist, index) => {
                  const cloudPlaylist = cloudPlaylists[index];
                  if (cloudPlaylist) {
                    return {
                      ...localPlaylist,
                      name: cloudPlaylist.name
                    };
                  }
                  return localPlaylist;
                });
              });
            }
          }).catch((err: any) => console.log('Playlist sync skipped:', err.message));
        }

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
          const user = session?.user;
          setUserId(user?.id ?? null);
          
          if (user) {
            setTimeout(() => {
              syncUserProfile(user.id).then((profile: any) => {
                if (profile) {
                  setUserProfile(profile);
                  console.log('User profile synced from cloud:', profile);
                }
              }).catch((err: any) => console.log('Profile sync error:', err));
              
              getPlaylistNames(user.id).then((cloudPlaylists: any) => {
                if (cloudPlaylists.length > 0) {
                  console.log('Playlist names synced from cloud:', cloudPlaylists);
                  setPlaylists(prev => {
                    return prev.map((localPlaylist, index) => {
                      const cloudPlaylist = cloudPlaylists[index];
                      if (cloudPlaylist) {
                        return {
                          ...localPlaylist,
                          name: cloudPlaylist.name
                        };
                      }
                      return localPlaylist;
                    });
                  });
                }
              }).catch((err: any) => console.log('Playlist sync error:', err));
            }, 0);
          } else {
            setUserProfile(null);
          }
        });
        
        authSubscription = subscription;
      } catch (error) {
        console.log('⚠️ Auth initialization skipped - app continues in offline mode:', error);
        // Continue app loading even if auth fails
      }
    };

    initAuth();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // Load data from Capacitor native storage on mount
  useEffect(() => {
    const loadAppData = async () => {
      try {
        console.log('Loading app data from native storage...');
        
        // First, try to migrate from localStorage if needed
        await storageService.migrateFromLocalStorage();
        
        // Load all data from native storage
        const [loadedTracks, loadedPlaylists, loadedRepeatCounts, loadedLikedTracks] = await Promise.all([
          storageService.loadTracks(),
          storageService.loadPlaylists(),
          storageService.loadRepeatCounts(),
          storageService.loadLikedTracks()
        ]);
        
        // Update audio URLs to use local storage paths for offline access
        const tracksWithLocalPaths = await Promise.all(
          loadedTracks.map(async (track) => {
            if (track.localFilePath) {
              try {
                const localAudioUrl = await storageService.getAudioFile(track.localFilePath);
                return { ...track, audioUrl: localAudioUrl };
              } catch (error) {
                console.warn(`Could not load local audio for track ${track.id}:`, error);
                return track;
              }
            }
            return track;
          })
        );
        
        setTracks(tracksWithLocalPaths);
        setPlaylists(loadedPlaylists);
        setTrackRepeatCounts(loadedRepeatCounts);
        setLikedTracks(new Set(loadedLikedTracks));
        setLikedTracksOrder(loadedLikedTracks); // Initialize order from loaded liked tracks
        
        console.log(`Loaded ${tracksWithLocalPaths.length} tracks, ${loadedPlaylists.length} playlists`);
        
        // Get storage info for debugging
        const storageInfo = await storageService.getStorageInfo();
        console.log('Storage info:', storageInfo);
        
        setIsDataLoaded(true);
      } catch (error) {
        console.error('Error loading app data:', error);
        // Fallback to localStorage if native storage fails
        console.log('Falling back to localStorage...');
        
        const savedTracks = localStorage.getItem('soundwave-tracks');
        const savedPlaylists = localStorage.getItem('soundwave-playlists');
        const savedRepeatCounts = localStorage.getItem('soundwave-repeat-counts');
        const savedLikedTracks = localStorage.getItem('soundwave-liked-tracks');
        
        if (savedTracks) {
          try {
            const parsedTracks = JSON.parse(savedTracks).map((track: any) => ({
              ...track,
              createdAt: new Date(track.createdAt)
            }));
            setTracks(parsedTracks);
          } catch (error) {
            console.error('Error loading tracks from localStorage:', error);
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
            console.error('Error loading playlists from localStorage:', error);
          }
        }
        
        if (savedRepeatCounts) {
          try {
            setTrackRepeatCounts(JSON.parse(savedRepeatCounts));
          } catch (error) {
            console.error('Error loading repeat counts from localStorage:', error);
          }
        }
        
        if (savedLikedTracks) {
          try {
            setLikedTracks(new Set(JSON.parse(savedLikedTracks)));
          } catch (error) {
            console.error('Error loading liked tracks from localStorage:', error);
          }
        }
        
        setIsDataLoaded(true);
      }
    };
    
    loadAppData();
  }, []);

  // Save to native storage whenever data changes
  useEffect(() => {
    if (!isDataLoaded) return; // Don't save during initial load
    
    const saveData = async () => {
      try {
        await storageService.saveTracks(tracks);
      } catch (error) {
        console.error('Error saving tracks:', error);
      }
    };
    
    saveData();
  }, [tracks, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return; // Don't save during initial load
    
    const saveData = async () => {
      try {
        await storageService.savePlaylists(playlists);
        
        // Sync playlist names to cloud (if user is logged in)
        if (userId && playlists.length > 0) {
          try {
            const cloudSyncModule = await import("@/lib/cloudSync");
            const playlistNames = playlists.map((p, index) => ({
              name: p.name,
              position: index
            }));
            await cloudSyncModule.syncPlaylistNames(userId, playlistNames);
          } catch (error) {
            console.log('Cloud sync skipped:', error);
          }
        }
      } catch (error) {
        console.error('Error saving playlists:', error);
      }
    };
    
    saveData();
  }, [playlists, isDataLoaded, userId]);

  useEffect(() => {
    if (!isDataLoaded) return; // Don't save during initial load
    
    const saveData = async () => {
      try {
        await storageService.saveRepeatCounts(trackRepeatCounts);
      } catch (error) {
        console.error('Error saving repeat counts:', error);
      }
    };
    
    saveData();
  }, [trackRepeatCounts, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return; // Don't save during initial load
    
    const saveData = async () => {
      try {
        await storageService.saveLikedTracks(Array.from(likedTracks));
      } catch (error) {
        console.error('Error saving liked tracks:', error);
      }
    };
    
    saveData();
  }, [likedTracks, isDataLoaded]);

  const handleTrackExtracted = (track: Track) => {
    setTracks(prev => [track, ...prev]);
  };

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setCurrentPlaylistId(null); // Clear playlist when playing individual track
    setCurrentPlaylistName(null); // Clear playlist name
    setIsAutoPlaying(false); // Reset autoplay when manually selecting a track
    // Reset play count when manually starting a track
    setCurrentTrackPlayCount(prev => ({
      ...prev,
      [track.id]: 0
    }));
  };

  // Initialize 3 permanent playlists - always ensure they exist
  useEffect(() => {
    if (isDataLoaded && playlists.length < 3) {
      const defaultPlaylists = [
        { id: 'playlist-1', name: "Playlist 1", tracks: [], createdAt: new Date(), isPermanent: true },
        { id: 'playlist-2', name: "Playlist 2", tracks: [], createdAt: new Date(), isPermanent: true },
        { id: 'playlist-3', name: "Playlist 3", tracks: [], createdAt: new Date(), isPermanent: true }
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
        p.id === playlistId ? { ...p, tracks: [...p.tracks, trackId] } : p
      ));
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
        p.id === playlistId ? { ...p, tracks: [] } : p
      ));
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

  const handleNextTrack = () => {
    if (!currentTrack) return;
    
    // Handle liked music playlist
    if (currentPlaylistId === 'liked-music') {
      const likedTracksList = tracks.filter(track => likedTracks.has(track.id));
      const currentIndex = likedTracksList.findIndex(track => track.id === currentTrack.id);
      
      if (currentIndex !== -1) {
        const nextTrackId = likedTracksList[currentIndex + 1];
        if (nextTrackId) {
          setCurrentTrack(nextTrackId);
        } else {
          // Loop back to first liked track
          const firstTrack = likedTracksList[0];
          if (firstTrack) {
            setCurrentTrack(firstTrack);
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
    if (!currentTrack) return;
    
    // Handle liked music playlist
    if (currentPlaylistId === 'liked-music') {
      const likedTracksList = tracks.filter(track => likedTracks.has(track.id));
      const currentIndex = likedTracksList.findIndex(track => track.id === currentTrack.id);
      
      if (currentIndex !== -1) {
        const prevTrack = likedTracksList[currentIndex - 1];
        if (prevTrack) {
          setCurrentTrack(prevTrack);
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
      if (prevTrack) setCurrentTrack(prevTrack);
    }
  };

  const handlePlayPlaylistFromTrack = (playlistId: string, trackId: string) => {
    // Force stop current playback by briefly clearing track
    setCurrentTrack(null);
    setIsAutoPlaying(false);
    
    // Use setTimeout to ensure state updates and then start new track
    setTimeout(() => {
      setCurrentPlaylistId(playlistId);
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist) {
        setCurrentPlaylistName(playlist.name);
      }
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
    }, 10);
  };

  const handlePlayPlaylist = (playlistId: string) => {
    // Force stop current playback by briefly clearing track
    setCurrentTrack(null);
    setIsAutoPlaying(false);
    
    // Use setTimeout to ensure state updates and then start new playlist
    setTimeout(() => {
      setCurrentPlaylistId(playlistId);
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist && playlist.tracks.length > 0) {
        setCurrentPlaylistName(playlist.name);
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

  const handlePlayLikedMusic = () => {
    const likedTracksList = tracks.filter(track => likedTracks.has(track.id));
    if (likedTracksList.length > 0) {
      // Force stop current playback by briefly clearing track
      setCurrentTrack(null);
      setIsAutoPlaying(false);
      
      // Use setTimeout to ensure state updates and then start liked music
      setTimeout(() => {
        setCurrentTrack(likedTracksList[0]);
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
            trackRepeatCounts={trackRepeatCounts}
            onRenamePlaylist={handleRenamePlaylist} 
            onClearPlaylistTracks={handleClearPlaylistTracks} 
            onAddToPlaylist={handleAddToPlaylist} 
            onRemoveFromPlaylist={handleRemoveFromPlaylist} 
            onUpdateTrackRepeat={handleUpdateTrackRepeat} 
            onPlayPlaylist={handlePlayPlaylist}
            onPlayTrack={handlePlayTrack}
            likedTracks={likedTracks}
            onToggleLike={handleToggleLike}
            onReorderPlaylistTracks={handleReorderPlaylistTracks}
          />
        );
      case 'settings':
        return <SettingsTab onClearAllData={handleClearAllData} onClearMusicFiles={handleClearMusicFiles} tracks={tracks} onDeleteTrack={handleDeleteTrack} likedTracks={likedTracks} onToggleLike={handleToggleLike} onRenameTrack={handleRenameTrack} />;
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
    </VolumeProvider>
  );
};

export default Index;