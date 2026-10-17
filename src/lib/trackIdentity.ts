import type { Track } from '@/pages/Index';

function cleanTag(value?: string): string | undefined {
  return value?.replace(/[\u0000-\u001f\u007f]/g, ' ').trim() || undefined;
}

export function resolveImportIdentity(tags: { title?: string; artist?: string }) {
  return { title: cleanTag(tags.title) || '', artist: cleanTag(tags.artist) || 'TKPlaylist' };
}

export function getTrackArtist(track: { artist?: string }): string {
  return cleanTag(track.artist) || 'TKPlaylist';
}

export function assignImportIdentity(track: Track, existing: Pick<Track, 'title'>[]): Track {
  const used = new Set(existing.map(item => item.title));
  let number = 1;
  while (used.has(`Track ${number}`)) number++;
  return { ...track, title: track.title.trim() || `Track ${number}`, artist: getTrackArtist(track) };
}