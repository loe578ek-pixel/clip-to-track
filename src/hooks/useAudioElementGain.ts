import { useEffect, useRef } from "react";

/**
 * On iOS (WebView/Safari), setting HTMLAudioElement.volume is silently ignored —
 * only the hardware buttons change the volume. To control playback volume
 * programmatically, route the audio element through a Web Audio GainNode.
 *
 * This hook lazily creates a shared AudioContext, connects the given
 * <audio> element to a GainNode → destination, and updates the gain
 * whenever `volume` changes. It also resumes the AudioContext on the
 * first user-initiated play.
 */

// Module-level singletons keyed by element to avoid creating multiple
// MediaElementSourceNodes for the same element (which throws).
const elementToSource = new WeakMap<HTMLMediaElement, {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}>();

let sharedCtx: AudioContext | null = null;
const getCtx = (): AudioContext | null => {
  if (sharedCtx) return sharedCtx;
  const Ctor: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  try {
    sharedCtx = new Ctor();
  } catch {
    sharedCtx = null;
  }
  return sharedCtx;
};

export function useAudioElementGain(
  audioRef: React.RefObject<HTMLAudioElement>,
  /** 0..1 */
  volume: number,
) {
  const gainRef = useRef<GainNode | null>(null);

  // Wire up the graph once the element exists.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const ctx = getCtx();
    if (!ctx) return;

    let entry = elementToSource.get(audio);
    if (!entry) {
      try {
        const source = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain();
        source.connect(gain);
        gain.connect(ctx.destination);
        entry = { source, gain };
        elementToSource.set(audio, entry);
      } catch (err) {
        // Some browsers (rare) might block; fall back silently.
        console.warn("Web Audio gain setup failed:", err);
        return;
      }
    }
    gainRef.current = entry.gain;
    entry.gain.gain.value = Math.max(0, Math.min(1, volume));

    const resume = () => {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    };
    audio.addEventListener("play", resume);
    return () => {
      audio.removeEventListener("play", resume);
    };
  }, [audioRef]);

  // Update gain when volume changes.
  useEffect(() => {
    const gain = gainRef.current;
    if (gain) {
      gain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);
}
