import type { Track } from '@/pages/Index';

/** Original timing is retained until reference-based jingle recognition is enabled. */
export function getImportEndTime(originalDuration: number): number {
  return originalDuration;
}

export function serializeTrack(track: Track) {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    originalFileName: track.originalFileName,
    createdAt: track.createdAt.toISOString(),
    repeatCount: track.repeatCount,
    localFilePath: track.localFilePath,
    isLiked: track.isLiked,
    fileSize: track.fileSize,
    videoFilePath: track.videoFilePath,
    videoMimeType: track.videoMimeType,
    videoFileSize: track.videoFileSize,
  };
}

export function getVideoSyncTime(audioTime: number, audioDuration: number, videoDuration: number): number {
  return Math.max(0, Math.min(audioTime, audioDuration, videoDuration));
}