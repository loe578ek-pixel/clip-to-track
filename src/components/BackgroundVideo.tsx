import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { Track } from '@/pages/Index';
import { videoStorage } from '@/lib/videoStorage';
import { getVideoSyncTime } from '@/lib/trackMedia';

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
    // This element must never acquire the audio session or control the audio element.
    video.muted = true;
    video.defaultMuted = true;

    const synchronize = (force = false) => {
      if (stopped) return;
      const visible = nativeActive && document.visibilityState !== 'hidden';
      const duration = Number.isFinite(video.duration) ? video.duration : track.duration;
      const target = getVideoSyncTime(audio.currentTime, track.duration, duration);
      if (video.readyState >= 1 && (force || Math.abs(video.currentTime - target) > 0.15)) {
        try { video.currentTime = target; } catch { /* metadata is still loading */ }
      }
      video.playbackRate = audio.playbackRate;
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
    const tick = () => {
      synchronize();
      animationFrame = requestAnimationFrame(tick);
    };
    const update = () => synchronize();
    const seek = () => synchronize(true);
    const visibility = () => {
      cancelAnimationFrame(animationFrame);
      synchronize(true);
      if (nativeActive && document.visibilityState !== 'hidden') animationFrame = requestAnimationFrame(tick);
    };
    const events = ['play', 'playing', 'pause', 'seeking', 'seeked', 'ended', 'timeupdate', 'ratechange', 'waiting', 'emptied'];
    events.forEach(event => audio.addEventListener(event, update));
    audio.addEventListener('seeked', seek);
    video.addEventListener('loadedmetadata', update);
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
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('playing', update);
      document.removeEventListener('visibilitychange', visibility);
      void listener?.remove();
    };
  }, [audio, source, track?.id, track?.playbackKey, track?.duration, failed]);

  return (
    <div className="video-backdrop" aria-hidden="true">
      {source && !failed && <video ref={videoRef} src={source} muted playsInline preload="metadata" disablePictureInPicture disableRemotePlayback onError={() => setFailed(true)} />}
      <div className="video-backdrop-shade" />
    </div>
  );
}