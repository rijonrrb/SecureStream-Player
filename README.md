# SecureStream Player

**A modern, reusable TypeScript video player for web apps.** Built around native HTML5 video and [hls.js](https://github.com/video-dev/hls.js), SecureStream adds adaptive streaming controls, accessibility-friendly playback, language selection and a stylish embedded player without locking you into a framework.

[![CI](https://github.com/rijonrrb/SecureStream-Player/actions/workflows/ci.yml/badge.svg)](https://github.com/rijonrrb/SecureStream-Player/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

**Interactive demo:** https://rijonrrb.github.io/SecureStream-Player/  
**Source:** https://github.com/rijonrrb/SecureStream-Player

> This is an early development release (`v0.1.0`) with a working web demo. GitHub installation is supported; it is **not yet published to the npm registry**. Demo quality/audio/subtitle menus depend on the sample stream's available renditions.

## Why SecureStream?

Create a Netflix-style playback experience in **plain JavaScript, React, Next.js, Vue or Laravel** by mounting a small TypeScript-powered library in a DOM element. Keep video storage and transcoding separate: use Cloudflare R2, a CDN, or any HTTP server that correctly serves HLS playlists and segments with CORS. The player does not download or re-encode your source files.

### Features

| Capability | Details |
| --- | --- |
| Streaming | HLS adaptive bitrate through hls.js; native HLS fallback; browser-compatible MP4 |
| Quality | Auto adaptive bitrate and manual rendition selection (360p, 480p, 720p, 1080p, 4K **if available in manifest**) |
| Audio languages | Switch among alternate audio renditions provided by the HLS playlist (hls.js browsers) |
| Captions | HLS subtitles plus optional external WebVTT tracks, toggleable separately from audio |
| Shape / fit | Fit (letterbox), Fill/Crop, Stretch, and 16:9 / 4:3 / 21:9 crop modes |
| Playback | Seek, 10-second rewind/forward, speed 0.5x–2x, mute, volume, keyboard shortcuts |
| Viewing | Fullscreen, Picture-in-Picture when supported, theater and floating mini player |
| Resume | Saves per-video position on the **same browser** via localStorage |
| Watermark | Optional overlay text; toggle on/off at runtime (not DRM) |
| Reliability | Limited automatic HLS network/decoder recovery, visible status and error messages |
| Developer experience | Framework-agnostic DOM API, TypeScript types, ES/UMD library bundles, tests and CI |

**Note on 4K and image quality:** SecureStream does not lower or compress your original video. For Auto quality and manual 360p/480p/720p/1080p/4K options, *you must provide separate renditions* in an HLS master manifest. A 4K source stays 4K as the highest rendition; producing lower bitrate renditions involves separate encoding and uses additional storage. If you only supply a 4K MP4, the browser may play it, but the player cannot magically create lower qualities.

## Installation (GitHub)

Requires a modern browser and Node.js/npm for projects using bundlers.

```bash
npm install github:rijonrrb/SecureStream-Player
```

This builds the library from GitHub at install time. Alternatively clone the repository and build locally:

```bash
git clone https://github.com/rijonrrb/SecureStream-Player.git
cd SecureStream-Player
npm ci
npm run build
```

## Basic usage (vanilla JavaScript / TypeScript)

```html
<div id="movie-player"></div>
```

```ts
import { SecureStreamPlayer } from '@rijonrrb/securestream-player';
import '@rijonrrb/securestream-player/style.css';

const player = new SecureStreamPlayer({
  container: document.querySelector('#movie-player')!,
  id: 'movie-001', // stable ID for local resume
  src: 'https://your-cdn.example/movies/movie-001/master.m3u8',
  title: 'My Movie',
  poster: '/posters/movie-001.webp',
  watermark: { text: 'SecureStream Demo', enabled: true },
  subtitles: [
    { label: 'English', language: 'en', src: '/subtitles/movie-001-en.vtt' },
    { label: 'বাংলা', language: 'bn', src: '/subtitles/movie-001-bn.vtt' },
  ],
});

// Optional public instance methods
player.setDisplayMode('fill');          // 'fit', 'fill', 'stretch', 'ratio-16-9', ...
player.skip(10);                        // forward 10 seconds
player.setWatermark(false);             // hide overlay
// player.destroy();                    // release resources on unmount
```

See `src/main.ts` for the complete interactive demo application.

## React / Next.js integration

SecureStream is not tied to React. In React, create it inside `useEffect` after the DOM element mounts and destroy it during cleanup. Next.js App Router components must run on the client:

```tsx
'use client';
import { useEffect, useRef } from 'react';

export function MoviePlayer({ url, id }: { url: string; id: string }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    let mounted = true;
    let instance: { destroy(): void } | undefined;

    import('@rijonrrb/securestream-player').then(({ SecureStreamPlayer }) => {
      if (mounted && container.current) {
        instance = new SecureStreamPlayer({
          container: container.current,
          id,
          src: url,
          watermark: { text: 'Demo', enabled: false },
        });
      }
    });

    return () => {
      mounted = false;
      instance?.destroy();
    };
  }, [url, id]);

  return <div ref={container} />;
}
```

Import `@rijonrrb/securestream-player/style.css` in your global stylesheet entry or client component. For Laravel/Vue use the same DOM API inside the component lifecycle.

## Audio & subtitle setup

* **Audio:** Multiple languages work when the HLS master playlist advertises alternate audio groups with `#EXT-X-MEDIA:TYPE=AUDIO`. A multi-audio MKV file cannot be handed directly to browsers and expected to expose VLC-style tracks: package supported codecs and alternate tracks into HLS first.
* **Subtitles:** Add alternate HLS subtitle renditions or supply external WebVTT files through `subtitles`. Audio and subtitle selections remain independent.
* **Safari:** Native HLS fallback is supported. The custom quality/audio menus are currently implemented through hls.js, so Safari/iOS native-HLS track selection can be more limited.
* **CORS:** HLS playlists, video fragments, subtitle files and poster URLs must allow requests from your website's origin. MIME types for manifests and segments must be correct.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` / `K` | Play/pause (when player is focused) |
| `←` / `→` | Rewind/forward 10 seconds |
| `F` | Fullscreen |
| `M` | Mute |
| `P` | Picture-in-Picture where supported |

## Public player API

| Method | Purpose |
| --- | --- |
| `togglePlay()` | Play or pause |
| `skip(seconds)` | Seek relative to the current time |
| `toggleMute()` | Mute or unmute |
| `setDisplayMode(mode)` | Fit, fill, stretch, or preset crop ratio |
| `setWatermark(enabled)` | Toggle text overlay visibility |
| `toggleFullscreen()` | Enter/exit fullscreen |
| `togglePictureInPicture()` | Enter/exit PiP, where available |
| `destroy()` | Stop playback, release HLS resources and remove player |

## Run demo & tests locally

```bash
npm ci
npm run dev
npm test
npm run build
```

Open the URL printed by Vite (typically http://localhost:5173). The demo defaults to a publicly available Big Buck Bunny HLS test playlist and offers a CC0 MDN flower MP4 alternative. You can paste your own CORS-enabled HLS or MP4 URL into the playground.

## Planned enhancements

See [Project roadmap](docs/ROADMAP.md) for improvements such as stronger mobile controls, caption styling, buffer statistics, fullscreen aspect interactions, native HLS parity, React wrapper, cross-device resume, accessibility audit, integration tests, and optional controlled access.

## Important limitations & legal notes

* **Watermark is not copy protection.** This client-side overlay can be hidden or bypassed; use licensed DRM and authenticated delivery for genuine anti-piracy protection.
* **A public route is public.** Do not publish or distribute films unless you own the rights or have permission to stream them. Private ownership of a file is not necessarily a right to offer it on a public website.
* **Storage and distribution:** Cloudflare R2 stores objects; it does not automatically transcode or create an adaptive ladder. Playback smoothness depends on network throughput, encoding, CDN cache behavior and devices; zero buffering cannot be guaranteed.
* **Resume data:** Progress is stored locally in the viewer's browser, not in a synced account.
* **Demo video rights:** Big Buck Bunny © Blender Foundation, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) and the [Blender project](https://peach.blender.org/); alternate MDN demo is CC0.
* **Supported browsers:** Modern Chromium, Firefox and Safari, subject to codec/HLS/PiP/platform limitations. Browser and device QA is ongoing.

## License

MIT — see [LICENSE](LICENSE). Copyright © 2026 Shakib Hossain Rijon.
