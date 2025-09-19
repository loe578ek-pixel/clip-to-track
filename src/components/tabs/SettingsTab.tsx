import { Volume2, Headphones, Download, Info, Trash2, RefreshCw, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useVolume } from "@/contexts/VolumeContext";
import { storageService } from "@/lib/storageService";
import { audioStorageService } from "@/lib/audioStorage";

interface SettingsTabProps {
  onClearAllData: () => void;
}

export const SettingsTab = ({ onClearAllData }: SettingsTabProps) => {
  const { masterVolume, setMasterVolume } = useVolume();
  const [autoPlay, setAutoPlay] = useState(true);
  const [crossfade, setCrossfade] = useState(false);
  const [highQuality, setHighQuality] = useState(true);
  const [storageInfo, setStorageInfo] = useState({ tracks: 0, playlists: 0, audioFiles: 0 });
  const [audioStats, setAudioStats] = useState({ totalFiles: 0, estimatedSizeMB: 0 });

  // Load storage information
  useEffect(() => {
    const loadStorageInfo = async () => {
      try {
        const [storage, audio] = await Promise.all([
          storageService.getStorageInfo(),
          audioStorageService.getAudioStorageStats()
        ]);
        
        setStorageInfo(storage);
        setAudioStats(audio);
      } catch (error) {
        console.error('Error loading storage info:', error);
      }
    };

    loadStorageInfo();
  }, []);

  return (
    <div className="flex-1 overflow-auto pb-20 p-4 space-y-6">
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
              <Slider
                id="volume"
                value={[masterVolume]}
                onValueChange={(value) => setMasterVolume(value[0])}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            <p className="text-sm text-muted-foreground">{masterVolume}%</p>
          </div>

          <Separator className="bg-white/10" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoplay">Autoplay</Label>
              <p className="text-sm text-muted-foreground">
                Automatically play next song when current ends
              </p>
            </div>
            <Switch
              id="autoplay"
              checked={autoPlay}
              onCheckedChange={setAutoPlay}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="crossfade">Crossfade</Label>
              <p className="text-sm text-muted-foreground">
                Smooth transitions between tracks
              </p>
            </div>
            <Switch
              id="crossfade"
              checked={crossfade}
              onCheckedChange={setCrossfade}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="quality">High Quality Audio</Label>
              <p className="text-sm text-muted-foreground">
                Better audio quality, more storage usage
              </p>
            </div>
            <Switch
              id="quality"
              checked={highQuality}
              onCheckedChange={setHighQuality}
            />
          </div>
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
                <p className="text-muted-foreground">~{audioStats.estimatedSizeMB} MB</p>
              </div>
            </div>
            <div className="mt-3 p-2 rounded bg-primary/10 border border-primary/20">
              <p className="text-xs text-primary font-medium">
                ✓ All data saved locally for offline access
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div>
              <h4 className="font-medium">Clear All Data</h4>
              <p className="text-sm text-muted-foreground">
                Remove all songs, playlists, and settings from device
              </p>
            </div>
            <Button
              onClick={onClearAllData}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div>
              <h4 className="font-medium">Refresh Storage Info</h4>
              <p className="text-sm text-muted-foreground">
                Update storage statistics and cache
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                const [storage, audio] = await Promise.all([
                  storageService.getStorageInfo(),
                  audioStorageService.getAudioStorageStats()
                ]);
                setStorageInfo(storage);
                setAudioStats(audio);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Information */}
      <Card className="soundwave-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-primary" />
            <span>App Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Version</p>
              <p className="text-muted-foreground">1.0.0</p>
            </div>
            <div>
              <p className="font-medium">Build</p>
              <p className="text-muted-foreground">2024.01.15</p>
            </div>
            <div>
              <p className="font-medium">Platform</p>
              <p className="text-muted-foreground">Mobile (Capacitor)</p>
            </div>
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-muted-foreground">SoundWave Dark</p>
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              SoundWave - Built with ❤️ using React & TypeScript
            </p>
            <div className="flex justify-center items-center space-x-2 text-xs text-primary">
              <HardDrive className="h-3 w-3" />
              <span>Offline-First Mobile App</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};