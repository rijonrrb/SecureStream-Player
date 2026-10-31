# MKV video sources and iPhone fullscreen

## MKV is an ingest format, not a universally supported browser format

SecureStream accepts an MKV original when you supply a separate, browser-compatible MP4 or HLS rendition. This avoids sending multi-gigabyte MKV files into unsupported browser decoders.

```ts
new SecureStreamPlayer({
  container: document.getElementById('video-player')!,
  id: 'video-123',
  src: 'https://cdn.example.com/original.mkv',
  fallbackSrc: 'https://cdn.example.com/prepared.mp4',
});
```

The library selects the web-ready source and preserves the original on storage. Without a fallback, it displays a clear message explaining why an MKV cannot play. It never guesses a signed CDN URL. The player itself does **not** convert an MKV within a browser.

### Preparing MKV files

Use FFmpeg on your trusted upload workstation. Remux an already compatible H.264/yuv420p stream without re-encoding to retain quality:

```sh
ffmpeg -i source.mkv -map 0:v:0 -map 0:a? -c:v copy -c:a aac -movflags +faststart output.mp4
```

For incompatible HEVC/AV1 video on iPhones without support, transcode to H.264 with the original spatial resolution (no scaling):

```sh
ffmpeg -i source.mkv -map 0:v:0 -map 0:a? -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart output.mp4
```

These commands preserve the available audio streams as tracks in MP4; note that some browsers **do not expose** native multiple MP4 audio tracks. For reliable audio-language switching across browsers, serve HLS master playlists with distinct alternate audio tracks. Similarly, export text subtitle tracks as WebVTT or HLS subtitles; bitmap-based MKV subtitle tracks cannot simply become WebVTT.

The SCREENROOM Desktop uploader accepts MKV/MP4/MOV/WebM and prepares a browser MP4 before Cloudflare R2 upload. The server attaches the resulting MP4 object key to titles; the backend does not serve raw MKV in the MP4 route.

## iPhone Safari and Chrome fullscreen

Apple iPhone WebKit does not support fullscreen on arbitrary container elements. The player calls `video.webkitEnterFullscreen()` directly from the user's fullscreen click gesture and returns to custom inline controls via `webkitendfullscreen`. The Apple-native fullscreen interface replaces custom overlay controls while active. On desktop/Android/iPad the player prefers fullscreen on the entire player container.

This logic is covered by jsdom mock regression tests. **Physical iPhone Safari and iOS Chrome verification is still required** to confirm the runtime device/browser behavior.
