import { Volume2, Headphones, Download, Info, Trash2, RefreshCw, HardDrive, Music, FileMusic, User as UserIcon, LogOut, Crown, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useVolume } from "@/contexts/VolumeContext";
import { storageService } from "@/lib/storageService";
import { audioStorageService } from "@/lib/audioStorage";
import { MusicManagementDialog } from "@/components/MusicManagementDialog";
import { Track } from "@/pages/Index";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { syncUserProfile, type UserProfile } from "@/lib/cloudSync";
import type { User } from "@supabase/supabase-js";
interface SettingsTabProps {
  onClearAllData: () => void;
  onClearMusicFiles?: () => void;
  tracks: Track[];
  onDeleteTrack: (trackId: string) => void;
  likedTracks: Set<string>;
  onToggleLike: (trackId: string) => void;
  onRenameTrack: (trackId: string, newTitle: string) => void;
  isPremium: boolean;
  daysRemaining: number | null;
  trialExpired: boolean;
  onPurchase: () => Promise<boolean>;
  onRestore: () => Promise<boolean>;
}
export const SettingsTab = ({
  onClearAllData,
  onClearMusicFiles,
  tracks,
  onDeleteTrack,
  likedTracks,
  onToggleLike,
  onRenameTrack,
  isPremium,
  daysRemaining,
  onPurchase,
  onRestore
}: SettingsTabProps) => {
  const {
    masterVolume,
    setMasterVolume
  } = useVolume();
  const [autoPlay, setAutoPlay] = useState(true);
  const [crossfade, setCrossfade] = useState(false);
  const [highQuality, setHighQuality] = useState(true);
  const [storageInfo, setStorageInfo] = useState({
    tracks: 0,
    playlists: 0,
    audioFiles: 0
  });
  const [audioStats, setAudioStats] = useState({
    totalFiles: 0,
    estimatedSizeMB: 0
  });
  const [isClearMusicDialogOpen, setIsClearMusicDialogOpen] = useState(false);
  const [isMusicManagementOpen, setIsMusicManagementOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Check authentication state
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        syncUserProfile(session.user.id).then(profile => {
          setUserProfile(profile);
        });
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          syncUserProfile(session.user.id).then(profile => {
            setUserProfile(profile);
          });
        }, 0);
      } else {
        setUserProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load storage information - updates when tracks change
  useEffect(() => {
    const loadStorageInfo = async () => {
      try {
        const [storage, audio] = await Promise.all([storageService.getStorageInfo(), audioStorageService.getAudioStorageStats()]);
        setStorageInfo(storage);
        setAudioStats(audio);
      } catch (error) {
        console.error('Error loading storage info:', error);
      }
    };
    loadStorageInfo();
  }, [tracks]);
  const handleDeleteIndividualTrack = (trackId: string) => {
    // Update local storage info after deletion
    setStorageInfo(prev => ({
      ...prev,
      tracks: prev.tracks - 1
    }));
    setAudioStats(prev => ({
      ...prev,
      totalFiles: Math.max(0, prev.totalFiles - 1)
    }));

    // Call parent callback
    onDeleteTrack(trackId);
  };
  const handleClearMusicFiles = async () => {
    try {
      // Clear only music-related data, keep app settings
      await Promise.all([storageService.saveTracks([]), storageService.savePlaylists([]), storageService.clearAudioFiles() // We'll need to add this method
      ]);

      // Update storage info
      const [storage, audio] = await Promise.all([storageService.getStorageInfo(), audioStorageService.getAudioStorageStats()]);
      setStorageInfo(storage);
      setAudioStats(audio);

      // Call parent callback if provided
      if (onClearMusicFiles) {
        onClearMusicFiles();
      }
      setIsClearMusicDialogOpen(false);
    } catch (error) {
      console.error('Error clearing music files:', error);
    }
  };
  const handleSignInWithGoogle = async () => {
    setIsAuthLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) console.error('Google sign in error:', result.error);
    } catch (error) {
      console.error('Google sign in error:', error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignInWithApple = async () => {
    setIsAuthLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) console.error('Apple sign in error:', result.error);
    } catch (error) {
      console.error('Apple sign in error:', error);
    } finally {
      setIsAuthLoading(false);
    }
  };
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsSignOutDialogOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };
  const getProviderIcon = (provider?: string) => {
    if (provider === 'google') {
      return <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>;
    }
    return null;
  };
  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };
  return <div className="flex-1 overflow-auto p-4 space-y-6" style={{
    paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
    paddingBottom: '6rem'
  }}>
      {/* Header */}
      <div className="sticky bg-background/80 backdrop-blur-md z-10 pb-4" style={{ top: 'calc(env(safe-area-inset-top) + 4px)' }}>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Customize your music experience</p>
      </div>

      {/* Account Section */}
      <Card className="soundwave-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5 text-primary" />
            <span>Account</span>
          </CardTitle>
          <CardDescription>
            Manage your account and sign in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 rounded-lg bg-secondary/30">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {getUserInitials(user.user_metadata?.full_name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{user.user_metadata?.full_name || 'User'}</p>
                    {userProfile?.is_premium && <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black border-0">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  {user.app_metadata?.provider && <div className="flex items-center space-x-1 mt-1">
                      {getProviderIcon(user.app_metadata.provider)}
                      <span className="text-xs text-muted-foreground capitalize">{user.app_metadata.provider}</span>
                    </div>}
                  {userProfile?.is_premium && userProfile.premium_type && <p className="text-xs text-muted-foreground mt-1">
                      {userProfile.premium_type.charAt(0).toUpperCase() + userProfile.premium_type.slice(1)} Plan
                    </p>}
                </div>
              </div>
              
              <Dialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-white/10 mx-4">
                  <DialogHeader>
                    <DialogTitle>Sign Out</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Are you sure you want to sign out?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setIsSignOutDialogOpen(false)} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button onClick={handleSignOut} className="w-full sm:w-auto">
                      Sign Out
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div> : <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Sign in to sync your music across devices</p>
              
              <Button onClick={handleSignInWithGoogle} disabled={isAuthLoading} variant="outline" className="w-full bg-white hover:bg-gray-50 text-gray-900 border-gray-300">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <Button onClick={handleSignInWithApple} disabled={isAuthLoading} variant="outline" className="w-full bg-black hover:bg-gray-900 text-white border-gray-700">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
              </Button>
            </div>}
        </CardContent>
      </Card>

      {/* Premium / Subscription Section */}
      <Card className="soundwave-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-primary" />
            <span>Subscription</span>
          </CardTitle>
          <CardDescription>
            {isPremium ? "You are a Premium subscriber" : "Manage your subscription"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPremium ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <Crown className="h-6 w-6 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">Premium Active</p>
                {daysRemaining !== null && (
                  <p className="text-sm text-muted-foreground">
                    {daysRemaining} day{daysRemaining > 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Trial countdown */}
              {daysRemaining !== null && (
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Free Trial</p>
                  </div>
                  <p className="text-2xl font-bold text-primary mb-1">
                    {daysRemaining} day{daysRemaining > 1 ? 's' : ''} remaining
                  </p>
                  <Progress value={((30 - daysRemaining) / 30) * 100} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Full access during your trial
                  </p>
                </div>
              )}

              <Button
                size="lg"
                className="w-full text-base font-semibold"
                onClick={async () => {
                  const { Capacitor } = await import("@capacitor/core");
                  if (!Capacitor.isNativePlatform()) {
                    toast.info("Subscription is only available in the mobile app.");
                    return;
                  }
                  setIsPurchasing(true);
                  try {
                    const success = await onPurchase();
                    if (success) toast.success("Welcome to Premium! 🎉");
                    else toast.error("Purchase failed or was cancelled.");
                  } catch { toast.error("An error occurred."); }
                  finally { setIsPurchasing(false); }
                }}
                disabled={isPurchasing}
              >
                <Crown className="h-5 w-5 mr-2" />
                {isPurchasing ? "Loading..." : "Subscribe to Premium"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio Settings */}
      <Card className="soundwave-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <span>Audio Settings</span>
          </CardTitle>
          <CardDescription>
            Configure audio playback preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="volume">Master Volume</Label>
            <div className="px-3">
              <Slider id="volume" value={[masterVolume]} onValueChange={value => setMasterVolume(value[0])} max={100} step={1} className="w-full" />
            </div>
            <p className="text-sm text-muted-foreground">{masterVolume}%</p>
          </div>

          <Separator className="bg-white/10" />

          

          

          
        </CardContent>
      </Card>

      {/* Storage & Data */}
      <Card className="soundwave-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <span>Storage & Data</span>
          </CardTitle>
          <CardDescription>
            Manage your app data and offline storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage Statistics */}
          <div className="p-4 rounded-lg bg-secondary/30">
            <h4 className="font-medium mb-3">Offline Storage Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-primary">Tracks</p>
                <p className="text-muted-foreground">{storageInfo.tracks} songs</p>
              </div>
              <div>
                <p className="font-medium text-primary">Playlists</p>
                <p className="text-muted-foreground">{storageInfo.playlists} lists</p>
              </div>
              <div>
                <p className="font-medium text-primary">Audio Files</p>
                <p className="text-muted-foreground">{audioStats.totalFiles} files</p>
              </div>
              <div>
                <p className="font-medium text-primary">Storage Used</p>
                <p className="text-muted-foreground">
                  {audioStats.estimatedSizeMB >= 1024 
                    ? `${(audioStats.estimatedSizeMB / 1024).toFixed(2)} GB` 
                    : audioStats.estimatedSizeMB >= 1
                    ? `${audioStats.estimatedSizeMB.toFixed(1)} MB`
                    : `${(audioStats.estimatedSizeMB * 1024).toFixed(1)} KB`}
                </p>
              </div>
            </div>
            <div className="mt-3 p-2 rounded bg-primary/10 border border-primary/20">
              <p className="text-xs text-primary font-medium">
                ✓ All data saved locally for offline access
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-secondary/30 gap-3">
            <div className="flex-1">
              <h4 className="font-medium">Manage Music Files</h4>
              <p className="text-sm text-muted-foreground">
                View and selectively delete individual songs
              </p>
            </div>
            <Button onClick={() => setIsMusicManagementOpen(true)} variant="outline" size="sm" className="bg-primary/10 border-primary/30 hover:bg-primary/20 w-full sm:w-auto">
              <FileMusic className="h-4 w-4 mr-2" />
              Manage Music
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-secondary/30 gap-3">
            <div className="flex-1">
              <h4 className="font-medium">Clear All Music</h4>
              <p className="text-sm text-muted-foreground">
                Delete all tracks, keep your 3 playlists empty
              </p>
            </div>
            <Dialog open={isClearMusicDialogOpen} onOpenChange={setIsClearMusicDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                  <Music className="h-4 w-4 mr-2" />
                  Clear Music Files
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 mx-4">
                <DialogHeader>
                  <DialogTitle>Clear All Tracks</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    This will delete all tracks but keep your 3 playlists (empty). Are you sure?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsClearMusicDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleClearMusicFiles} className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto">
                    Yes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

        </CardContent>
      </Card>

      {/* Music Management Dialog */}
      <MusicManagementDialog isOpen={isMusicManagementOpen} onClose={() => setIsMusicManagementOpen(false)} tracks={tracks} onDeleteTrack={handleDeleteIndividualTrack} likedTracks={likedTracks} onToggleLike={onToggleLike} onRenameTrack={onRenameTrack} />
    </div>;
};