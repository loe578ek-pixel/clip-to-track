import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Track, Playlist } from '@/pages/Index';

interface StorageData {
  tracks: Track[];
  playlists: Playlist[];
  trackRepeatCounts: Record<string, number>;
  likedTracks: string[];
  appSettings: Record<string, any>;
}

class StorageService {
  private readonly STORAGE_KEYS = {
    TRACKS: 'soundwave-tracks',
    PLAYLISTS: 'soundwave-playlists',
    REPEAT_COUNTS: 'soundwave-repeat-counts',
    LIKED_TRACKS: 'soundwave-liked-tracks',
    APP_SETTINGS: 'soundwave-app-settings'
  };

  private readonly AUDIO_DIR = 'soundwave-audio';

  /**
   * Save track metadata to preferences
   */
  async saveTracks(tracks: Track[]): Promise<void> {
    try {
      const tracksData = tracks.map(track => ({
        ...track,
        createdAt: track.createdAt.toISOString()
      }));
      
      await Preferences.set({
        key: this.STORAGE_KEYS.TRACKS,
        value: JSON.stringify(tracksData)
      });
      
      console.log('Tracks saved successfully');
    } catch (error) {
      console.error('Error saving tracks:', error);
      throw error;
    }
  }

  /**
   * Load track metadata from preferences
   */
  async loadTracks(): Promise<Track[]> {
    try {
      const { value } = await Preferences.get({ key: this.STORAGE_KEYS.TRACKS });
      
      if (!value) return [];
      
      const tracksData = JSON.parse(value);
      return tracksData.map((track: any) => ({
        ...track,
        createdAt: new Date(track.createdAt)
      }));
    } catch (error) {
      console.error('Error loading tracks:', error);
      return [];
    }
  }

  /**
   * Save playlists to preferences
   */
  async savePlaylists(playlists: Playlist[]): Promise<void> {
    try {
      const playlistsData = playlists.map(playlist => ({
        ...playlist,
        createdAt: playlist.createdAt.toISOString()
      }));
      
      await Preferences.set({
        key: this.STORAGE_KEYS.PLAYLISTS,
        value: JSON.stringify(playlistsData)
      });
      
      console.log('Playlists saved successfully');
    } catch (error) {
      console.error('Error saving playlists:', error);
      throw error;
    }
  }

  /**
   * Load playlists from preferences
   */
  async loadPlaylists(): Promise<Playlist[]> {
    try {
      const { value } = await Preferences.get({ key: this.STORAGE_KEYS.PLAYLISTS });
      
      if (!value) return [];
      
      const playlistsData = JSON.parse(value);
      return playlistsData.map((playlist: any) => ({
        ...playlist,
        createdAt: new Date(playlist.createdAt)
      }));
    } catch (error) {
      console.error('Error loading playlists:', error);
      return [];
    }
  }

  /**
   * Save track repeat counts
   */
  async saveRepeatCounts(repeatCounts: Record<string, number>): Promise<void> {
    try {
      await Preferences.set({
        key: this.STORAGE_KEYS.REPEAT_COUNTS,
        value: JSON.stringify(repeatCounts)
      });
      
      console.log('Repeat counts saved successfully');
    } catch (error) {
      console.error('Error saving repeat counts:', error);
      throw error;
    }
  }

  /**
   * Load track repeat counts
   */
  async loadRepeatCounts(): Promise<Record<string, number>> {
    try {
      const { value } = await Preferences.get({ key: this.STORAGE_KEYS.REPEAT_COUNTS });
      
      if (!value) return {};
      
      return JSON.parse(value);
    } catch (error) {
      console.error('Error loading repeat counts:', error);
      return {};
    }
  }

  /**
   * Save liked tracks
   */
  async saveLikedTracks(likedTracks: string[]): Promise<void> {
    try {
      await Preferences.set({
        key: this.STORAGE_KEYS.LIKED_TRACKS,
        value: JSON.stringify(likedTracks)
      });
      
      console.log('Liked tracks saved successfully');
    } catch (error) {
      console.error('Error saving liked tracks:', error);
      throw error;
    }
  }

  /**
   * Load liked tracks
   */
  async loadLikedTracks(): Promise<string[]> {
    try {
      const { value } = await Preferences.get({ key: this.STORAGE_KEYS.LIKED_TRACKS });
      
      if (!value) return [];
      
      return JSON.parse(value);
    } catch (error) {
      console.error('Error loading liked tracks:', error);
      return [];
    }
  }

  /**
   * Save app settings
   */
  async saveAppSettings(settings: Record<string, any>): Promise<void> {
    try {
      await Preferences.set({
        key: this.STORAGE_KEYS.APP_SETTINGS,
        value: JSON.stringify(settings)
      });
      
      console.log('App settings saved successfully');
    } catch (error) {
      console.error('Error saving app settings:', error);
      throw error;
    }
  }

  /**
   * Load app settings
   */
  async loadAppSettings(): Promise<Record<string, any>> {
    try {
      const { value } = await Preferences.get({ key: this.STORAGE_KEYS.APP_SETTINGS });
      
      if (!value) return {};
      
      return JSON.parse(value);
    } catch (error) {
      console.error('Error loading app settings:', error);
      return {};
    }
  }

  /**
   * Save audio file to device storage and return local file path
   */
  async saveAudioFile(blob: Blob, fileName: string): Promise<string> {
    try {
      // Convert blob to base64
      const base64Data = await this.blobToBase64(blob);
      
      // Create audio directory if it doesn't exist
      await this.ensureAudioDirectoryExists();
      
      // Generate unique filename to avoid conflicts
      const uniqueFileName = `${Date.now()}_${fileName}`;
      
      // Save file to device storage
      const result = await Filesystem.writeFile({
        path: `${this.AUDIO_DIR}/${uniqueFileName}`,
        data: base64Data,
        directory: Directory.Data
      });
      
      console.log('Audio file saved successfully:', result.uri);
      return result.uri;
    } catch (error) {
      console.error('Error saving audio file:', error);
      throw error;
    }
  }

  /**
   * Get audio file content as blob for playback
   */
  async getAudioFile(filePath: string): Promise<string> {
    try {
      // Extract filename from full path
      const fileName = filePath.split('/').pop() || '';
      
      const result = await Filesystem.readFile({
        path: `${this.AUDIO_DIR}/${fileName}`,
        directory: Directory.Data
      });
      
      // Return the local file URI for audio playback
      return `data:audio/mpeg;base64,${result.data}`;
    } catch (error) {
      console.error('Error reading audio file:', error);
      // Return original path as fallback
      return filePath;
    }
  }

  /**
   * Delete audio file from device storage
   */
  async deleteAudioFile(filePath: string): Promise<void> {
    try {
      const fileName = filePath.split('/').pop() || '';
      
      await Filesystem.deleteFile({
        path: `${this.AUDIO_DIR}/${fileName}`,
        directory: Directory.Data
      });
      
      console.log('Audio file deleted successfully');
    } catch (error) {
      console.error('Error deleting audio file:', error);
      // Don't throw error for missing files
    }
  }

  /**
   * Clear all stored data (for app reset)
   */
  async clearAllData(): Promise<void> {
    try {
      // Clear all preferences
      await Promise.all([
        Preferences.remove({ key: this.STORAGE_KEYS.TRACKS }),
        Preferences.remove({ key: this.STORAGE_KEYS.PLAYLISTS }),
        Preferences.remove({ key: this.STORAGE_KEYS.REPEAT_COUNTS }),
        Preferences.remove({ key: this.STORAGE_KEYS.LIKED_TRACKS }),
        Preferences.remove({ key: this.STORAGE_KEYS.APP_SETTINGS })
      ]);
      
      // Clear audio directory
      await this.clearAudioFiles();
      
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  /**
   * Clear only audio files directory (keep preferences)
   */
  async clearAudioFiles(): Promise<void> {
    try {
      const audioFiles = await Filesystem.readdir({
        path: this.AUDIO_DIR,
        directory: Directory.Data
      });
      
      await Promise.all(
        audioFiles.files.map(file => 
          Filesystem.deleteFile({
            path: `${this.AUDIO_DIR}/${file.name}`,
            directory: Directory.Data
          })
        )
      );
      
      console.log('Audio files cleared successfully');
    } catch (error) {
      // Audio directory might not exist, which is fine
      console.log('No audio files to clear or directory does not exist');
    }
  }

  /**
   * Get storage info for debugging
   */
  async getStorageInfo(): Promise<{ tracks: number; playlists: number; audioFiles: number }> {
    try {
      const tracks = await this.loadTracks();
      const playlists = await this.loadPlaylists();
      
      let audioFileCount = 0;
      try {
        const audioFiles = await Filesystem.readdir({
          path: this.AUDIO_DIR,
          directory: Directory.Data
        });
        audioFileCount = audioFiles.files.length;
      } catch (error) {
        // Directory might not exist
      }
      
      return {
        tracks: tracks.length,
        playlists: playlists.length,
        audioFiles: audioFileCount
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { tracks: 0, playlists: 0, audioFiles: 0 };
    }
  }

  // Private helper methods

  private async ensureAudioDirectoryExists(): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: this.AUDIO_DIR,
        directory: Directory.Data,
        recursive: true
      });
    } catch (error) {
      // Directory might already exist, which is fine
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix to get just the base64 data
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Migrate from localStorage to Capacitor storage (one-time migration)
   */
  async migrateFromLocalStorage(): Promise<void> {
    try {
      console.log('Starting migration from localStorage...');
      
      // Check if we have any existing Capacitor data
      const existingTracks = await this.loadTracks();
      if (existingTracks.length > 0) {
        console.log('Capacitor data already exists, skipping migration');
        return;
      }
      
      // Migrate tracks
      const localTracks = localStorage.getItem('soundwave-tracks');
      if (localTracks) {
        const parsedTracks = JSON.parse(localTracks).map((track: any) => ({
          ...track,
          createdAt: new Date(track.createdAt)
        }));
        await this.saveTracks(parsedTracks);
        console.log(`Migrated ${parsedTracks.length} tracks`);
      }
      
      // Migrate playlists
      const localPlaylists = localStorage.getItem('soundwave-playlists');
      if (localPlaylists) {
        const parsedPlaylists = JSON.parse(localPlaylists).map((playlist: any) => ({
          ...playlist,
          createdAt: new Date(playlist.createdAt)
        }));
        await this.savePlaylists(parsedPlaylists);
        console.log(`Migrated ${parsedPlaylists.length} playlists`);
      }
      
      // Migrate repeat counts
      const localRepeatCounts = localStorage.getItem('soundwave-repeat-counts');
      if (localRepeatCounts) {
        await this.saveRepeatCounts(JSON.parse(localRepeatCounts));
        console.log('Migrated repeat counts');
      }
      
      // Migrate liked tracks
      const localLikedTracks = localStorage.getItem('soundwave-liked-tracks');
      if (localLikedTracks) {
        await this.saveLikedTracks(JSON.parse(localLikedTracks));
        console.log('Migrated liked tracks');
      }
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error during migration:', error);
      // Don't throw error - app should still work
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();