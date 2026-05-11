import { registerPlugin } from '@capacitor/core';

export interface NowPlayingMetadata {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  elapsed?: number;
  isPlaying: boolean;
}

export interface NowPlayingPluginShape {
  activate(): Promise<void>;
  setNowPlaying(meta: NowPlayingMetadata): Promise<void>;
  updatePlayback(state: { elapsed: number; isPlaying: boolean }): Promise<void>;
  clear(): Promise<void>;
  addListener(
    eventName: 'remoteCommand',
    listener: (event: { action: 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'seek'; position?: number }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

export const NowPlayingNative = registerPlugin<NowPlayingPluginShape>('NowPlayingPlugin');
