# Project architecture

- The existing MusicPlayer HTMLAudioElement is the sole sound and media-session owner; decorative videos must remain muted and follow it so native background playback is not replaced.
- Retained original videos use a separate videoStorage service (native filesystem copies and web IndexedDB blobs); metadata stores persistent paths rather than temporary URLs to support offline relaunch and cleanup.
- The shared Index shell owns the optional display mode and background video; tab changes and hiding the interface must not unmount the audio player.
- Display mode and last actually played video ID use independent Preferences keys; resolve the latter against existing tracks so relaunch supports idle video without retaining deleted media or temporary URLs.
- Import endpoint policy and persisted media metadata are isolated in trackMedia and covered by focused tests so future jingle recognition cannot silently reintroduce unconditional trimming.
- Glass surfaces use semantic tokens and a document-level display attribute so tab surfaces and portal dialogs share the same optional theme without changing Classic defaults.