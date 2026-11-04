# Mobile playback compatibility — 2026-11-04

## Investigated root causes

- Production VisionQuest episode streams are original Matroska (.mkv) files served from signed Cloudflare R2 URLs.
- R2 returned `206 Partial Content` on explicit range requests and a matching allowed CORS origin; R2 headers are not the immediate blocker.
- An FFprobe sample of two episodes found HEVC Main 10 / 10-bit video (1920×808) and HEVC Main / 8-bit (1920×1080), AAC audio (English and Hindi), and SRT subtitles.
- `movi-player` 0.4.1 renders unsupported MKV in a WebCodecs/WASM canvas rather than native `<video>`. Its documented `sw="auto"` option is needed for automatic FFmpeg software fallback when hardware decoder fails.
- iPhone WebKit does not guarantee Element Fullscreen API for canvas. Native fullscreen/PiP requires supported media in native `<video>`; document PiP is Chromium-only.

## Patch

- Add `sw="auto"` to existing Movi decoder; retain its native MKV stream (no R2 object or video conversion).
- Provide **in-page viewport fullscreen fallback** for iPhone original-container playback without DOM reparenting (avoids destroying Movi's custom element and video source). Same SecureStream playback controls.
- Add Resume at HH:MM / Start Over confirmation on saved progress. Native MP4, HLS and original MKV support; autoplay waits for decision.
- For original-container resume, wait for Movi's `seeked` event rather than assuming the `seek()` Promise means a decoded frame is ready; show buffering indicator.
- Preserve existing player UI, audio/subtitle controls, and movie/series playlist actions.

## Verification

- 33 SecureStream Vitest tests passed; TypeScript and production build passed.
- Browser emulation (Chromium, not a physical Android): Pixel mobile viewport with native `VideoDecoder` disabled played live VisionQuest original HEVC MKV via software fallback; playback clock advanced.
- Browser emulation (Chromium with iPhone user agent and viewport): in-page viewport fullscreen activated without detaching the decoder; original media progressed.
- Live signed-MKV test against production public APIs and new local assets: Resume at 0:42 advanced to 0:45; Start Over returned to approximately 0:00. No database changes.
- Screenroom browser QA at 320, 375, 390, 430, 768, 820, 1024, 1440 px; no horizontal overflow, no extra black player region.
- Screenroom backend 7 tests passed; integrated episode and related-movie checks passed.

## Remaining compatibility conditions

- **In-page iPhone viewport expansion is not native OS fullscreen.** It can fill the available browser viewport, but Safari chrome and screen rotation policy remain managed by iOS. Validate on actual iPhone/iPad Safari and Chrome before calling it solved.
- **Raw MKV/WASM canvas cannot reliably use iOS system Picture-in-Picture.** Apple's PiP API attaches to native `HTMLVideoElement`; available Document PiP APIs are browser-specific. For dependable iOS system PiP, supply an optional signed, native-browser-compatible MP4 or HLS rendition of the same title. A lossless HEVC/AAC remux (`-c copy`) may preserve video/audio quality if Apple can decode the source; some older Android devices require a separate H.264/AAC encode. Obtain approval before creating/uploading sidecars and verify R2 quota.
- Automatic software decoding may be CPU/memory intensive on older or low-power devices for HEVC 10-bit, especially 4K. This is not proof of universal device support.
- Do not alter original MKV, Cloudflare R2 files, production database or .env.

## Documentation

- https://moviplayer.com/docs/guide/custom-element — `sw="auto"` official behavior
- https://moviplayer.com/docs/guide/hevc-h265-in-browser — hardware/software fallback and mobile limitations
- https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari — native compatibility
- https://developer.apple.com/documentation/webkitjs/adding_picture_in_picture_to_your_safari_media_controls — native video PiP
- https://developers.cloudflare.com/r2/buckets/cors/ — R2 CORS and signed URL behavior
