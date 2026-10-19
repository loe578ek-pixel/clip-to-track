import type { Track } from '@/pages/Index';
import { detectOutroEndTime, type AudioBufferLike } from './outroDetector';

export type { AudioBufferLike };

/**
 * Import endpoint policy: cut only when the exact TikTok end jingle is
 * recognized by fingerprint (see outroDetector). The returned time is shared
 * by the extracted audio and the background video, so the beep and the logo
 * end card are removed together. Unrecognized endings are never cut.
 */
export function getImportEndTime(buffer: AudioBufferLike): number {
  return detectOutroEndTime(buffer);
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

/** Correct small clock drift without flushing the video decoder with a seek. */
export function getVideoSyncCorrection(audioTime: number, videoTime: number, audioRate: number, force = false) {
  const drift = audioTime - videoTime;
  return {
    seek: force || Math.abs(drift) > 0.75,
    playbackRate: audioRate * (Math.abs(drift) <= 0.05 ? 1 : drift > 0 ? 1.03 : 0.97),
  };
}
