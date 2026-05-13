import { registerPlugin } from '@capacitor/core';

export interface NowPlayingMetadata {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  elapsed?: number;
  isPlaying: boolean;
}

export interface LoadTrackOptions {
  uri: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  autoPlay?: boolean;
}

export type NativeAudioEvent =
  | { event: 'play' }
  | { event: 'pause' }
  | { event: 'ended' }
  | { event: 'timeupdate'; currentTime: number };

export interface NowPlayingPluginShape {
  activate(): Promise<void>;
  setNowPlaying(meta: NowPlayingMetadata): Promise<void>;
  updatePlayback(state: { elapsed: number; isPlaying: boolean }): Promise<void>;
  clear(): Promise<void>;

  // Native AVPlayer
  loadTrack(opts: LoadTrackOptions): Promise<void>;
  playNative(): Promise<void>;
  pauseNative(): Promise<void>;
  seekNative(opts: { position: number }): Promise<void>;
  setVolumeNative(opts: { volume: number }): Promise<void>;
  stopNative(): Promise<void>;
  getCurrentTime(): Promise<{ currentTime: number }>;

  addListener(
    eventName: 'remoteCommand',
    listener: (event: { action: 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'seek'; position?: number; eventId?: number }) => void
  ): Promise<{ remove: () => Promise<void> }>;

  addListener(
    eventName: 'nativeAudio',
    listener: (event: NativeAudioEvent) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

export const NowPlayingNative = registerPlugin<NowPlayingPluginShape>('NowPlayingPlugin');
