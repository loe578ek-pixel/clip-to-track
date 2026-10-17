export function resolveBackgroundTrack<T extends { id: string; videoFilePath?: string }>(
  current: T | null, tracks: T[], lastPlayedId: string | null,
): T | null {
  if (current?.videoFilePath) return current;
  return tracks.find(track => track.id === lastPlayedId && track.videoFilePath) ?? null;
}