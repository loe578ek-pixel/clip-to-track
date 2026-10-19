import { videoStorage } from './videoStorage';
import { runOptionalImportStage } from './importDiagnostics';

const ARTWORK_SIZE = 512;
const SEEK_FRACTIONS = [0.25, 0.5, 0.1];

// In-memory cache so the lockscreen artwork is generated once per track.
const cache = new Map<string, string | null>();
let fallbackPromise: Promise<string | null> | null = null;

interface ArtworkTrack {
  id: string;
  videoFilePath?: string;
}

/**
 * Returns a square JPEG data URL for the lockscreen: a frame of the track's
 * retained video, or the app icon when there is no usable frame. Data URLs are
 * used because iOS cannot load lockscreen artwork from the app's local scheme.
 */
export async function getTrackArtwork(track: ArtworkTrack): Promise<string | null> {
  if (cache.has(track.id)) return cache.get(track.id) ?? getFallbackArtwork();
  const frame = track.videoFilePath
    ? await runOptionalImportStage('Thumbnail generation', () => captureSquareFrame(track.videoFilePath as string)) ?? null
    : null;
  cache.set(track.id, frame);
  return frame ?? getFallbackArtwork();
}

export function forgetTrackArtwork(trackId: string) {
  cache.delete(trackId);
}

/** App icon downscaled to a small JPEG data URL (cached). */
export function getFallbackArtwork(): Promise<string | null> {
  if (!fallbackPromise) {
    fallbackPromise = loadIconDataUrl().catch(() => null);
  }
  return fallbackPromise;
}

async function loadIconDataUrl(): Promise<string | null> {
  const img = new Image();
  img.src = '/app-icon.png';
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = ARTWORK_SIZE;
  canvas.height = ARTWORK_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(img, 0, 0, ARTWORK_SIZE, ARTWORK_SIZE);
  return canvas.toDataURL('image/jpeg', 0.9);
}

/** True when the frame is (almost) uniformly black, e.g. not yet decoded. */
export function isMostlyBlack(pixels: Uint8ClampedArray, threshold = 16): boolean {
  let total = 0;
  let count = 0;
  for (let i = 0; i < pixels.length; i += 16) {
    total += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    count++;
  }
  return count === 0 || total / count < threshold;
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
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;

    const side = Math.min(width, height);
    const sx = (width - side) / 2;
    const sy = (height - side) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = ARTWORK_SIZE;
    canvas.height = ARTWORK_SIZE;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    // Try several moments: intros are often black, and iOS may paint a
    // black frame right after seeking.
    for (const fraction of SEEK_FRACTIONS) {
      video.currentTime = duration * fraction;
      await waitForEvent(video, 'seeked');
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      context.drawImage(video, sx, sy, side, side, 0, 0, ARTWORK_SIZE, ARTWORK_SIZE);
      const pixels = context.getImageData(0, 0, ARTWORK_SIZE, ARTWORK_SIZE).data;
      if (!isMostlyBlack(pixels)) return canvas.toDataURL('image/jpeg', 0.85);
    }
    return null;
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
