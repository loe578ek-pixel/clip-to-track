import type { Track } from '@/pages/Index';

export interface AudioBufferLike {
  duration: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

const OUTRO_SCAN_SECONDS = 12;
const OUTRO_MAX_TRIM_SECONDS = 8;
const WINDOW_SECONDS = 0.1;
const GAP_THRESHOLD = 0.15;
const JINGLE_THRESHOLD = 0.3;

/**
 * Detects where the TikTok outro (jingle/beep) starts and returns the time
 * where the real music ends. Strategy: in the last seconds, the music fades
 * (energy gap) and the jingle starts right after. We cut at the start of
 * that gap. When no clear gap+jingle pattern is found, nothing is cut.
 */
export function getImportEndTime(buffer: AudioBufferLike): number {
  const duration = buffer.duration;
  const sampleRate = buffer.sampleRate;
  if (!Number.isFinite(duration) || !Number.isFinite(sampleRate) || sampleRate <= 0) return duration;
  const scanSeconds = Math.min(OUTRO_SCAN_SECONDS, duration * 0.5);
  if (scanSeconds < 2) return duration;

  const data = buffer.getChannelData(0);
  const windowSize = Math.max(1, Math.floor(WINDOW_SECONDS * sampleRate));
  const scanStartSample = Math.max(0, Math.floor((duration - scanSeconds) * sampleRate));
  const windowCount = Math.floor((data.length - scanStartSample) / windowSize);
  if (windowCount < 10) return duration;

  const rms: number[] = new Array(windowCount);
  for (let w = 0; w < windowCount; w++) {
    const start = scanStartSample + w * windowSize;
    let sum = 0;
    for (let i = start; i < start + windowSize; i++) sum += data[i] * data[i];
    rms[w] = Math.sqrt(sum / windowSize);
  }

  // Reference energy = median of the first half of the scanned zone (the music body).
  const body = rms.slice(0, Math.floor(windowCount / 2)).sort((a, b) => a - b);
  const bodyMedian = body[Math.floor(body.length / 2)] || 0;
  if (bodyMedian <= 0) return duration;

  // Scan from the end: skip the trailing jingle (loud windows), then find the
  // quiet gap just before it. Cut at the start of that gap.
  let i = windowCount - 1;
  while (i >= 0 && rms[i] < bodyMedian * GAP_THRESHOLD) i--; // trailing silence
  let jingleEnd = i;
  while (i >= 0 && rms[i] >= bodyMedian * JINGLE_THRESHOLD) i--; // walk back over the jingle
  const jingleStart = i;
  if (jingleStart < 0 || jingleEnd <= jingleStart) return duration; // no loud outro found
  while (i >= 0 && rms[i] < bodyMedian * GAP_THRESHOLD) i--; // walk back over the gap
  const gapStart = i + 1;
  if (gapStart >= jingleStart) return duration; // no gap before the jingle

  const cutTime = (scanStartSample + gapStart * windowSize) / sampleRate;
  const trim = duration - cutTime;
  if (trim < 0.5 || trim > OUTRO_MAX_TRIM_SECONDS) return duration;
  return cutTime;
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
