import { expect, test } from 'bun:test';
import { resolveBackgroundTrack } from './backgroundTrack';

const video = { id: 'last', videoFilePath: 'video/last.mp4' };
test('idle Glass retains the last played video after reload', () => {
  expect(resolveBackgroundTrack(null, [video], 'last')).toEqual(video);
});
test('audio-only music retains last video instead of a blank background', () => {
  expect(resolveBackgroundTrack({ id: 'audio' }, [video], 'last')).toEqual(video);
});
test('a current video takes precedence over the previous video', () => {
  const current = { id: 'new', videoFilePath: 'video/new.mp4' };
  expect(resolveBackgroundTrack(current, [video], 'last')).toEqual(current);
});
test('deleted or never-played videos cannot become the idle background', () => {
  expect(resolveBackgroundTrack(null, [], 'last')).toBeNull();
  expect(resolveBackgroundTrack(null, [video], null)).toBeNull();
});