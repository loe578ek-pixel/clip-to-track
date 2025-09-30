import { storageService } from './storageService';
import { Track } from '@/pages/Index';

/**
 * Enhanced audio storage service for handling audio file persistence
 */
export class AudioStorageService {
  
  /**
   * Save audio blob to device storage and return track with local path
   */
  async saveAudioTrack(
    audioBlob: Blob, 
    trackData: Omit<Track, 'audioUrl' | 'localFilePath'>
  ): Promise<Track> {
    try {
      console.log('Saving audio track to device storage...');
      
      // Generate filename from original filename or title
      const sanitizedFileName = this.sanitizeFileName(trackData.originalFileName || trackData.title);
      const fileName = `${trackData.id}_${sanitizedFileName}`;
      
      // Save audio file to device storage
      const localFilePath = await storageService.saveAudioFile(audioBlob, fileName);
      
      // Create data URL for immediate playback
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const track: Track = {
        ...trackData,
        audioUrl,
        localFilePath
      };
      
      console.log(`Audio track saved with local path: ${localFilePath}`);
      return track;
      
    } catch (error) {
      console.error('Error saving audio track:', error);
      
      // Fallback to blob URL only (no persistence)
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return {
        ...trackData,
        audioUrl
      };
    }
  }

  /**
   * Load audio track for playback (handles both local and remote sources)
   */
  async loadAudioTrack(track: Track): Promise<Track> {
    // If we have a local file path, try to load from local storage
    if (track.localFilePath) {
      try {
        const localAudioUrl = await storageService.getAudioFile(track.localFilePath);
        return {
          ...track,
          audioUrl: localAudioUrl
        };
      } catch (error) {
        console.warn(`Could not load local audio for track ${track.id}:`, error);
        // Fall back to original audio URL
      }
    }
    
    // Return track with original audio URL
    return track;
  }

  /**
   * Delete audio track from storage
   */
  async deleteAudioTrack(track: Track): Promise<void> {
    if (track.localFilePath) {
      try {
        await storageService.deleteAudioFile(track.localFilePath);
        console.log(`Deleted audio file for track: ${track.title}`);
      } catch (error) {
        console.warn(`Could not delete audio file for track ${track.id}:`, error);
      }
    }
    
    // Revoke blob URL if it exists
    if (track.audioUrl && track.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(track.audioUrl);
    }
  }

  /**
   * Get storage statistics for all audio files
   */
  async getAudioStorageStats(): Promise<{
    totalFiles: number;
    estimatedSizeMB: number;
  }> {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      
      let totalFiles = 0;
      let totalBytes = 0;
      
      try {
        // Read all files in audio directory
        const result = await Filesystem.readdir({
          path: 'audio',
          directory: Directory.Data
        });
        
        totalFiles = result.files.length;
        
        // Get actual file sizes
        for (const file of result.files) {
          try {
            const stat = await Filesystem.stat({
              path: `audio/${file.name}`,
              directory: Directory.Data
            });
            totalBytes += stat.size;
          } catch (error) {
            // Skip if file stat fails
            console.error('Error getting file size:', error);
          }
        }
      } catch (error) {
        // Directory might not exist yet
        console.log('Audio directory not found or empty');
      }
      
      // Convert bytes to MB
      const estimatedSizeMB = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
      
      return {
        totalFiles,
        estimatedSizeMB
      };
    } catch (error) {
      console.error('Error getting audio storage stats:', error);
      return {
        totalFiles: 0,
        estimatedSizeMB: 0
      };
    }
  }

  /**
   * Cleanup orphaned audio files (files not referenced by any track)
   */
  async cleanupOrphanedFiles(tracks: Track[]): Promise<number> {
    try {
      // This would require implementing directory listing and cross-referencing
      // For now, just return 0 as a placeholder
      console.log('Audio cleanup not yet implemented');
      return 0;
    } catch (error) {
      console.error('Error during audio cleanup:', error);
      return 0;
    }
  }

  // Private helper methods

  private sanitizeFileName(fileName: string): string {
    // Remove or replace invalid filename characters
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid chars with underscore
      .replace(/\s+/g, '_')           // Replace spaces with underscore
      .substring(0, 100);             // Limit length
  }
}

// Export singleton instance
export const audioStorageService = new AudioStorageService();