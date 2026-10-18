import { describe, expect, test, mock } from 'bun:test';
import { normalizeNativeFilePath, ImportStageError } from './importDiagnostics';

let copyFails = false;
let decodeFails = false;
let audioSaveFails = false;
const copied = [];
const savedAudio = [];
mock.module('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
mock.module('./videoStorage', () => ({ videoStorage: {
  save: async (_file, id, path) => {
    copied.push(path);
    if (copyFails) throw new Error('Native copy permission denied');
    return `tkplaylist-video/${id}.mp4`;
  },
  delete: async () => {},
} }));
mock.module('./audioStorage', () => ({ audioStorageService: {
  saveAudioTrack: async (_blob, metadata) => {
    if (audioSaveFails) throw new Error('No space left on device');
    savedAudio.push(metadata);
    return { ...metadata, audioUrl: 'blob:audio', localFilePath: 'soundwave-audio/test.wav' };
  },
  deleteAudioTrack: async () => {},
} }));
globalThis.window = { AudioContext: class {
  async decodeAudioData() {
    if (decodeFails) throw new Error('EncodingError: Unsupported codec');
    return { duration: 2, sampleRate: 8, length: 16, numberOfChannels: 1,
      getChannelData: () => new Float32Array(16) };
  }
  async close() {}
}, dispatchEvent: () => {} };
const { extractAudioFromVideo } = await import('./audioProcessor');
const file = new File(['test'], 'video.mp4', { type: 'video/mp4' });

describe('native import regression', () => {
  test('video copy failure still imports persistent audio without video metadata', async () => {
    copyFails = true;
    const track = await extractAudioFromVideo(file, () => {}, 'file:///tmp/video.mp4');
    expect(track.localFilePath).toBe('soundwave-audio/test.wav');
    expect(track.videoFilePath).toBeUndefined();
    expect(track.videoFileSize).toBeUndefined();
    expect(track.duration).toBe(2);
    copyFails = false;
  });
  test('successful native copy retains original source and persistent video path', async () => {
    const track = await extractAudioFromVideo(file, () => {}, 'file:///tmp/original.mp4');
    expect(copied.at(-1)).toBe('file:///tmp/original.mp4');
    expect(track.videoFilePath).toBe(`tkplaylist-video/${track.id}.mp4`);
    expect(savedAudio.at(-1).videoFileSize).toBe(file.size);
  });
  test('audio decoder failure exposes its exact stage and error', async () => {
    decodeFails = true;
    await expect(extractAudioFromVideo(file, () => {}, '/tmp/video.mp4'))
      .rejects.toThrow('Audio decoding: EncodingError: Unsupported codec');
    decodeFails = false;
  });
  test('mandatory audio save exposes the original filesystem error', async () => {
    audioSaveFails = true;
    await expect(extractAudioFromVideo(file, () => {}, '/tmp/video.mp4'))
      .rejects.toThrow('Audio saving: No space left on device');
    audioSaveFails = false;
  });
  test('native paths accept file URLs and absolute paths, preserving escaped characters', () => {
    expect(normalizeNativeFilePath('/var/mobile/My video.mp4')).toBe('file:///var/mobile/My%20video.mp4');
    expect(normalizeNativeFilePath('file:///var/mobile/My%20video.mp4')).toBe('file:///var/mobile/My%20video.mp4');
    expect(() => normalizeNativeFilePath('https://localhost/_capacitor_file_/tmp/a.mp4')).toThrow('absolute native file path');
  });
  test('plugin error objects retain message and code in diagnostics', () => {
    expect(new ImportStageError('Native video copy', { message: 'File not found', code: 'OS-PLUG-FILE-0008' }).message)
      .toBe('Native video copy: File not found (code: OS-PLUG-FILE-0008)');
  });
});