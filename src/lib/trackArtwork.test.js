import { describe, expect, test, mock } from 'bun:test';

mock.module('./videoStorage', () => ({ videoStorage: {} }));
mock.module('./importDiagnostics', () => ({ runOptionalImportStage: async (_n, fn) => fn() }));
const { isMostlyBlack } = await import('./trackArtwork');

const frame = (value) => new Uint8ClampedArray(64 * 4).fill(value);

describe('lockscreen artwork frame check', () => {
  test('a black frame is rejected so the app icon is used instead', () => {
    expect(isMostlyBlack(frame(0))).toBe(true);
  });

  test('a normal video frame is kept', () => {
    expect(isMostlyBlack(frame(120))).toBe(false);
  });
});
