
# TKPlaylist — Offline video, Glass mode and TikTok links

## What will change
- Keep the original video offline alongside newly imported audio. Existing audio-only tracks remain playable; their videos cannot be recovered without re-importing the originals.
- Add an English **Display mode** selector in Settings: **Classic** (default) and **Glass**, remembered after restart.
- In Glass mode, show the current track's vertical video full-screen behind Home, Add, Playlists, Settings and the player. Use readable translucent blurred surfaces, including bottom navigation. Without video, retain a dark background.
- Add a discreet bottom-right eye button to hide and restore the interface without stopping playback. Keep titles visible when the interface is shown and retain the same title on the lock screen.
- Keep one sound source: the existing audio player. The video stays muted, follows play/pause/seeking/track changes and repeats, pauses visually in the background, and resynchronizes on return.
- Do not change the existing watermark-ending treatment, subscriptions, trial rules, playlists or native lock-screen controls.

## TikTok link import — decision before implementation
- Add an English TikTok link field and import button alongside gallery import, with real download progress where measurable and explicit processing states.
- Route link resolution and downloading through Lovable Cloud, not direct TikTok requests from the app.
- A maintained third-party downloader is needed for arbitrary public TikTok links; official TikTok metadata/embedding interfaces are not a general video-download service.
- A third-party provider may retrieve the caption and a watermark-free video when available, but cannot guarantee this for every link. Private/deleted/restricted videos and changes to TikTok can cause failures.
- Do not integrate an anonymous free downloader endpoint or promise permanent reliability. Confirm the provider, its credentials, pricing and allowed use before wiring live downloads.
- Use imports only for videos the user owns or has permission to download. Downloading third-party media without authorization can also create App Store review risks.
- If provider setup is deferred, finish video retention and Glass mode first; do not present a nonfunctional link import as ready.

## Protection and validation
- Preserve the current Classic appearance. Test Glass on small and large iPhone-sized screens, including safe areas and long titles.
- Cover saved video metadata, legacy tracks, file cleanup and synchronization rules with focused tests.
- Exercise gallery import, display choice persistence, playback, pause, seek, next/previous, repeats and hide/show through the running app.
- Validate approved TikTok downloads against real public links and clear invalid/private/unavailable-video failures.
- Browser checks do not prove native iPhone lock-screen behavior. A physical iPhone regression test is required before publishing, particularly audio continuation when the muted video is backgrounded.

## Technical approach
- Extend track metadata with optional original-video path, type and size; do not persist temporary playback URLs.
- Copy gallery video files into native persistent storage rather than base64-encoding another full video in memory. Resolve native playback with a local playable URL; use persistent Blob storage on the web.
- Mount one background video in the shared application shell, outside tab switching. Synchronize it from the existing audio element without registering a second media session.
- Persist display choice independently through device preferences so settings changes do not overwrite unrelated preferences.
- Delete retained video when its track or all music files are deleted, and include its actual size in storage reporting.
- For link imports, validate TikTok hosts and redirect destinations, enforce provider/file safety, keep credentials server-only, and stream downloads rather than buffering a whole video inside an edge function.

## Delivery and configuration
- Report the actual changed files when implementation is complete.
- Gallery video and Glass mode require no new external account or database table.
- TikTok import requires an approved downloader service and its account/key; recurring provider usage costs may apply.
- Native delivery requires pulling/exporting the updated project, installing dependencies if changed, running `npx cap sync ios`, and making a new Xcode archive/TestFlight build.
- Do not declare the update ready for App Store submission until real-device audio and approved downloader checks pass.

