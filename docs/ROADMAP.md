# SecureStream + /movies Implementation Roadmap

**Owner:** Shakib Hossain Rijon
**Status:** Player demo prototype in progress; separate Movies website not yet started.

## Phase 1 — Portable SecureStream player (current)
- [x] Public GitHub repository, MIT LICENSE, TypeScript/HLS.js core.
- [x] Auto/manual HLS quality switching (available renditions only).
- [x] Alternate audio and subtitle menus (HLS.js; browser limitations noted).
- [x] Rewind/forward 10 seconds, speed, volume, mute, fullscreen, PiP.
- [x] Local resume by unique video ID, watermark toggle, theater/mini mode.
- [x] Fit, Fill/Crop, Stretch, 16:9, 4:3, 21:9 video display modes.
- [x] Unit tests, automated build and Github Actions CI (run verification).
- [x] Demo playground with known openly licensed sample video.
- [ ] Validate published live demo on desktop/mobile browsers; fix any issues identified.
- [ ] Add e2e playback testing on Chrome, Firefox, Safari/iOS including seeking and language changes.
- [ ] Refine responsive controls: overlay control bar, touch gestures, accessible menu focus and tooltips.
- [ ] Better buffered progress bar, controls autohide, settings UX, mini player behavior.
- [ ] Audio track selection on native HLS browsers; subtitle edge-case compatibility.
- [ ] Optional React wrapper and npm registry release following stable API review.
- [ ] Add progress event callbacks / typed telemetry, diagnostics and manual retry button.
- [ ] Support captions styling, chapters, keyboard shortcut documentation and localization.
- [ ] Add test fixture manifest with 360p, 480p, 720p, 1080p, 2160p and multiple audio/subtitle tracks.

## Phase 2 — Portfolio coexistence (later)
1. Keep the existing HTML/CSS/JS portfolio at the root domain.
2. Build a separate React+TypeScript+Vite static Movies app at /movies/.
3. Configure Vite base=/movies/ and cPanel rewrite rules for client side nested routes, or use physical pages.
4. Avoid redesigning the existing portfolio; fix localhost SEO metadata and sitemap.
5. Ensure direct refresh of /movies and /movies/watch/:slug works on the actual hosting provider.

## Phase 3 — Movie storage and encoding pipeline
1. Confirm user owns/has permission to publicly stream all movie content (public no-login website).
2. Create Cloudflare R2 bucket, upload licensed source video with 4K originals preserved.
3. Use offline FFmpeg for separate 360p/480p/720p/1080p/2160p adaptive renditions where source permits; **do not replace or downgrade original 4K**.
4. Package multilingual audio renditions and WebVTT/HLS subtitle renditions in valid HLS master manifest. Ensure browser compatible audio/video codecs.
5. Configure Cloudflare delivery, CORS, MIME types and cache headers. Avoid exposing R2 credentials or origin secrets client-side.
6. Calculate R2 storage: original source + each additional rendition + audio + segments, not only original movie size.
7. Benchmark start time, seek latency, adaptation and buffering from Bangladesh and Kuwait on actual networks.
8. Check R2 plan, request limits, CDN restrictions and possible storage/billing before scaling.

## Phase 4 — Netflix-style Movies experience
- Public /movies home with hero, featured movies, poster cards and metadata.
- Search/filter, movie detail and fullscreen watch view with SecureStream Player.
- Continue Watching cards with per-movie local progress, resume on same browser.
- Auto / manually set quality, audio language independent of subtitles.
- Optional overlay watermark setting; shape controls, speed, 10-second skip and PiP.
- Metadata from a legitimate movie information API, with appropriate attribution/terms.
- Robust errors, loading placeholders, keyboard/touch controls, mobile and TV layout.
- No password initially; auth and cross-device progress sync only as separate optional stages.

## Acceptance criteria (first release)
- `npm ci`, `npm test`, `npm run build` pass in CI.
- Demo reachable by a public URL from README and starts a licensed test stream.
- Rewind/forward, speed, fit/fill/stretch, watermark, and same-browser resume work.
- HLS quality/audio/subtitles menu accurately reflects manifest availability; unavailable tracks not invented.
- Fullscreen and PiP gracefully fallback if unsupported; no surprise source re-encoding.
- README explains installation, typed API, browser limitations and licensing.

## Principles
- Preserve source quality: 4K input remains 4K in master output; lower renditions are optional additional encodes.
- Hosting is separated: static portfolio / movies UI on existing host; large video on Cloudflare R2 or equivalent.
- Public movies require legal distribution rights; watermark does not grant rights or implement DRM.
- Prefer free-tier tools; avoid purchases/automatic billing without user permission.
