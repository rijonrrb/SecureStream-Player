import { SecureStreamPlayer } from './player';
import './demo.css';

const HLS_DEMO = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const MP4_DEMO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const mount = document.querySelector<HTMLDivElement>('#app');
if (!mount) throw new Error('Demo mount not found');
mount.innerHTML = [
  '<div class="site-container">',
  '  <header class="header"><a class="brand" href="/"><span class="brand-icon">▶</span><span>SecureStream<span style="color:#74d4ff">.</span></span></a>',
  '    <nav class="top-nav"><a href="#features">Features</a><a class="github" href="https://github.com/rijonrrb/SecureStream-Player" target="_blank" rel="noopener">★ GitHub Repository ↗</a></nav></header>',
  '  <section class="hero"><div class="eyebrow">Open Source · TypeScript · HLS.js</div>',
  '    <h1>A better way to <span>experience video.</span></h1>',
  '    <p>Meet SecureStream — an adaptive, reusable player built for developers. Explore quality selection, multilingual audio and subtitles, Fit/Fill/Stretch aspect controls, playback shortcuts, resume, and an optional watermark.</p>',
  '    <div class="pills"><span>● Adaptive HLS</span><span>● Auto + Manual Quality</span><span>● Up to 4K when available</span><span>● Framework Agnostic</span></div>',
  '  </section>',
  '  <section class="player-area">',
  '    <div class="video-panel"><div id="securestream-demo"></div><h2>Interactive playback demo</h2>',
  '      <p class="description">Use the player controls to change speed, seek ±10 seconds, toggle watermark, enter fullscreen or PiP, and resume where you left off. Available quality, audio, and subtitle choices depend on the selected demo stream.</p></div>',
  '    <aside class="panel"><h3>Demo playground</h3><label class="form-label" for="demo-source">Stream source</label>',
  '      <select id="demo-source"><option value="hls">Adaptive HLS · Big Buck Bunny</option><option value="mp4">Standard MP4 · Flower</option></select>',
  '      <label class="form-label" for="custom-url">Custom HLS / MP4 URL</label>',
  '      <input id="custom-url" type="url" placeholder="https://…/master.m3u8" autocomplete="off" />',
  '      <button id="load-source">Load video</button>',
  '      <p class="hint">For a custom source, configure CORS and use a valid HLS master playlist or browser-compatible MP4. 4K and multiple languages appear only when provided by the stream.</p>',
  '      <p class="hint">This public demo does not upload your files. Use only content you own or have permission to share.</p></aside>',
  '  </section>',
  '  <section id="features" class="feature-grid">',
  '    <div class="feature"><span class="feature-icon">◈</span><h3>Adaptive quality</h3><p>Auto ABR plus manual rendition selection; 4K supported when available in the HLS manifest.</p></div>',
  '    <div class="feature"><span class="feature-icon">◉</span><h3>Audio & subtitles</h3><p>Switch between available HLS audio tracks and subtitle languages without restarting playback.</p></div>',
  '    <div class="feature"><span class="feature-icon">⏱</span><h3>Continue watching</h3><p>Save a unique video position in localStorage and resume in the same browser.</p></div>',
  '    <div class="feature"><span class="feature-icon">⊞</span><h3>Viewing modes</h3><p>Fit, fill/crop, stretch, aspect ratios, PiP, fullscreen, theater and floating mini player.</p></div>',
  '    <div class="feature"><span class="feature-icon">↶</span><h3>Precise controls</h3><p>Seek forward or rewind ten seconds, keyboard shortcuts, variable speed and volume.</p></div>',
  '    <div class="feature"><span class="feature-icon">◇</span><h3>Watermark switch</h3><p>Enable or disable a configurable visual watermark without editing the video.</p></div>',
  '    <div class="feature"><span class="feature-icon">⚡</span><h3>Network recovery</h3><p>Bounded HLS network retries and media recovery with a helpful error message.</p></div>',
  '    <div class="feature"><span class="feature-icon">⌘</span><h3>Developer-first</h3><p>Typed API, buildable ESM/UMD library, unit tests, MIT license and CI workflow.</p></div>',
  '  </section>',
  '  <footer><span>SecureStream Player · Made for developers by Rijon</span>',
  '    <span>HLS demo: Big Buck Bunny (Blender Foundation, CC BY 3.0); MP4 demo: MDN CC0 Flower.</span></footer>',
  '</div>',
].join('\n');

const videoContainer = document.getElementById('securestream-demo') as HTMLElement;
const selector = document.getElementById('demo-source') as HTMLSelectElement;
const input = document.getElementById('custom-url') as HTMLInputElement;
const load = document.getElementById('load-source') as HTMLButtonElement;
let player: SecureStreamPlayer | undefined;

function startDemo(): void {
  player?.destroy();
  const custom = input.value.trim();
  const source = custom || (selector.value === 'hls' ? HLS_DEMO : MP4_DEMO);
  player = new SecureStreamPlayer({
    container: videoContainer,
    id: 'demo:' + source,
    src: source,
    title: 'SecureStream interactive demo',
    watermark: { text: 'SecureStream · DEMO', enabled: true },
  });
}

load.addEventListener('click', startDemo);
selector.addEventListener('change', () => { input.value = ''; startDemo(); });
startDemo();
