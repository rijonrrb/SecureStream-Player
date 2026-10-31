import Hls from 'hls.js';
import './style.css';
import './display.css';

export type StreamSubtitle = { label: string; language: string; src: string };
export type DisplayMode = 'fit' | 'fill' | 'stretch' | 'ratio-16-9' | 'ratio-4-3' | 'ratio-21-9';
export type ThumbnailSprite = { src: string; interval: number; columns: number; rows: number; width: number; height: number };
export type PlayerOptions = {
  container: HTMLElement;
  id: string;
  src: string;
  title?: string;
  poster?: string;
  watermark?: { text: string; enabled?: boolean };
  subtitles?: StreamSubtitle[];
  thumbnails?: ThumbnailSprite;
  autoPlay?: boolean;
  muted?: boolean;
};

type PlaybackPreferences = { speed: number; volume: number; muted: boolean };

const PROGRESS_PREFIX = 'securestream:progress:';
const PREFERENCES_KEY = 'securestream:preferences:v1';
const RETRIES = 3;

export class SecureStreamPlayer {
  private readonly options: PlayerOptions;
  private readonly root: HTMLElement;
  private readonly video: HTMLVideoElement;
  private readonly quality: HTMLSelectElement;
  private readonly audio: HTMLSelectElement;
  private readonly captions: HTMLSelectElement;
  private readonly speed: HTMLSelectElement;
  private readonly displayMode: HTMLSelectElement;
  private readonly seek: HTMLInputElement;
  private readonly volume: HTMLInputElement;
  private readonly notice: HTMLElement;
  private readonly watermark: HTMLElement;
  private readonly preview: HTMLElement;
  private readonly progressTime: HTMLElement;
  private readonly playButton: HTMLButtonElement;
  private readonly muteButton: HTMLButtonElement;
  private hls?: Hls;
  private networkRetries = 0;
  private mediaRetries = 0;
  private lastSavedSecond = -1;
  private restored = false;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const element = event.target as HTMLElement;
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(element.tagName)) return;
    const action: Record<string, () => void> = {
      ' ': () => this.togglePlay(),
      k: () => this.togglePlay(),
      ArrowLeft: () => this.skip(-10),
      ArrowRight: () => this.skip(10),
      f: () => void this.toggleFullscreen(),
      m: () => this.toggleMute(),
      p: () => void this.togglePictureInPicture(),
    };
    const callback = action[event.key];
    if (callback) {
      event.preventDefault();
      callback();
    }
  };

  constructor(options: PlayerOptions) {
    if (!options.container || !options.src || !options.id) {
      throw new Error('SecureStream requires container, src and id.');
    }
    this.options = options;
    this.root = document.createElement('section');
    this.root.className = 'ssp-player';
    this.root.tabIndex = 0;
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', options.title ? 'Video player: ' + options.title : 'Video player');
    this.root.innerHTML = [
      '<div class="ssp-stage">',
      '  <video class="ssp-video" playsinline preload="metadata" crossorigin="anonymous"></video>',
      '  <div class="ssp-watermark" aria-hidden="true"></div>',
      '  <div class="ssp-notice" role="status" aria-live="polite"></div>',
      '  <div class="ssp-preview" aria-hidden="true"></div>',
      '  <button class="ssp-center-play" data-action="play" aria-label="Play or pause video">▶</button>',
      '</div>',
      '<div class="ssp-controls">',
      '  <div class="ssp-progress-line">',
      '    <input data-role="seek" type="range" value="0" min="0" max="1000" step="1" aria-label="Seek video position" />',
      '  </div>',
      '  <div class="ssp-buttons">',
      '    <button data-action="play" aria-label="Play or pause">▶</button>',
      '    <button data-action="back" title="Rewind 10 seconds" aria-label="Rewind 10 seconds">↶10</button>',
      '    <button data-action="forward" title="Forward 10 seconds" aria-label="Forward 10 seconds">10↷</button>',
      '    <div class="ssp-time" data-role="time">0:00 / 0:00</div>',
      '    <button data-action="mute" aria-label="Mute or unmute">🔊</button>',
      '    <input data-role="volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" />',
      '    <span class="ssp-spacer"></span>',
      '    <label>Quality<select data-role="quality" aria-label="Video quality"><option value="auto">Auto</option></select></label>',
      '    <label>Audio<select data-role="audio" aria-label="Audio language"><option value="-1">Default</option></select></label>',
      '    <label>CC<select data-role="captions" aria-label="Subtitles"><option value="off">Off</option></select></label>',
      '    <label>View<select data-role="display" aria-label="Video fit and aspect ratio">',
      '      <option value="fit">Fit</option><option value="fill">Fill / Crop</option>',
      '      <option value="stretch">Stretch</option><option value="ratio-16-9">16:9</option>',
      '      <option value="ratio-4-3">4:3</option><option value="ratio-21-9">21:9</option>',
      '    </select></label>',
      '    <label>Speed<select data-role="speed" aria-label="Playback speed">',
      '      <option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1">1×</option>',
      '      <option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option>',
      '    </select></label>',
      '    <button data-action="watermark" aria-label="Toggle watermark" title="Toggle watermark">WM</button>',
      '    <button data-action="theater" aria-label="Theater mode" title="Theater mode">▣</button>',
      '    <button data-action="pip" aria-label="Picture in picture" title="Picture in picture">▣↗</button>',
      '    <button data-action="mini" aria-label="Mini player" title="Mini player">▢</button>',
      '    <button data-action="fullscreen" aria-label="Fullscreen" title="Fullscreen">⛶</button>',
      '  </div>',
      '</div>',
    ].join('\n');
    options.container.replaceChildren(this.root);
    const get = <T extends HTMLElement>(selector: string): T => {
      const el = this.root.querySelector<T>(selector);
      if (!el) throw new Error('SecureStream missing element: ' + selector);
      return el;
    };
    this.video = get<HTMLVideoElement>('video');
    this.quality = get<HTMLSelectElement>('[data-role="quality"]');
    this.audio = get<HTMLSelectElement>('[data-role="audio"]');
    this.captions = get<HTMLSelectElement>('[data-role="captions"]');
    this.speed = get<HTMLSelectElement>('[data-role="speed"]');
    this.displayMode = get<HTMLSelectElement>('[data-role="display"]');
    this.seek = get<HTMLInputElement>('[data-role="seek"]');
    this.volume = get<HTMLInputElement>('[data-role="volume"]');
    this.notice = get<HTMLElement>('.ssp-notice');
    this.watermark = get<HTMLElement>('.ssp-watermark');
    this.preview = get<HTMLElement>('.ssp-preview');
    this.progressTime = get<HTMLElement>('[data-role="time"]');
    this.playButton = get<HTMLButtonElement>('.ssp-buttons [data-action="play"]');
    this.muteButton = get<HTMLButtonElement>('[data-action="mute"]');

    this.video.controls = false;
    this.video.muted = Boolean(options.muted);
    if (options.poster) this.video.poster = options.poster;
    if (options.watermark?.text) {
      this.watermark.textContent = options.watermark.text;
      this.watermark.hidden = options.watermark.enabled === false;
    } else {
      this.watermark.hidden = true;
    }
    const preferences = this.readPreferences();
    if (preferences) {
      this.video.playbackRate = preferences.speed;
      this.video.volume = preferences.volume;
      this.video.muted = preferences.muted;
    }
    this.speed.value = String(this.video.playbackRate);
    this.volume.value = String(this.video.volume);
    this.updateMuteLabel();
    this.attachEvents();
    this.mountExternalSubtitles();
    this.loadSource();
  }

  private attachEvents(): void {
    this.root.addEventListener('keydown', this.onKeyDown);
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => {
      button.addEventListener('click', () => this.handleAction(button.dataset.action || ''));
    });
    this.video.addEventListener('click', () => this.togglePlay());
    this.video.addEventListener('play', () => this.updatePlayLabel());
    this.video.addEventListener('pause', () => this.updatePlayLabel());
    this.video.addEventListener('loadedmetadata', () => {
      this.restorePosition();
      this.refreshCaptions();
      this.updateProgress();
    });
    this.video.addEventListener('timeupdate', () => {
      this.updateProgress();
      this.persistProgress();
    });
    this.video.addEventListener('ended', () => this.removeProgress());
    this.video.addEventListener('error', () => this.showNotice('Playback error. Check the video URL and browser codec support.'));
    this.video.addEventListener('volumechange', () => this.updateMuteLabel());
    this.seek.addEventListener('input', () => this.updatePreview());
    this.seek.addEventListener('change', () => {
      const duration = this.video.duration;
      if (Number.isFinite(duration) && duration > 0) {
        this.video.currentTime = Number(this.seek.value) / 1000 * duration;
      }
      this.preview.classList.remove('ssp-visible');
    });
    this.volume.addEventListener('input', () => {
      this.video.volume = Number(this.volume.value);
      this.video.muted = this.video.volume === 0;
      this.savePreferences();
    });
    this.speed.addEventListener('change', () => {
      this.video.playbackRate = Number(this.speed.value);
      this.savePreferences();
    });
    this.displayMode.addEventListener('change', () => this.setDisplayMode(this.displayMode.value as DisplayMode));
    this.quality.addEventListener('change', () => {
      if (!this.hls) return;
      this.hls.currentLevel = this.quality.value === 'auto' ? -1 : Number(this.quality.value);
      this.showNotice(this.quality.selectedOptions[0]?.textContent || 'Quality updated');
    });
    this.audio.addEventListener('change', () => {
      if (!this.hls || this.audio.value === '-1') return;
      this.hls.audioTrack = Number(this.audio.value);
      this.showNotice('Audio: ' + (this.audio.selectedOptions[0]?.textContent || 'Selected'));
    });
    this.captions.addEventListener('change', () => this.changeCaptions());
  }

  private handleAction(action: string): void {
    switch (action) {
      case 'play': this.togglePlay(); break;
      case 'back': this.skip(-10); break;
      case 'forward': this.skip(10); break;
      case 'mute': this.toggleMute(); break;
      case 'watermark': this.setWatermark(this.watermark.hidden); break;
      case 'theater': this.root.classList.toggle('ssp-theater'); break;
      case 'mini': this.root.classList.toggle('ssp-mini'); break;
      case 'pip': void this.togglePictureInPicture(); break;
      case 'fullscreen': void this.toggleFullscreen(); break;
    }
  }

  private loadSource(): void {
    const isHls = /\.m3u8($|\?)/i.test(this.options.src);
    if (isHls && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        capLevelToPlayerSize: true,
      });
      this.hls.on(Hls.Events.MEDIA_ATTACHED, () => this.hls?.loadSource(this.options.src));
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.updateLevels();
        this.refreshAudio();
        this.refreshCaptions();
        if (this.options.autoPlay) void this.tryPlay();
      });
      this.hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => this.refreshAudio());
      this.hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => this.refreshCaptions());
      this.hls.on(Hls.Events.LEVEL_SWITCHED, () => {
        if (this.hls?.autoLevelEnabled) this.showNotice('Auto quality');
      });
      this.hls.on(Hls.Events.FRAG_LOADED, () => {
        this.networkRetries = 0;
        this.mediaRetries = 0;
      });
      this.hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && this.networkRetries++ < RETRIES) {
          this.showNotice('Connection interrupted; retrying stream…');
          this.hls?.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && this.mediaRetries++ < 2) {
          this.showNotice('Recovering video decoder…');
          this.hls?.recoverMediaError();
        } else {
          this.showNotice('Stream unavailable. Try reloading or another source.');
          this.hls?.stopLoad();
        }
      });
      this.hls.attachMedia(this.video);
    } else {
      this.video.src = this.options.src;
      if (this.options.autoPlay) {
        this.video.addEventListener('loadedmetadata', () => { void this.tryPlay(); }, { once: true });
      }
      if (isHls && !this.video.canPlayType('application/vnd.apple.mpegurl')) {
        this.showNotice('This browser cannot play HLS. Please try another browser.');
      }
    }
  }

  private updateLevels(): void {
    if (!this.hls) return;
    this.quality.replaceChildren(new Option('Auto', 'auto'));
    const qualityLevels = this.hls.levels.map((level, index) => ({ level, index }));
    qualityLevels.sort((a, b) => b.level.height - a.level.height);
    for (const item of qualityLevels) {
      const label = item.level.height >= 2160 ? '4K (' + item.level.height + 'p)' :
        item.level.height ? item.level.height + 'p' : Math.round(item.level.bitrate / 1000) + ' kbps';
      this.quality.add(new Option(label, String(item.index)));
    }
    this.quality.value = 'auto';
    this.quality.disabled = this.hls.levels.length < 2;
  }

  private refreshAudio(): void {
    if (!this.hls) return;
    const previous = this.audio.value;
    this.audio.replaceChildren(new Option('Default', '-1'));
    this.hls.audioTracks.forEach((track, index) => {
      this.audio.add(new Option(track.name || track.lang || 'Track ' + (index + 1), String(index)));
    });
    this.audio.disabled = this.hls.audioTracks.length < 2;
    this.audio.value = this.hls.audioTracks.some((_, index) => String(index) === previous)
      ? previous : String(this.hls.audioTrack);
    if (this.audio.selectedIndex < 0) this.audio.value = '-1';
  }

  private mountExternalSubtitles(): void {
    for (const track of this.options.subtitles || []) {
      const element = document.createElement('track');
      element.kind = 'subtitles';
      element.label = track.label;
      element.srclang = track.language;
      element.src = track.src;
      this.video.append(element);
    }
  }

  private refreshCaptions(): void {
    const previous = this.captions.value;
    this.captions.replaceChildren(new Option('Off', 'off'));
    this.hls?.subtitleTracks.forEach((track, index) => {
      this.captions.add(new Option(track.name || track.lang || 'Subtitle ' + (index + 1), 'hls:' + index));
    });
    for (let i = 0; i < this.video.textTracks.length; i++) {
      const track = this.video.textTracks[i];
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        this.captions.add(new Option(track.label || track.language || 'Captions', 'native:' + i));
      }
    }
    this.captions.value = [...this.captions.options].some(o => o.value === previous) ? previous : 'off';
    this.captions.disabled = this.captions.options.length < 2;
  }

  private changeCaptions(): void {
    const selected = this.captions.value;
    if (this.hls) {
      this.hls.subtitleDisplay = selected.startsWith('hls:');
      this.hls.subtitleTrack = selected.startsWith('hls:') ? Number(selected.split(':')[1]) : -1;
    }
    for (let i = 0; i < this.video.textTracks.length; i++) {
      this.video.textTracks[i].mode = selected === 'native:' + i ? 'showing' : 'disabled';
    }
    this.showNotice('Subtitles: ' + (this.captions.selectedOptions[0]?.textContent || 'Off'));
  }

  private formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = String(total % 60).padStart(2, '0');
    return hours > 0 ? hours + ':' + String(mins).padStart(2, '0') + ':' + secs : mins + ':' + secs;
  }

  private updateProgress(): void {
    const duration = this.video.duration;
    const current = this.video.currentTime;
    if (Number.isFinite(duration) && duration > 0) {
      this.seek.value = String(Math.min(1000, Math.max(0, Math.round(current / duration * 1000))));
    }
    this.progressTime.textContent = this.formatTime(current) + ' / ' + this.formatTime(duration);
  }

  private updatePreview(): void {
    const duration = this.video.duration;
    if (!Number.isFinite(duration) || !duration) return;
    const seconds = Number(this.seek.value) / 1000 * duration;
    this.preview.textContent = this.formatTime(seconds);
    const sprite = this.options.thumbnails;
    if (sprite) {
      const frame = Math.floor(seconds / sprite.interval);
      const column = frame % sprite.columns;
      const row = Math.min(sprite.rows - 1, Math.floor(frame / sprite.columns));
      this.preview.style.backgroundImage = 'url("' + sprite.src.replace(/"/g, '%22') + '")';
      this.preview.style.backgroundPosition = '-' + (column * sprite.width) + 'px -' + (row * sprite.height) + 'px';
      this.preview.style.backgroundSize = (sprite.columns * sprite.width) + 'px ' + (sprite.rows * sprite.height) + 'px';
      this.preview.style.width = sprite.width + 'px';
      this.preview.style.height = sprite.height + 'px';
    }
    this.preview.classList.add('ssp-visible');
  }

  private storageGet(key: string): string | null {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  private storageSet(key: string, value: string): void {
    try { window.localStorage.setItem(key, value); } catch { /* disabled storage */ }
  }
  private removeProgress(): void {
    try { window.localStorage.removeItem(PROGRESS_PREFIX + this.options.id); } catch { /* disabled */ }
  }
  private restorePosition(): void {
    if (this.restored) return;
    this.restored = true;
    const saved = Number(this.storageGet(PROGRESS_PREFIX + this.options.id));
    if (saved > 0 && Number.isFinite(this.video.duration) && saved < this.video.duration - 15) {
      this.video.currentTime = saved;
      this.showNotice('Resumed at ' + this.formatTime(saved));
    }
  }
  private persistProgress(): void {
    const seconds = Math.floor(this.video.currentTime);
    if (!Number.isFinite(seconds) || seconds === this.lastSavedSecond || seconds % 5 !== 0) return;
    if (!Number.isFinite(this.video.duration) || this.video.duration - seconds < 15) return;
    this.lastSavedSecond = seconds;
    this.storageSet(PROGRESS_PREFIX + this.options.id, String(seconds));
  }
  private readPreferences(): PlaybackPreferences | null {
    try {
      const raw = this.storageGet(PREFERENCES_KEY);
      if (!raw) return null;
      const data: Partial<PlaybackPreferences> = JSON.parse(raw);
      if (typeof data.speed !== 'number' || typeof data.volume !== 'number' || typeof data.muted !== 'boolean') return null;
      return { speed: data.speed, volume: Math.max(0, Math.min(1, data.volume)), muted: data.muted };
    } catch { return null; }
  }
  private savePreferences(): void {
    this.storageSet(PREFERENCES_KEY, JSON.stringify({
      speed: this.video.playbackRate, volume: this.video.volume, muted: this.video.muted,
    }));
  }
  private updateMuteLabel(): void {
    this.muteButton.textContent = this.video.muted || this.video.volume === 0 ? '🔇' : '🔊';
  }
  private updatePlayLabel(): void {
    const playing = !this.video.paused;
    this.playButton.textContent = playing ? 'Ⅱ' : '▶';
    const center = this.root.querySelector<HTMLButtonElement>('.ssp-center-play');
    if (center) center.hidden = playing;
  }
  private showNotice(message: string): void {
    this.notice.textContent = message;
  }
  private async tryPlay(): Promise<void> {
    try { await this.video.play(); } catch { this.showNotice('Press play to start playback.'); }
  }

  public setDisplayMode(mode: DisplayMode): void {
    const valid: DisplayMode[] = ['fit','fill','stretch','ratio-16-9','ratio-4-3','ratio-21-9'];
    if (!valid.includes(mode)) throw new Error('Unknown video display mode: ' + mode);
    this.root.dataset.display = mode;
    this.displayMode.value = mode;
    this.showNotice('View: ' + this.displayMode.selectedOptions[0]?.textContent);
  }
  public togglePlay(): void {
    if (this.video.paused) void this.tryPlay();
    else this.video.pause();
  }
  public skip(seconds: number): void {
    const max = Number.isFinite(this.video.duration) ? this.video.duration : Number.MAX_SAFE_INTEGER;
    this.video.currentTime = Math.max(0, Math.min(max, this.video.currentTime + seconds));
  }
  public toggleMute(): void {
    this.video.muted = !this.video.muted;
    this.savePreferences();
    this.updateMuteLabel();
  }
  public setWatermark(enabled: boolean): void {
    if (!this.options.watermark?.text) return;
    this.watermark.hidden = !enabled;
    this.showNotice(enabled ? 'Watermark enabled' : 'Watermark disabled');
  }
  public async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement === this.root) await document.exitFullscreen();
    else if (this.root.requestFullscreen) await this.root.requestFullscreen();
  }
  public async togglePictureInPicture(): Promise<void> {
    try {
      if (document.pictureInPictureElement === this.video) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled && this.video.requestPictureInPicture) {
        await this.video.requestPictureInPicture();
      } else this.showNotice('Picture-in-Picture is not supported by this browser.');
    } catch { this.showNotice('Picture-in-Picture could not start.'); }
  }
  public destroy(): void {
    if (Number.isFinite(this.video.currentTime) && this.video.currentTime > 0 && Number.isFinite(this.video.duration) && this.video.duration - this.video.currentTime >= 15) {
      this.storageSet(PROGRESS_PREFIX + this.options.id, String(Math.floor(this.video.currentTime)));
    }
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.hls?.destroy();
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.root.remove();
  }
}

export default SecureStreamPlayer;
