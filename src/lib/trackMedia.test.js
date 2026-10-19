import { describe, expect, test } from 'bun:test';
import { getImportEndTime, getVideoSyncTime, getVideoSyncCorrection, serializeTrack } from './trackMedia';

const track = {
  id: 'legacy', title: 'Existing song', duration: 18, audioUrl: 'blob:temporary',
  originalFileName: 'song.mp4', createdAt: new Date('2026-10-17T00:00:00Z'),
  localFilePath: 'soundwave-audio/song.wav', fileSize: 1234,
};

// Builds a fake mono AudioBuffer: music at `musicLevel`, then `gapSeconds` of
// silence, then a loud `jingleSeconds` outro.
function fakeBuffer({ duration = 30, musicLevel = 0.5, gapSeconds = 0, jingleSeconds = 0, jingleLevel = 0.6, sampleRate = 1000 }) {
  const length = Math.floor(duration * sampleRate);
  const data = new Float32Array(length);
  const jingleStart = length - Math.floor(jingleSeconds * sampleRate);
  const gapStart = jingleStart - Math.floor(gapSeconds * sampleRate);
  for (let i = 0; i < length; i++) {
    if (i >= jingleStart) data[i] = jingleLevel;
    else if (i >= gapStart) data[i] = 0;
    else data[i] = musicLevel;
  }
  return { duration, sampleRate, getChannelData: () => data };
}

describe('outro detection', () => {
  test('cuts at the start of the gap before a loud jingle', () => {
    const buffer = fakeBuffer({ duration: 30, gapSeconds: 1, jingleSeconds: 3 });
    const end = getImportEndTime(buffer);
    expect(end).toBeGreaterThan(25);
    expect(end).toBeLessThanOrEqual(26.5);
  });
  test('keeps the full track when there is no outro', () => {
    const buffer = fakeBuffer({ duration: 30 });
    expect(getImportEndTime(buffer)).toBe(30);
  });
  test('keeps the full track when music plays until the very end', () => {
    const buffer = fakeBuffer({ duration: 30, jingleSeconds: 0, gapSeconds: 0 });
    expect(getImportEndTime(buffer)).toBe(30);
  });
  test('never cuts very short clips', () => {
    const buffer = fakeBuffer({ duration: 3, gapSeconds: 0.5, jingleSeconds: 1 });
    expect(getImportEndTime(buffer)).toBe(3);
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
    const endpoint = getImportEndTime(fakeBuffer({ duration: 30, gapSeconds: 1, jingleSeconds: 3 }));
    expect(endpoint).toBe(26);
    expect(getVideoSyncTime(29, endpoint, 30)).toBe(26);
  });
  test('seek and repeat use the audio time', () => {
    expect(getVideoSyncTime(12, 18, 23)).toBe(12);
    expect(getVideoSyncTime(0, 18, 23)).toBe(0);
  });
  test('video cannot run past the audio endpoint', () => {
    expect(getVideoSyncTime(20, 18, 23)).toBe(18);
  });
});
