import { SecureStreamPlayer } from './player';
import './demo.css';

const HLS_DEMO = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const MP4_DEMO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const mount = document.querySelector<HTMLDivElement>('#app');
if (!mount) throw new Error('Demo mount not found');

mount.innerHTML = [
  '<header class="site-nav"><div class="wrap nav-inner">',
  '  <a class="wordmark" href="./" aria-label="SecureStream home"><span class="wordmark-glyph">▶</span>SECURE<span>STREAM</span><b>.</b></a>',
  '  <div class="nav-right"><span class="nav-version">VERSION 0.1.0 / OPEN SOURCE</span>',
  '  <a class="nav-github" href="https://github.com/rijonrrb/SecureStream-Player" target="_blank" rel="noopener noreferrer">GITHUB <span>↗</span></a></div>',
  '</div></header>',
  '<main class="wrap">',
  '  <section class="intro">',
  '    <div class="intro-left"><div class="section-index"><span>01 / INTRODUCTION</span><span class="rule"></span></div>',
  '      <h1>VIDEO.<br><em>WITHOUT THE</em><br>CLUTTER<span class="punctuation">.</span></h1>',
  '    </div>',
  '    <div class="intro-right"><span class="intro-kicker">THE PLAYER, REIMAGINED.</span>',
  '      <p>An open-source video player with adaptive HLS streaming, multilingual audio and thoughtfully considered controls.</p>',
  '      <div class="intro-meta"><span>TYPE SCRIPT</span><span>HLS.JS</span><span>FRAMEWORK AGNOSTIC</span></div>',
  '    </div>',
  '  </section>',
  '  <section class="playground" id="demo">',
  '    <div class="section-index"><span>02 / LIVE DEMO</span><span class="rule"></span><span class="section-tag">INTERACTIVE</span></div>',
  '    <div class="demo-heading"><h2>THE PLAYBACK EXPERIENCE</h2><p>Everything you need. Nothing in the way.</p></div>',
  '    <div class="demo-layout">',
  '      <div class="player-column"><div class="player-frame"><div id="securestream-demo"></div></div>',
  '        <div class="player-caption"><span class="live-indicator"></span><span>LIVE PLAYER PREVIEW</span><span class="caption-divider">/</span><span>HLS + HTML5</span>',
  '          <span class="caption-note">Click the three-dot menu inside the player for advanced settings.</span></div>',
  '      </div>',
  '      <aside class="source-panel">',
  '        <div class="source-topline"><span>PLAYGROUND</span><span>001</span></div>',
  '        <h3>TRY IT YOURSELF.</h3>',
  '        <p>Load a sample or connect your own compatible media URL.</p>',
  '        <label for="demo-source">01 — SAMPLE SOURCE</label>',
  '        <select id="demo-source"><option value="hls">Big Buck Bunny / Adaptive HLS</option><option value="mp4">Flower / Standard MP4</option></select>',
  '        <label for="custom-url">02 — CUSTOM STREAM URL</label>',
  '        <input id="custom-url" type="url" placeholder="https://example.com/master.m3u8" autocomplete="off" />',
  '        <button id="load-source" type="button">LOAD VIDEO <span>↗</span></button>',
  '        <p class="source-note">Use a CORS-enabled MP4 or HLS master playlist. Available quality, subtitles and audio tracks are determined by the media source.</p>',
  '      </aside>',
  '    </div>',
  '  </section>',
  '  <section class="features" id="features">',
  '    <div class="section-index"><span>03 / FEATURES</span><span class="rule"></span><span class="section-tag">BUILT FOR THE WEB</span></div>',
  '    <div class="features-heading"><h2>THE ESSENTIALS.<br><span>DONE RIGHT.</span></h2><p>Professional playback controls, quietly integrated into your product.</p></div>',
  '    <div class="feature-grid">',
  '      <article class="feature"><span class="feature-number">01.</span><h3>ADAPTIVE STREAMING</h3><p>Auto bitrate adaptation with manual quality selection up to 4K when offered by the source.</p></article>',
  '      <article class="feature"><span class="feature-number">02.</span><h3>AUDIO & SUBTITLES</h3><p>Select available audio languages and subtitle tracks independently from one discreet menu.</p></article>',
  '      <article class="feature"><span class="feature-number">03.</span><h3>VIEW YOUR WAY</h3><p>Fit, fill, stretch and crop modes change the picture — never the player dimensions.</p></article>',
  '      <article class="feature"><span class="feature-number">04.</span><h3>CONTINUE WATCHING</h3><p>Remember playback position locally and pick up from where you stopped in the same browser.</p></article>',
  '      <article class="feature"><span class="feature-number">05.</span><h3>FLEXIBLE CONTROLS</h3><p>Ten-second skipping, playback speed, time remaining, fullscreen, PiP and mini player.</p></article>',
  '      <article class="feature"><span class="feature-number">06.</span><h3>OPTIONAL WATERMARK</h3><p>Enable or disable a lightweight overlay. Designed for identification, not DRM.</p></article>',
  '    </div>',
  '  </section>',
  '  <section class="install" id="install"><div><span class="eyebrow">04 / GET STARTED</span><h2>READY TO INTEGRATE?</h2><p>Framework independent. MIT licensed. Install directly from GitHub.</p></div>',
  '    <div class="install-command"><code>npm install github:rijonrrb/SecureStream-Player</code><button id="copy-install" type="button" aria-label="Copy installation command">COPY</button></div></section>',
  '</main>',
  '<footer class="footer"><div class="wrap footer-inner"><div>© 2026 <strong>SECURESTREAM.</strong> MADE BY RIJON.</div>',
  ' <div>DEMO STREAMS: <a href="https://peach.blender.org/" target="_blank" rel="noopener">BIG BUCK BUNNY</a> (CC BY 3.0) · <a href="https://developer.mozilla.org/" target="_blank" rel="noopener">MDN FLOWER</a> (CC0)</div></div></footer>',
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
    title: selector.value === 'hls' ? 'Big Buck Bunny · Sample Film' : 'Flower · Sample Clip',
    watermark: { text: 'SECURESTREAM / DEMO', enabled: false },
  });
}
load.addEventListener('click', startDemo);
selector.addEventListener('change', () => { input.value = ''; startDemo(); });
document.getElementById('copy-install')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('npm install github:rijonrrb/SecureStream-Player');
    const button = document.getElementById('copy-install');
    if (button) button.textContent = 'COPIED';
  } catch {
    const button = document.getElementById('copy-install');
    if (button) button.textContent = 'SELECT TEXT';
  }
});
startDemo();
