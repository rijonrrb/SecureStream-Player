# SecureStream Player

**A reusable, framework-agnostic video player for modern web applications.**

[Live Demo](https://rijonrrb.github.io/SecureStream-Player/) · [MIT License](LICENSE)

[![CI](https://github.com/rijonrrb/SecureStream-Player/actions/workflows/ci.yml/badge.svg)](https://github.com/rijonrrb/SecureStream-Player/actions/workflows/ci.yml) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6) ![License](https://img.shields.io/badge/License-MIT-blue)

## Overview

SecureStream Player is an open-source TypeScript library that adds an intuitive, customizable video playback experience to websites and applications without tying developers to a specific frontend framework. It combines familiar controls with adaptive HLS streaming, optional audio and subtitle selection, and support for compatible direct media sources.

**The problem it solves:** Building a capable video player from scratch means handling media formats, quality controls, playback state, device differences, and accessibility. SecureStream brings these concerns into one reusable component so teams can focus on their product.

**Who it's for:** developers building e-learning platforms, media libraries, video portals, internal training tools, and other applications that need an embeddable video player.

## Key features

| Area | Capabilities |
| --- | --- |
| Adaptive streaming | HLS playback using hls.js, automatic quality adaptation, and manual rendition selection when provided by the source |
| Flexible media | Browser-compatible MP4 and HLS, with an experimental on-demand original-container engine for certain MKV and legacy formats |
| Languages and captions | Alternate audio renditions and HLS/WebVTT subtitles when supported by the media and browser |
| Player controls | Play/pause, seek, 10-second skip, playback speed, volume, mute, and keyboard shortcuts |
| Viewing experience | Fullscreen, Picture-in-Picture where supported, and fit/fill/crop display options |
| Viewing continuity | Per-video playback progress saved in the same browser |
| Optional watermark | Configurable on-screen text overlay (not DRM or screen-recording protection) |
| Integration | DOM-based TypeScript API, ES/UMD library builds, tests, and a public demo |

The player does **not** host or transcode videos. Available quality options, audio tracks, and subtitles depend on what the media source provides. Decoder and native HLS support vary by browser and device.

## Try the live demo

Open the [interactive player demo](https://rijonrrb.github.io/SecureStream-Player/) to explore the controls and test compatible media sources.

## Install and use

SecureStream Player is currently distributed through GitHub rather than the npm registry.

### Install from GitHub

```bash
npm install github:rijonrrb/SecureStream-Player
```

Alternatively, build and explore the project locally:

```bash
git clone https://github.com/rijonrrb/SecureStream-Player.git
cd SecureStream-Player
npm ci
npm run dev
```

### Basic integration

Add a player container:

```html
<div id="video-player"></div>
```

Initialize the player with an authorized, accessible video URL:

```ts
import { SecureStreamPlayer } from '@rijonrrb/securestream-player';
import '@rijonrrb/securestream-player/style.css';

const player = new SecureStreamPlayer({
  container: document.querySelector('#video-player')!,
  id: 'lesson-01',
  src: 'https://media.example.com/lesson/master.m3u8',
  title: 'Introduction',
  subtitles: [
    { label: 'English', language: 'en', src: '/captions/lesson-en.vtt' },
  ],
});

// Release the player when the component or page is unmounted:
// player.destroy();
```

This framework-independent DOM API can be used from vanilla JavaScript, Vue, Laravel views, and client-side React or Next.js components. In component frameworks, create the player after the container mounts and destroy it during cleanup. Media hosts must allow the required requests, including CORS where applicable.

For format and device nuances, read the [MKV and iOS compatibility guide](docs/MKV_AND_IOS.md).

## Project status and direction

**Status: Active development (v0.3.0).** The library already has an interactive demo and working player controls. Ongoing areas of improvement include mobile and Safari consistency, stronger accessibility, richer caption customization, playback diagnostics, and easier framework integrations.

Those are **development goals**, not guarantees of features already shipped. The detailed engineering backlog lives in the [development roadmap](docs/ROADMAP.md).

## Contributing

Community contributions are welcome, especially for browser compatibility, accessibility, tests, examples, and documentation.

1. Search [existing issues](https://github.com/rijonrrb/SecureStream-Player/issues), or open a new issue to discuss a bug or improvement.
2. Fork the repository and create a branch for a focused change.
3. Run `npm ci`, `npm test`, and `npm run build` when applicable.
4. Submit a [pull request](https://github.com/rijonrrb/SecureStream-Player/pulls) with a concise explanation and any browser or device testing performed.

Please keep contributions focused on the reusable player, rather than the infrastructure of any specific application using it.

## Responsible use and license

Only stream media that you have the right to use. A visual watermark is not copy protection, and playback compatibility cannot be guaranteed across every device or codec.

Released under the [MIT License](LICENSE).
