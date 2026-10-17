import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import type { Track } from '@/pages/Index';
import { resolveBackgroundTrack } from '@/lib/backgroundTrack';

const KEY = 'tkplaylist-last-played-video';

export function useBackgroundTrack(current: Track | null, tracks: Track[], audio: HTMLAudioElement | null) {
  const [lastId, setLastId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Preferences.get({ key: KEY }).then(({ value }) => {
      if (!cancelled) setLastId(previous => previous ?? value);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!current?.videoFilePath || !audio) return;
    const remember = () => {
      setLastId(current.id);
      void Preferences.set({ key: KEY, value: current.id }).catch(() => {});
    };
    if (!audio.paused) remember();
    audio.addEventListener('playing', remember);
    return () => audio.removeEventListener('playing', remember);
  }, [current?.id, current?.videoFilePath, audio]);

  return resolveBackgroundTrack(current, tracks, lastId);
}