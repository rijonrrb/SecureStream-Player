# SecureStream Player — Development Roadmap

> Scope: **the reusable video player library and its standalone demo only.**
> This repository does not contain or track any consuming application, website, movie catalog or hosting migration.

## v0.2 — Minimalist control interface

- [x] Transparent top and bottom playback overlays; controls remain in the video frame.
- [x] Discreet three-dot menu for quality, audio, subtitles, speed, view, theme and watermark.
- [x] Play/pause, rewind 10 s, forward 10 s and thin seek bar.
- [x] Elapsed / total duration toggle to elapsed / time remaining.
- [x] Fit, Fill/Crop, Stretch, 16:9, 4:3 and 21:9 display options without resizing the player.
- [x] Remove Theater Mode entirely.
- [x] Refresh the demo visual style; preserve framework-agnostic mounting.
- [x] Maintain tests and CI for existing and new controls.
- [ ] Visual QA with desktop/mobile browsers and assistive technologies.

## v0.3 — Streaming reliability and compatibility

- [ ] Browser-based end-to-end checks for HLS network recovery and manual rendition switching.
- [ ] Native HLS quality/audio selection parity, including Safari and iOS behavior.
- [ ] Multi-language audio and WebVTT/HLS subtitle integration fixtures.
- [ ] Separate HLS test manifest with several quality variants (up to 2160p) and selectable languages.
- [ ] Reliable seek, buffering and adaptation testing under throttled networks.
- [ ] Better HLS error feedback, retry handling and optional stream diagnostics.

## v0.4 — Interaction polish

- [ ] Controls auto-hide after inactivity during playback, with touch-friendly reveal.
- [ ] Seek thumbnails / storyboard sprite support and buffered-range progress visualization.
- [ ] Improved gesture controls and mini-player behavior on small screens.
- [ ] Better caption styling and localization hooks.
- [ ] Audit keyboard navigation, menu focus, tooltips, contrast, reduced-motion and screen-reader labels.

## v1.0 — Library release readiness

- [ ] Stable public TypeScript API with event callbacks and integration examples.
- [ ] Tested installation via GitHub in a fresh Vite app and as a React/Next.js client component.
- [ ] Optional React wrapper and npm registry release.
- [ ] API versioning, changelog, license review and reproducible CI builds.
- [ ] Browser support matrix based on actual verification runs.

## Design & engineering principles

- **Independent:** no dependencies on a particular CMS, frontend framework or website.
- **Quality-preserving:** never alter the supplied video file. Manual quality options require source renditions.
- **Honest capabilities:** alternate audio/subtitles require compatible tracks/manifest; unsupported browser APIs degrade gracefully.
- **Accessibility:** test keyboard, touch and assistive technology usability.
- **Security boundaries:** a visual watermark is not DRM, and browser-side code cannot secure public media URLs.
- **Zero hosting assumptions:** the player consumes authorized CORS-enabled MP4/HLS media from a caller-supplied URL.
