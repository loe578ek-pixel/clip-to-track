import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { toast } from 'sonner';

export type DisplayMode = 'classic' | 'glass';
const KEY = 'tkplaylist-display-mode';

export function useDisplayMode() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('classic');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Preferences.get({ key: KEY }).then(({ value }) => {
      if (!cancelled) {
        setDisplayMode(value === 'glass' ? 'glass' : 'classic');
        setReady(true);
      }
    }).catch(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const changeDisplayMode = async (mode: DisplayMode) => {
    if (!ready) return;
    const previous = displayMode;
    setDisplayMode(mode);
    try {
      await Preferences.set({ key: KEY, value: mode });
    } catch {
      setDisplayMode(previous);
      toast.error('Could not save display mode. Please try again.');
    }
  };

  useEffect(() => {
    document.documentElement.dataset.displayMode = displayMode;
    return () => { delete document.documentElement.dataset.displayMode; };
  }, [displayMode]);

  return { displayMode, changeDisplayMode, displayModeReady: ready };
}