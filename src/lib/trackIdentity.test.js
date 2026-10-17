import { expect, test } from 'bun:test';
import { assignImportIdentity, getTrackArtist, resolveImportIdentity } from './trackIdentity';
import { serializeTrack } from './trackMedia';

const track = { id: 'new', title: '', duration: 4, audioUrl: '', originalFileName: '123.mp4', createdAt: new Date() };

test('available title and creator are preserved', () => {
  expect(resolveImportIdentity({ title: ' Evening song ', artist: '@leonard' })).toEqual({ title: 'Evening song', artist: '@leonard' });
});
test('missing title receives successive Track numbers without collisions', () => {
  const first = assignImportIdentity(track, []);
  expect(first.title).toBe('Track 1');
  expect(assignImportIdentity(track, [first]).title).toBe('Track 2');
});
test('missing creator uses TKPlaylist without discarding a known title', () => {
  expect(resolveImportIdentity({ title: 'Evening song' })).toEqual({ title: 'Evening song', artist: 'TKPlaylist' });
  expect(getTrackArtist({})).toBe('TKPlaylist');
});
test('missing title does not discard a known creator', () => {
  expect(assignImportIdentity({ ...track, ...resolveImportIdentity({ artist: '@leonard' }) }, []).artist).toBe('@leonard');
});
test('creator survives offline serialization', () => {
  expect(JSON.parse(JSON.stringify(serializeTrack({ ...track, artist: '@leonard' }))).artist).toBe('@leonard');
});