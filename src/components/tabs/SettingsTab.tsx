import { Volume2, Headphones, Download, Info, Trash2, RefreshCw, HardDrive, Music, FileMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useVolume } from "@/contexts/VolumeContext";
import { storageService } from "@/lib/storageService";
import { audioStorageService } from "@/lib/audioStorage";
import { MusicManagementDialog } from "@/components/MusicManagementDialog";
import { Track } from "@/pages/Index";
interface SettingsTabProps {
  onClearAllData: () => void;
  onClearMusicFiles?: () => void;
  tracks: Track[];
  onDeleteTrack: (trackId: string) => void;
  likedTracks: Set<string>;
  onToggleLike: (trackId: string) => void;
  onRenameTrack: (trackId: string, newTitle: string) => void;
}
export const SettingsTab = ({
  onClearAllData,
  onClearMusicFiles,
  tracks,
  onDeleteTrack,
  likedTracks,
  onToggleLike,
  onRenameTrack
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
  return <div className="flex-1 overflow-auto p-4 space-y-6" style={{
    paddingBottom: '6rem'
  }}>
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 pb-4">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Customize your music experience</p>
      </div>

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
                  ~{audioStats.estimatedSizeMB >= 1024 ? `${(audioStats.estimatedSizeMB / 1024).toFixed(1)} GB` : `${audioStats.estimatedSizeMB.toFixed(1)} MB`}
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

      {/* App Information */}
      
    </div>;
};