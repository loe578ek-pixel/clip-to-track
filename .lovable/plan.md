
# TKPlaylist — Offline video, Glass mode and conservative jingle detection

## What will change
- Keep the original video offline alongside newly imported audio. Existing audio-only tracks remain playable; their videos cannot be recovered without re-importing the originals.
- Add an English **Display mode** selector in Settings: **Classic** (default) and **Glass**, remembered after restart.
- In Glass mode, show the current track's vertical video full-screen behind Home, Add, Playlists, Settings and the player. Use readable translucent blurred surfaces, including bottom navigation. Without video, retain a dark background.
- Add a discreet bottom-right eye button to hide and restore the interface without stopping playback. Keep titles visible when the interface is shown and retain the same title on the lock screen.
- Keep one sound source: the existing audio player. The video stays muted, follows play/pause/seeking/track changes and repeats, pauses visually in the background, and resynchronizes on return.
- Preserve subscriptions, trial rules, playlists and native lock-screen controls. Replace the ending-cut heuristic only for new imports, using the conservative detection described below.

## TikTok link import — deferred
- Do not add or modify TikTok link import in this update. No downloader account, integration or paid provider is required for the current scope.

## Current cutting behavior and replacement
- Today `src/lib/audioProcessor.ts` calls `detectTikTokOutroSeconds()` during gallery audio extraction. There is no fixed 4.5-second cut anymore.
- The current heuristic finds at least one second of trailing low-volume audio, searches for a loud peak within the preceding 1.2 seconds, estimates its onset, assumes about 0.85 seconds of jingle before silence, and cuts 0.1 seconds before that estimate.
- These volume/silence checks do not identify TikTok's actual jingle. A natural music ending can satisfy them and be cut incorrectly.
- Replace this with reference-based recognition in the final six seconds: compare short-time spectral fingerprints of the audio with a supplied clean TikTok jingle reference, accounting for different volume levels and compressed audio.
- Require a strong match across the jingle's characteristic sequence, not just a loud sound followed by silence. Locate its onset and apply a minimal safety margin only when confidently matched. No match, ambiguous match, unsupported variant or missing reference means no cut.
- Request an original video containing the complete audible jingle, ideally plus examples without it, before calibrating and claiming reliable recognition. A single reference cannot guarantee recognition of all TikTok variants.
- Retain original video files unmodified, but stop/loop video at the same detected endpoint as extracted audio. Do not let the background video advance the playlist independently.
- Apply the new detection only to future imports. Already imported tracks retain their current audio and timing.

## Protection and validation
- Preserve the current Classic appearance. Test Glass on small and large iPhone-sized screens, including safe areas and long titles.
- Cover saved video metadata, legacy tracks, file cleanup and synchronization rules with focused tests.
- Exercise gallery import, display choice persistence, playback, pause, seek, next/previous, repeats and hide/show through the running app.
- Validate recognition on supplied jingle examples and non-jingle music endings; explicitly test that uncertain/absent matches keep the full duration.
- Browser checks do not prove native iPhone lock-screen behavior. A physical iPhone regression test is required before publishing, particularly audio continuation when the muted video is backgrounded.

## Technical approach
- Extend track metadata with optional original-video path, type and size; do not persist temporary playback URLs.
- Copy gallery video files into native persistent storage rather than base64-encoding another full video in memory. Resolve native playback with a local playable URL; use persistent Blob storage on the web.
- Mount one background video in the shared application shell, outside tab switching. Synchronize it from the existing audio element without registering a second media session.
- Persist display choice independently through device preferences so settings changes do not overwrite unrelated preferences.
- Delete retained video when its track or all music files are deleted, and include its actual size in storage reporting.
- Isolate jingle recognition from audio conversion and test detected onset/endpoints with concrete sample timings; leave the audio playback engine unchanged.

## Delivery and configuration
- Report the actual changed files when implementation is complete.
- Gallery video and Glass mode require no new external account or database table.
- No TikTok import service or new backend configuration is needed in this update. The user supplies a jingle reference for calibration.
- Native delivery requires pulling/exporting the updated project, installing dependencies if changed, running `npx cap sync ios`, and making a new Xcode archive/TestFlight build.
- Do not declare the update ready for App Store submission until real-device audio/video checks pass. Detection calibration waits for the reference sample.

