/** Optional, read-only playback diagnostics. No media URLs or user identifiers are collected. */
export type PlaybackSnapshot = {
  codec: string; resolution: string; bufferedSeconds: number;
  droppedFrames: number | null; totalFrames: number | null;
  activeAudioTrack: string; activeSubtitleTrack: string;
  networkState: number; readyState: number; error: string | null;
};
export function playbackSnapshot(video: HTMLVideoElement, codec = 'unknown'): PlaybackSnapshot {
  const buffered = video.buffered;
  let ahead = 0;
  for (let i = 0; i < buffered.length; i++) {
    if (buffered.start(i) <= video.currentTime && buffered.end(i) >= video.currentTime) {
      ahead = Math.max(0, buffered.end(i) - video.currentTime); break;
    }
  }
  const quality = video.getVideoPlaybackQuality?.();
  const audio = (video as HTMLVideoElement & {audioTracks?: ArrayLike<{enabled: boolean; label?: string; language?: string}>}).audioTracks;
  let activeAudioTrack = 'unknown';
  if (audio) for (let i = 0; i < audio.length; i++) if (audio[i].enabled) { activeAudioTrack = audio[i].label || audio[i].language || String(i); break; }
  const subtitles = Array.from(video.textTracks || []).find(t => t.mode === 'showing');
  return {
    codec, resolution: video.videoWidth && video.videoHeight ? `${video.videoWidth}x${video.videoHeight}` : 'unknown',
    bufferedSeconds: ahead, droppedFrames: quality?.droppedVideoFrames ?? null,
    totalFrames: quality?.totalVideoFrames ?? null,
    activeAudioTrack, activeSubtitleTrack: subtitles?.label || subtitles?.language || 'off',
    networkState: video.networkState, readyState: video.readyState,
    error: video.error ? `MediaError ${video.error.code}` : null
  };
}
/** Browser capability is advisory; 'unknown' is not treated as unsupported. */
export type CodecSupport = 'supported' | 'unsupported' | 'unknown';
export async function probeCodec(contentType: string, width = 1920, height = 1080): Promise<CodecSupport> {
  if (!contentType || !/^[\w.+-]+\/[\w.+-]+(?:\s*;.*)?$/.test(contentType)) return 'unknown';
  const capabilities = typeof navigator !== 'undefined' ? navigator.mediaCapabilities : undefined;
  if (capabilities?.decodingInfo) {
    try {
      const result = await capabilities.decodingInfo({
        type: 'file',
        video: {contentType, width, height, bitrate: 5_000_000, framerate: 30}
      });
      return result.supported ? 'supported' : 'unsupported';
    } catch { /* Some browsers reject container/codec combinations; fall back. */ }
  }
  if (typeof document !== 'undefined') {
    const result = document.createElement('video').canPlayType(contentType);
    if (result === 'probably' || result === 'maybe') return 'supported';
    if (result === '') return 'unknown'; // WASM/original-container engine may still decode.
  }
  return 'unknown';
}
