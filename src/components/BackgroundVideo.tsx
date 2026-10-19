import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { Track } from '@/pages/Index';
import { videoStorage } from '@/lib/videoStorage';
import { getVideoSyncTime, getVideoSyncCorrection } from '@/lib/trackMedia';

interface BackgroundVideoProps {
  track: Track | null;
  audio: HTMLAudioElement | null;
}

export function BackgroundVideo({ track, audio }: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let resolvedUrl: string | undefined;
    setSource(undefined);
    setFailed(false);
    if (track?.videoFilePath) {
      videoStorage.resolve(track.videoFilePath).then(url => {
        resolvedUrl = url;
        if (cancelled) videoStorage.release(url);
        else setSource(url);
      }).catch(() => { if (!cancelled) setFailed(true); });
    }
    return () => {
      cancelled = true;
      videoStorage.release(resolvedUrl);
    };
  }, [track?.videoFilePath]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !audio || !source || !track || failed) return;
    let stopped = false;
    let nativeActive = true;
    let animationFrame = 0;
    let listener: { remove: () => Promise<void> } | undefined;
    let starting = false;
    let lastCorrection = 0;
    // This element must never acquire the audio session or control the audio element.
    video.muted = true;
    video.defaultMuted = true;

    const synchronize = (force = false) => {
      if (stopped) return;
      const visible = nativeActive && document.visibilityState !== 'hidden';
      const duration = Number.isFinite(video.duration) ? video.duration : track.duration;
      const target = getVideoSyncTime(audio.currentTime, track.duration, duration);
      const correction = getVideoSyncCorrection(target, video.currentTime, audio.playbackRate, force);
      if (video.readyState >= 1 && !video.seeking && correction.seek) {
        try { video.currentTime = target; } catch { /* metadata is still loading */ }
      }
      const rate = correction.seek ? audio.playbackRate : correction.playbackRate;
      if (video.playbackRate !== rate) video.playbackRate = rate;
      if (!visible || audio.paused || audio.ended || audio.seeking || audio.readyState < 3 || audio.currentTime >= track.duration) {
        video.pause();
      } else if (video.paused && !starting) {
        starting = true;
        video.play().catch(() => { /* Audio continues if video autoplay is unavailable. */ }).finally(() => {
          starting = false;
          if (stopped || !nativeActive || document.visibilityState === 'hidden' || audio.paused) video.pause();
        });
      }
    };
    const tick = (now: number) => {
      animationFrame = 0;
      if (stopped || !nativeActive || document.visibilityState === 'hidden' || audio.paused || audio.ended) return;
      // Stop on the final retained frame rather than showing the removed outro.
      const endpoint = Math.min(track.duration, Number.isFinite(video.duration) ? video.duration : track.duration);
      if (video.currentTime >= endpoint || audio.currentTime >= track.duration) {
        video.pause();
        if (video.readyState >= 1 && !video.seeking) video.currentTime = Math.max(0, endpoint - 1 / 30);
        return;
      }
      // The video decoder owns frame delivery. Only check clock drift four times
      // per second; do not repeatedly seek on iOS's quantized audio clock.
      if (now - lastCorrection >= 250) {
        lastCorrection = now;
        synchronize();
      }
      animationFrame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!stopped && nativeActive && document.visibilityState !== 'hidden' && !audio.paused && !audio.ended && !animationFrame) {
        animationFrame = requestAnimationFrame(tick);
      }
    };
    const update = () => {
      synchronize();
      if (audio.paused || audio.ended) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else schedule();
    };
    const seek = () => { synchronize(true); schedule(); };
    const visibility = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      synchronize(true);
      schedule();
    };
    const events = ['play', 'playing', 'pause', 'seeking', 'ended', 'ratechange', 'waiting', 'emptied'];
    events.forEach(event => audio.addEventListener(event, update));
    audio.addEventListener('seeked', seek);
    video.addEventListener('loadedmetadata', seek);
    video.addEventListener('canplay', update);
    video.addEventListener('playing', update);
    document.addEventListener('visibilitychange', visibility);
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        nativeActive = isActive;
        visibility();
      }).then(handle => {
        if (stopped) void handle.remove();
        else listener = handle;
      }).catch(() => { /* document visibility remains the fallback */ });
    }
    visibility();
    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      video.pause();
      events.forEach(event => audio.removeEventListener(event, update));
      audio.removeEventListener('seeked', seek);
      video.removeEventListener('loadedmetadata', seek);
      video.removeEventListener('canplay', update);
      video.removeEventListener('playing', update);
      document.removeEventListener('visibilitychange', visibility);
      void listener?.remove();
    };
  }, [audio, source, track?.id, track?.playbackKey, track?.duration, failed]);

  return (
    <div className="video-backdrop" aria-hidden="true">
      {source && !failed && <video ref={videoRef} src={source} muted playsInline preload="auto" disablePictureInPicture disableRemotePlayback onLoadedMetadata={event => {
        if (!audio) event.currentTarget.currentTime = Math.min(0.1, event.currentTarget.duration || 0);
      }} onError={() => setFailed(true)} />}
      <div className="video-backdrop-shade" />
    </div>
  );
}