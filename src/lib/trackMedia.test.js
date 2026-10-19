import { describe, expect, test } from 'bun:test';
import { getImportEndTime, getVideoSyncTime, getVideoSyncCorrection, serializeTrack } from './trackMedia';

const track = {
  id: 'legacy', title: 'Existing song', duration: 18, audioUrl: 'blob:temporary',
  originalFileName: 'song.mp4', createdAt: new Date('2026-10-17T00:00:00Z'),
  localFilePath: 'soundwave-audio/song.wav', fileSize: 1234,
};

import { OUTRO_REFERENCE_B64, OUTRO_REFERENCE_RATE } from './outroReference';
import { OUTRO_VISUAL_LEAD_SECONDS } from './outroDetector';

function referenceJingle() {
  const bin = Buffer.from(OUTRO_REFERENCE_B64, 'base64');
  return Array.from(bin, (b) => (b > 127 ? b - 256 : b) / 127);
}

// Deterministic pseudo-random "music" so tests never flake.
function noise(seed) {
  let x = seed;
  return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff - 0.5; };
}

// Builds a stereo-like AudioBuffer at `sampleRate`: music, optional real TikTok
// jingle starting `jingleFromEnd` seconds before the end, then silence.
function fakeBuffer({ duration = 30, sampleRate = 44100, jingleFromEnd = null, outroSound = null }) {
  const length = Math.floor(duration * sampleRate);
  const data = new Float32Array(length);
  const rand = noise(7);
  const musicEnd = jingleFromEnd == null && outroSound == null ? length : Math.floor((duration - (jingleFromEnd ?? 4)) * sampleRate);
  for (let i = 0; i < musicEnd; i++) data[i] = 0.3 * rand() + 0.2 * Math.sin(i / sampleRate * 2 * Math.PI * 220);
  if (jingleFromEnd != null) {
    const ref = referenceJingle();
    const ratio = sampleRate / OUTRO_REFERENCE_RATE;
    for (let i = 0; i < ref.length * ratio && musicEnd + i < length; i++) {
      data[musicEnd + i] = 0.8 * ref[Math.min(ref.length - 1, Math.floor(i / ratio))];
    }
  } else if (outroSound) {
    for (let i = musicEnd; i < Math.min(length, musicEnd + sampleRate); i++) data[i] = outroSound(i / sampleRate);
  }
  return { duration: length / sampleRate, sampleRate, numberOfChannels: 1, getChannelData: () => data };
}

describe('TikTok outro recognition', () => {
  test('cuts audio and video just before the recognized TikTok jingle (4 s outro)', () => {
    const end = getImportEndTime(fakeBuffer({ duration: 30, jingleFromEnd: 4 }));
    expect(end).toBeCloseTo(26 - OUTRO_VISUAL_LEAD_SECONDS, 1);
  });
  test('also recognizes the older short 2 s outro at 48 kHz', () => {
    const end = getImportEndTime(fakeBuffer({ duration: 15, sampleRate: 48000, jingleFromEnd: 2.07 }));
    expect(end).toBeCloseTo(15 - 2.07 - OUTRO_VISUAL_LEAD_SECONDS, 1);
  });
  test('never cuts a video without the TikTok jingle', () => {
    expect(getImportEndTime(fakeBuffer({ duration: 30 }))).toBe(30);
  });
  test('never cuts a different loud ending sound (old heuristic false positive)', () => {
    const beep = (t) => 0.6 * Math.sin(2 * Math.PI * 880 * t);
    expect(getImportEndTime(fakeBuffer({ duration: 30, outroSound: beep }))).toBe(30);
  });
  test('ignores the jingle when it is not at the end of the file', () => {
    expect(getImportEndTime(fakeBuffer({ duration: 30, jingleFromEnd: 7.5 }))).toBe(30);
  });
  test('never cuts very short clips', () => {
    expect(getImportEndTime(fakeBuffer({ duration: 1.2, jingleFromEnd: 0.9 }))).toBe(1.2);
  });
});

describe('offline video metadata', () => {
  test('old audio-only tracks require no video fields', () => {
    const saved = serializeTrack(track);
    expect(saved.localFilePath).toBe('soundwave-audio/song.wav');
    expect(saved.videoFilePath).toBeUndefined();
    expect('audioUrl' in saved).toBe(false);
  });
  test('retained video path, type and real size survive metadata serialization', () => {
    const saved = JSON.parse(JSON.stringify(serializeTrack({ ...track,
      videoFilePath: 'tkplaylist-video/original.mp4', videoMimeType: 'video/mp4', videoFileSize: 5678,
    })));
    expect(saved.videoFilePath).toBe('tkplaylist-video/original.mp4');
    expect(saved.videoMimeType).toBe('video/mp4');
    expect(saved.videoFileSize).toBe(5678);
    expect(saved.fileSize).toBe(1234);
  });
});

describe('video follows audio', () => {
  test('small clock drift adjusts speed instead of causing repeated decoder seeks', () => {
    expect(getVideoSyncCorrection(10, 9.8, 1)).toEqual({ seek: false, playbackRate: 1.03 });
    expect(getVideoSyncCorrection(10, 10.2, 1)).toEqual({ seek: false, playbackRate: 0.97 });
    expect(getVideoSyncCorrection(10, 10.02, 1)).toEqual({ seek: false, playbackRate: 1 });
  });
  test('large drift and explicit scrubbing force synchronization', () => {
    expect(getVideoSyncCorrection(10, 8, 1).seek).toBe(true);
    expect(getVideoSyncCorrection(10, 9.9, 1, true).seek).toBe(true);
  });
  test('detected outro uses the same endpoint for video and extracted audio', () => {
    const endpoint = getImportEndTime(fakeBuffer({ duration: 30, jingleFromEnd: 4 }));
    expect(endpoint).toBeLessThan(26);
    expect(getVideoSyncTime(29, endpoint, 30)).toBe(endpoint);
  });
  test('seek and repeat use the audio time', () => {
    expect(getVideoSyncTime(12, 18, 23)).toBe(12);
    expect(getVideoSyncTime(0, 18, 23)).toBe(0);
  });
  test('video cannot run past the audio endpoint', () => {
    expect(getVideoSyncTime(20, 18, 23)).toBe(18);
  });
});
