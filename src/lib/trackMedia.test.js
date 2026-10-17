import { describe, expect, test } from 'bun:test';
import { getImportEndTime, getVideoSyncTime, serializeTrack } from './trackMedia';

const track = {
  id: 'legacy', title: 'Existing song', duration: 18, audioUrl: 'blob:temporary',
  originalFileName: 'song.mp4', createdAt: new Date('2026-10-17T00:00:00Z'),
  localFilePath: 'soundwave-audio/song.wav', fileSize: 1234,
};

describe('import timing policy', () => {
  test('new imports keep every second until recognition is approved', () => {
    for (const duration of [4, 5, 18, 27, 31.234]) expect(getImportEndTime(duration)).toBe(duration);
  });
  test('existing trimmed timing stays untouched when saving metadata', () => {
    expect(serializeTrack(track).duration).toBe(18);
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
  test('seek and repeat use the audio time', () => {
    expect(getVideoSyncTime(12, 18, 23)).toBe(12);
    expect(getVideoSyncTime(0, 18, 23)).toBe(0);
  });
  test('video cannot run past the audio endpoint', () => {
    expect(getVideoSyncTime(20, 18, 23)).toBe(18);
  });
});