import { videoStorage } from './videoStorage';
import { runOptionalImportStage } from './importDiagnostics';

const ARTWORK_SIZE = 512;
const SEEK_TIME = 0.5;

// In-memory cache so the lockscreen artwork is generated once per track.
const cache = new Map<string, string | null>();

interface ArtworkTrack {
  id: string;
  videoFilePath?: string;
}

/**
 * Captures a square thumbnail from the track's retained video.
 * Returns a JPEG data URL, or null when the track has no video or the
 * capture fails (callers fall back to the app icon).
 */
export async function getTrackArtwork(track: ArtworkTrack): Promise<string | null> {
  if (!track.videoFilePath) return null;
  if (cache.has(track.id)) return cache.get(track.id) ?? null;

  const artwork = await runOptionalImportStage('Thumbnail generation', () => captureSquareFrame(track.videoFilePath as string)) ?? null;
  cache.set(track.id, artwork);
  return artwork;
}

export function forgetTrackArtwork(trackId: string) {
  cache.delete(trackId);
}

async function captureSquareFrame(videoPath: string): Promise<string | null> {
  const url = await videoStorage.resolve(videoPath);
  const video = document.createElement('video');
  try {
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;

    await waitForEvent(video, 'loadedmetadata');
    video.currentTime = Math.min(SEEK_TIME, Math.max(0, (video.duration || 1) / 4));
    await waitForEvent(video, 'seeked');

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;

    // Center-crop to a square, like Spotify's square covers.
    const side = Math.min(width, height);
    const sx = (width - side) / 2;
    const sy = (height - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = ARTWORK_SIZE;
    canvas.height = ARTWORK_SIZE;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(video, sx, sy, side, side, 0, 0, ARTWORK_SIZE, ARTWORK_SIZE);

    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    videoStorage.release(url);
  }
}

function waitForEvent(video: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => cleanup(() => reject(new Error(`Timed out waiting for thumbnail ${event}`))), 8000);
    const onDone = () => cleanup(resolve);
    const onError = () => cleanup(() => reject(new Error(`Thumbnail video error ${video.error?.code ?? 'unknown'}: ${video.error?.message || event}`)));
    const cleanup = (settle: () => void) => {
      window.clearTimeout(timer);
      video.removeEventListener(event, onDone);
      video.removeEventListener('error', onError);
      settle();
    };
    video.addEventListener(event, onDone, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}
