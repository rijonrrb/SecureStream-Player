# Original MKV and Browser Playback — SecureStream v0.3

## Direct original MKV support

SecureStream uses native HTML5 video and HLS by default. For original Matroska and legacy containers, it lazy-loads an extra WebCodecs/FFmpeg-WASM engine. That engine reads compressed video/audio bytes straight from your original file URL using HTTP byte-range requests. **No video re-encoding or file conversion occurs in the player.**

```ts
new SecureStreamPlayer({
  container: document.getElementById('player')!,
  id: 'original-film',
  src: 'https://example.com/authorized-film.mkv',
  title: 'Original-quality stream',
});
```

The build produces `dist-lib/securestream.js`, `dist-lib/securestream.css`, and `dist-lib/movi-element.js`. **Host all three side by side.** The extra decoder script (approximately 12 MB) is downloaded only for MKV and legacy formats.

MKV, MKA, AVI, FLV, MOV, MPEG-TS and related formats go through the original-container decoder. MP4, M4A, MP3, WebM and HLS still use HTMLVideoElement/hls.js where compatible. Additional formats or unsupported codecs may fail; extension support is not a guarantee that every unusual codec/profile will decode on every device.

## Requirements

- Storage returns HTTP 206 for `Range: bytes=...` requests and advertises appropriate Content-Type.
- For R2, use S3-compatible multipart upload and a CORS policy that permits the Screenroom site to request GET, HEAD and Range. Serve private assets through signed URLs.
- Decoding speed depends on browser hardware/WebCodecs, codec/profile and available memory. FFmpeg-WASM fallback may be CPU intensive.
- Embedded MKV audio/subtitle tracks are exposed via the original-container player's own UI. HLS offers alternate audio and text track controls.
- For iPhone, the standard HTML video engine retains native WebKit fullscreen support. Canvas-based MKV playback may not support the same native fullscreen behavior; physical-device verification is required.

## Direct Cloudflare R2 upload

The Screenroom Desktop `SCREENROOM - Upload Video.bat` accepts MKV, MP4, WebM, MOV, AVI, MPEG-TS, MP3, FLAC, WAV and other supported extensions. It no longer automatically converts MKV to MP4. The uploaded object retains its exact input bytes and extension. Attach the matching R2 object key and format in Screenroom Studio.

## Optional lossless remux

The `SCREENROOM - Convert MKV to MP4.bat` uses FFmpeg stream copy (`-c copy`) to change container without re-encoding video/audio. It neither rescales nor adjusts compression quality. If a codec cannot fit in MP4 with stream copy, conversion fails clearly instead of lowering quality. Its MP4 does not include MKV-only subtitle/attachment tracks; use the original MKV for full-track preservation.

## Verification

A synthetic MKV containing H.264 video and separate English/Bangla AAC audio tracks was uploaded as original MKV to Cloudflare R2 with HTTP 206 response. Headless Chrome successfully loaded it through the WebCodecs/WASM decoder, detected three tracks and played through its full 4-second duration. This does **not** guarantee that a specific 2–3 GB HEVC/DTS movie plays on every phone or browser.

## Third-party attribution

The optional original-container decoder uses [movi-player](https://github.com/mrujjwalg/movi-player), licensed Apache-2.0 (Copyright Ujjawal Kashyap). SecureStream's own code remains MIT.
